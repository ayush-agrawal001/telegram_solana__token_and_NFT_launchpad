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
import { metadataImageUrl } from "../imageUpload/imageUpload";
import { NFTInfo } from "./createNFTCollection";
import metaDataJsonUrl from "../imageUpload/metadataJsonUpload";
import { ExtensionType, getMintLen } from "@solana/spl-token";

config(); 

const devUserKeypair = Keypair.fromSecretKey(new Uint8Array([105, 136, 100, 179, 134, 121, 44, 196, 72, 166, 132, 241, 129, 226, 91, 243, 187, 8, 190, 240, 28, 108, 207, 9, 206, 102, 113, 235, 166, 2, 205, 8, 33, 55, 168, 2, 75, 165, 70, 86, 170, 30, 230, 172, 132, 107, 56, 192, 57, 152, 214, 40, 117, 27, 152, 221, 31, 43, 126, 119, 78, 132, 20, 231]));
const conn = new Connection(clusterApiUrl("devnet"));

const umi = createUmi(conn);

const umiKeyPair = umi.eddsa.createKeypairFromSecretKey(devUserKeypair.secretKey);

umi
    .use(keypairIdentity(umiKeyPair))
    .use(mplTokenMetadata())
    .use(irysUploader());

const collectionNftAddress = umiPublicKey("CAbHmRiqhYQEGukx9n4nMFUdteiN74BCMZCSrDsULR7u");

export default async function createRegularNFT(nftInfo : NFTInfo){
    // const nftData = {
    //     name : nftInfo.tokenName,
    //     symbol : nftInfo.symbol,
    //     description : nftInfo.description,
    //     imageFile : nftInfo.imgUrl
    // }
    // const NFTImagePath = path.resolve(__dirname, "nft.png");
 
    //   const buffer = await fs.readFile(NFTImagePath);

    //   const imageUri = await metadataImageUrl(buffer);

    //   console.log(imageUri[0]);

    const mintLength = getMintLen([ExtensionType.MetadataPointer]);
    const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);


    async function jsonUrl() {    
        const data : NFTInfo = {
            tokenName : nftInfo.tokenName,
            symbol : nftInfo.symbol,
            description : nftInfo.description,
            imgUrl : nftInfo.imgUrl
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
        collection: {
        key: collectionNftAddress,
        verified: false,
        },
    }).sendAndConfirm(umi, { send: { commitment: "finalized" } });
    
    let link = getExplorerLink("address", mint.publicKey, "devnet");
    console.log(`Token Mint:  ${link}`);

    return {link, minimumRequired}

};