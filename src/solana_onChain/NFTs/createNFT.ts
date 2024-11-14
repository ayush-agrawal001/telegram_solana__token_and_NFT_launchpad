import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createGenericFile, generateSigner, keypairIdentity, percentAmount, publicKey as umiPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as path from "path";
import { promises as fs } from "fs";
import { airdropIfRequired, getExplorerLink } from "@solana-developers/helpers";
import axios from "axios";
import {config} from "dotenv"
import { metadataImageUrl } from "../imageUpload/imageUpload.js";
import { NFTInfo } from "./createNFTCollection.js";
import metaDataJsonUrl from "../imageUpload/metadataJsonUpload.js";
import { ExtensionType, getMintLen } from "@solana/spl-token";
import userModel from "../../db/dbSchema.js";
import { convertToKeypair } from "../wallet.js";

config(); 


export default async function createRegularNFT(nftInfo : NFTInfo, userName : string){
    try {
        const user = await userModel.findOne({userName : userName});
        if (!user) {
            throw new Error("User not found");
        }

        const mnemonic = user.walletMnemonic;
        if (!mnemonic) {
            throw new Error("No wallet found for user");
        }

        const wallet = await convertToKeypair(mnemonic);

        const conn = new Connection(clusterApiUrl("devnet"));
        
        const umi = createUmi(conn);
        
        const umiKeyPair = umi.eddsa.createKeypairFromSecretKey(wallet.userKeypair.secretKey);
        
        umi
            .use(keypairIdentity(umiKeyPair))
            .use(mplTokenMetadata())
            .use(irysUploader());

        const mintLength = getMintLen([ExtensionType.MetadataPointer]);
        const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);


        async function jsonUrl() {    
            const data : NFTInfo = {
                tokenName : nftInfo.tokenName,
                symbol : nftInfo.symbol,
                description : nftInfo.description,
                imgUrl : nftInfo.imgUrl,
                collectibleId : nftInfo.collectibleId || ""
            }
            const result = await metaDataJsonUrl(data);
            return await result.cloud.url
        }

        const uri = await jsonUrl();
        const mint = generateSigner(umi);
        
        // create and mint NFT
        await createNft(umi, {
            mint,
            name: nftInfo.tokenName,
            symbol: nftInfo.symbol,
            uri,
            updateAuthority: umi.identity.publicKey,
            sellerFeeBasisPoints: percentAmount(1),
            // collection: {
            // key: collectionNftAddress,
            // verified: false,
            // },
        }).sendAndConfirm(umi, { send: { commitment: "finalized" } });
        
        let link = getExplorerLink("address", mint.publicKey, "devnet");
        // console.log(`Token Mint:  ${link}`);

        return {link, minimumRequired}

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "User not found") {
                throw new Error("No user found with the provided username");
            }
            if (error.message === "No wallet found for user") {
                throw new Error("User does not have a wallet configured");
            }
        }
        console.error("Error creating NFT:", error);
        throw new Error("Failed to create NFT. Please try again later.");
    }
};