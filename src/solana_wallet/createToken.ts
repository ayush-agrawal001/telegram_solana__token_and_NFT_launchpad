import { getExplorerLink } from "@solana-developers/helpers";
import { createMint, ExtensionType, getMintLen, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { clusterApiUrl, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createCreateMetadataAccountV3Instruction, dataBeet } from "@metaplex-foundation/mpl-token-metadata"
import { TokenInfo } from "./getMetadataFromUser";
import metaDataJsonUrl from "./metadataJsonUpload";
import { config } from "dotenv";
import { conn, devUserKeypair } from "..";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

let tokenMint : PublicKey;

export async function creatingTokenMint(tokenMetadata : TokenInfo){

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
    tokenMint = await createMint(conn, devUserKeypair!, devUserKeypair!.publicKey, null , tokenMetadata.decimals); //Created Mint account
    
    const metdataPDAAndBump = PublicKey.findProgramAddressSync([//Making a PDA
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.toBuffer(),
    ], TOKEN_METADATA_PROGRAM_ID);

    const metaDataPDA = metdataPDAAndBump[0]; //This will give us a PDA

    const transaction = new Transaction();

    const metadataAccountInstruction = createCreateMetadataAccountV3Instruction(
        {
            metadata: metaDataPDA,
            mint : tokenMint,
            mintAuthority : devUserKeypair.publicKey,
            payer : devUserKeypair.publicKey,
            updateAuthority : devUserKeypair.publicKey
        },
        {
            createMetadataAccountArgsV3 : {
                collectionDetails : null,
                data : metaData,
                isMutable : true
            }
        }
    )
    
    transaction.add(metadataAccountInstruction); //Metadata and PDA completed

    const transactionSignature = await sendAndConfirmTransaction(
        conn,
        transaction,
        [devUserKeypair]
    )// Created token metdata PDA
    
    const link = getExplorerLink("address", tokenMint.toString(), 'devnet');
    console.log(link);
    return {link, minimumRequired};
}
let devTokenMint = new PublicKey("AJa49DzfkEA6JJf4jmhSkLTvsFbmv116wsv7JW9eiVWX");

export async function mintingToken(decimal : number, mintAmount : number, toUserKeypair? : PublicKey) {
    
    try{const AtokenAccount = await getOrCreateAssociatedTokenAccount( //Creating ATA on-chain
        conn,
        devUserKeypair, // Signer
        devTokenMint, // to which token this associates with
        toUserKeypair || devUserKeypair.publicKey // owner of ATA
    )
        
    const tokenInSmallestUnit = Math.pow(10, decimal);
    const mintTransactionSignature = await mintTo(
        conn,
        devUserKeypair,
        devTokenMint,
        AtokenAccount.address,
        devUserKeypair.publicKey,
        mintAmount * tokenInSmallestUnit,
    )
    return true;
    }catch(error){
        console.log(error);
        return false;
    }
}