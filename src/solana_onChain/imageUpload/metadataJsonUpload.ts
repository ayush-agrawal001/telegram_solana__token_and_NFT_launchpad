import axios from "axios";
import { TokenInfo } from "../token/getMetadataFromUser.js";
import { NFTInfo } from "../NFTs/createNFTCollection.js";
import path, {dirname} from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path : path.resolve(__dirname, "../.env")});

if (!process.env.AKORD_API_KEY) {
    throw Error("No Akord Api key found")
}

export default async function metaDataJsonUrl(tokenMetadata : TokenInfo | NFTInfo) {
    const data = {
        name : tokenMetadata.tokenName,
        symbol : tokenMetadata.symbol,
        description : tokenMetadata.description,
        image : tokenMetadata.imgUrl
    }

    const response = await axios.post("https://api.akord.com/files", JSON.stringify(data), {headers : {
        'Accept': 'application/json',
        'Api-Key': String(process.env.AKORD_API_KEY),
        'Content-Type': 'text/plain'
    }})

    const result = await response.data
    // console.log(await result)
    return await result
}