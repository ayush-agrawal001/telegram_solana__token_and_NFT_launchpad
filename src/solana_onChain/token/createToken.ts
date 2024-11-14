import { getExplorerLink } from "@solana-developers/helpers";
import { createMint, ExtensionType, getMint, getMintLen, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { clusterApiUrl, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createMetadataAccountV3, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { TokenInfo } from "./getMetadataFromUser.js";
import metaDataJsonUrl from "../imageUpload/metadataJsonUpload.js";
import { config } from "dotenv";
import { conn } from "../../index.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNoopSigner } from "@metaplex-foundation/umi";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { toWeb3JsInstruction } from "@metaplex-foundation/umi-web3js-adapters";
import userModel from "../../db/dbSchema.js";
import wallet, { convertToKeypair } from "../wallet.js";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

const umi = createUmi(clusterApiUrl("devnet")).use(mplTokenMetadata());

let tokenMint : PublicKey;

export async function creatingTokenMint(tokenMetadata : TokenInfo, userName : string){

    const user = await userModel.findOne({userName : userName})
    const mnemonic = user?.walletMnemonic;
    const userWallet = await convertToKeypair(mnemonic!);

    const result = await metaDataJsonUrl(tokenMetadata);
    const metURL = await result.cloud.url;

    const metaData = {
        name : tokenMetadata.tokenName,
        symbol : tokenMetadata.symbol,
        uri : metURL,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    }

    const mintLength = getMintLen([ExtensionType.MetadataPointer]);
    const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);
    tokenMint = await createMint(conn, userWallet.userKeypair!, new PublicKey(userWallet.userPubkey), null , tokenMetadata.decimals); //Created Mint account
    
    const metdataPDAAndBump = PublicKey.findProgramAddressSync([//Making a PDA
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.toBuffer(),
    ], TOKEN_METADATA_PROGRAM_ID);

    const metaDataPDA = metdataPDAAndBump[0]; //This will give us a PDA

    const transaction = new Transaction();

    const metadataAccountInstruction = createMetadataAccountV3(umi,
        {
            mint : umiPublicKey(tokenMint),
            mintAuthority : createNoopSigner(umiPublicKey(userWallet.userKeypair.publicKey)),
            metadata: umiPublicKey(metaDataPDA),
            isMutable : true,
            payer : createNoopSigner(umiPublicKey(userWallet.userKeypair.publicKey)),
            updateAuthority : umiPublicKey(userWallet.userKeypair.publicKey),
            collectionDetails : null,
            data : metaData,
        },
    ).getInstructions();

    const web3jsinstruction = toWeb3JsInstruction(metadataAccountInstruction[0])

    transaction.add(web3jsinstruction); //Metadata and PDA completed

    const transactionSignature = await sendAndConfirmTransaction(
        conn,
        transaction,
        [userWallet.userKeypair]
    )// Created token metdata PDA
    
    const link = getExplorerLink("address", tokenMint.toString(), 'devnet');
    // console.log(link);
    return {link, minimumRequired};
}

export async function mintingToken(decimal : number, mintAmount : number, tokenPublicKey : PublicKey, toUserKeypair? : PublicKey, userName? : string ) {
    
    const user = await userModel.findOne({userName : userName})
    const mnemonic = user?.walletMnemonic;
    const userWallet = await convertToKeypair(mnemonic!);

    const tokenInfo = await getMint(conn, tokenPublicKey);
    // console.log(tokenInfo);

    try{const AtokenAccount = await getOrCreateAssociatedTokenAccount( //Creating ATA on-chain
        conn,
        userWallet.userKeypair, // Signer
        tokenPublicKey, // to which token this associates with
        toUserKeypair || new PublicKey(userWallet.userPubkey) // owner of ATA
    )
        
    const tokenInSmallestUnit = Math.pow(10, tokenInfo.decimals);
    const mintTransactionSignature = await mintTo(
        conn,
        userWallet.userKeypair,
        tokenPublicKey,
        AtokenAccount.address,
        new PublicKey(userWallet.userPubkey),
        mintAmount * tokenInSmallestUnit,
    )
    return true;
    }catch(error){
        // console.log(error);
        return false;
    }
}