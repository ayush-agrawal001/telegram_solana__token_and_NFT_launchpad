import axios from "axios";
import { TokenInfo } from "../token/getMetadataFromUser";
import { config } from "dotenv";
import { NFTInfo } from "../NFTs/createNFTCollection";

config();

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