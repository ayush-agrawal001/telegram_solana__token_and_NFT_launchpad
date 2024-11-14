import axios from "axios";
import path, {dirname} from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path : path.resolve(__dirname, "../.env")});

if (!process.env.AKORD_API_KEY) {
    throw Error("No Akord Api key found")
}

export async function metadataImageUrl(buffer : any) {

    // console.log(file.buffer);
    const uploadResponse = await axios.post('https://api.akord.com/files', buffer, {
        headers : {
            'Accept': 'application/json',
            'Api-Key': String(process.env.AKORD_API_KEY),
            'Content-Type': "image/png"
    }})
    
    // console.log(await uploadResponse.data.tx.gatewayUrls); // image url;
    return await uploadResponse.data
}