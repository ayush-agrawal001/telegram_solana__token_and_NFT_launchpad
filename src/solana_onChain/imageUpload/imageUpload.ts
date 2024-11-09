import axios from "axios";

export async function metadataImageUrl(buffer : any) {

    // console.log(file.buffer);
    const uploadResponse = await axios.post('https://api.akord.com/files', buffer, {
        headers : {
            'Accept': 'application/json',
            'Api-Key': String(process.env.AKORD_API_KEY),
            'Content-Type': "image/png"
    }})
    
    console.log(await uploadResponse.data.tx.gatewayUrls); // image url;
    return await uploadResponse.data
}