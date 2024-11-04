import { message } from "telegraf/filters";
import { bot } from "../botCode";
import axios from "axios";
import dbFunction, { addUser, getImageUse } from "../db/dbFunction";

export default function imageUpload(){
    bot.command("uploadToArweave", async (ctx) => {
        let imageUse = await getImageUse(String(ctx.from.username));
        // let count = 0;
        while(imageUse === -1) {
            imageUse = await getImageUse(String(ctx.from.username));
            // console.log(count += 1)
        }
        if (imageUse! <= 5) {
        ctx.reply("📸 Please send an image that is less than 5 MB.");
        ctx.reply(`Note for Image Upload:
            
File Size Limit: Maximum 5 MB

👇Important👇:

Uploading larger files may lead to a loss of image resolution and affect your ⛏️ NFT minting ⛏️ or 🪙 token utility 🪙.
For optimal quality and seamless integration with decentralized platforms, please ensure your images are within the specified size limit.

🙏Thank you🙏!`);
            
        try {
            bot.on(message("photo"), async (ctx) => {
                
                const files = ctx.update.message.photo[ctx.update.message.photo.length - 1].file_id;
                const filesInfo = ctx.update.message.photo[ctx.update.message.photo.length - 1];
                console.log(filesInfo)
    
                if (filesInfo.file_size! > 2*(Math.pow(10, 6))) {
                    ctx.reply("Please Upload less then 5 MB Image");
                    return;
                }

                const url = await ctx.telegram.getFileLink(files);
                // console.log(url);
                const response = await axios({url : String(url), responseType : 'stream'});
                const imgBuffer = await response.data._readableState.buffer;
                
                const uploadResponse = await axios.post('https://api.akord.com/files', imgBuffer[0], {
                headers : {
                    'Accept': 'application/json',
                    'Api-Key': String(process.env.AKORD_API_KEY),
                    'Content-Type': 'image/png'
                }})

                const result = await uploadResponse.data;
                
                if (uploadResponse.status === 200 || uploadResponse.status == 201) {
                    ctx.reply("Here is your image link");
                    ctx.reply(`\` ${result.tx.gatewayUrls[0]} \``, {parse_mode : 'MarkdownV2'});
                    console.log(result.tx.gatewayUrls);
                    await dbFunction(String(ctx.from.username), {img : true});
                }else{
                    // console.log(response.status);
                    ctx.reply("Please try later after some try")
                }

            })
            
        } catch (error) {
            console.log("Error uploading image");
        }
    }else if (imageUse! > 5){
        console.log("Over use image upload")
    }
    })
        
}
