import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { conn } from "../..";
import { createGenericFile, generateSigner, keypairIdentity, percentAmount } from "@metaplex-foundation/umi";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import * as path from "path";
import { promises as fs, link } from "fs";
import { getExplorerLink } from "@solana-developers/helpers";
import { config } from "dotenv";
import { metadataImageUrl } from "../imageUpload/imageUpload";
import metaDataJsonUrl from "../imageUpload/metadataJsonUpload";
import { ExtensionType, getMintLen } from "@solana/spl-token";
import { clusterApiUrl, Keypair } from "@solana/web3.js";

config();
const umi = createUmi(clusterApiUrl("devnet")); // To initialize umi.
const devUserKeypair = Keypair.fromSecretKey(new Uint8Array());
const umiKeyPair = umi.eddsa.createKeypairFromSecretKey(devUserKeypair.secretKey);

umi
    .use(keypairIdentity(umiKeyPair)) // A middleware to assign a signer for the every payment
    .use(mplTokenMetadata()) // to load the MPL metadata program
    .use(irysUploader()); // Irys uploader plugins

// const collectionImagePath = path.resolve(__dirname, "collection.png");

export interface NFTInfo {
    tokenName : string,
    symbol : string,
    description : string,
    imgUrl : any,
}

export default async function createNFTCollection(nftInfo : NFTInfo){
    
    const mintLength = getMintLen([ExtensionType.MetadataPointer]);
    const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);

    // const buffer = await fs.readFile(collectionImagePath);

    // async function imageUrl() {
    //     let file = createGenericFile(buffer, collectionImagePath, {
    //         contentType : "image/png",
    //     });
    //     // console.log(file.buffer);
    //     const result = await metadataImageUrl(file.buffer);
        
    //     return await result.tx.gatewayUrls
    // }

    // const imageUri = await imageUrl();

    // console.log(imageUri[0]);

    async function jsonUrl() {
        
        const data : NFTInfo = {
            tokenName : nftInfo.tokenName || "",
            symbol : nftInfo.symbol || "",
            description : nftInfo.description || "",
            imgUrl : nftInfo.imgUrl || "",
        }

        const result = await metaDataJsonUrl(data);
        // console.log(await result)
        return await result.cloud.url
    }

    const uri = await jsonUrl();

    const collectionMint = generateSigner(umi);
    await createNft(umi, {
        mint : collectionMint,
        name : "ayush collection",
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

    console.log(`Collection NFT:  ${link}`);
    console.log(`Collection NFT address is:`, collectionMint.publicKey);
    console.log("✅ Finished successfully!");

    return {link , minimumRequired}

};