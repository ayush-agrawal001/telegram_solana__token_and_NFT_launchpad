import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { conn } from "../../index.js";
import { createGenericFile, generateSigner, keypairIdentity, percentAmount } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import * as path from "path";
import { promises as fs, link } from "fs";
import { getExplorerLink } from "@solana-developers/helpers";
import { metadataImageUrl } from "../imageUpload/imageUpload.js";
import metaDataJsonUrl from "../imageUpload/metadataJsonUpload.js";
import { ExtensionType, getMintLen } from "@solana/spl-token";
import { clusterApiUrl, Keypair } from "@solana/web3.js";
import userModel from "../../db/dbSchema.js";
import { convertToKeypair } from "../wallet.js";

// const collectionImagePath = path.resolve(__dirname, "collection.png");

export interface NFTInfo {
    tokenName : string,
    symbol : string,
    description : string,
    imgUrl : any,
    collectibleId? : string
    traits? : string;
}

export default async function createNFTCollection(nftInfo : NFTInfo, userName : string){
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

        const umi = createUmi(clusterApiUrl("devnet")); // To initialize umi.
        const umiKeyPair = umi.eddsa.createKeypairFromSecretKey(wallet.userKeypair.secretKey);
        
        umi
            .use(keypairIdentity(umiKeyPair)) // A middleware to assign a signer for the every payment
            .use(mplTokenMetadata()) // to load the MPL metadata program
            .use(irysUploader()); // Irys uploader plugins
        const mintLength = getMintLen([ExtensionType.MetadataPointer]);
        const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);

        async function jsonUrl() {
            const data : NFTInfo = {
                tokenName : nftInfo.tokenName,
                symbol : nftInfo.symbol,
                description : nftInfo.description,
                imgUrl : nftInfo.imgUrl,
            }

            const result = await metaDataJsonUrl(data);
            return await result.cloud.url
        }

        const uri = await jsonUrl();

        const collectionMint = generateSigner(umi);
        await createNft(umi, {
            mint : collectionMint,
            name : nftInfo.tokenName,
            uri,
            updateAuthority : umi.identity.publicKey,
            sellerFeeBasisPoints : percentAmount(1),
            isCollection : true,
        }).sendAndConfirm(umi, { send : { commitment : "finalized" }})

        let link = getExplorerLink(
            "address",
            collectionMint.publicKey,
            "devnet"
        )

        // console.log(`Collection NFT:  ${link}`);
        // console.log(`Collection NFT address is:`, collectionMint.publicKey);
        // console.log("✅ Finished successfully!");

        return {link , minimumRequired}

    } catch (error) {
        console.error("Error in createNFTCollection:", error);
        if (error instanceof Error && error.message === "User not found") {
            throw new Error("User not found");
        }
        throw new Error("Failed to create NFT collection");
    }
};