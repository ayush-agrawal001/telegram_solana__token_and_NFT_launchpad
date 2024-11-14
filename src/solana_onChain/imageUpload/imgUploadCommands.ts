import { message } from "telegraf/filters";
import { bot } from "../../botCode.js";
import axios from "axios";
import dbFunction, { getImageUse } from "../../db/dbFunction.js";
import { metadataImageUrl } from "./imageUpload.js";
import sharp from "sharp";
// import { Context } from "telegraf";

export async function uploadImagePermUrl(ctx : any) {
    try {
        const files = ctx.update.message.photo[ctx.update.message.photo.length - 1].file_id;
        const filesInfo = ctx.update.message.photo[ctx.update.message.photo.length - 1];

        // console.log(filesInfo);

        if (filesInfo!.file_size! > 5 * (Math.pow(10, 6))) {
            ctx.reply("Please upload an image smaller than 5 MB.");
            return;
        }

        const url = await ctx.telegram.getFileLink(files);
        // console.log(url.href);
    
        const response = await axios({ url: String(url), responseType: 'arraybuffer' });
        const imgBuffer = Buffer.from(response.data);
    
        const processedImageBuffer = await sharp(imgBuffer)
            .resize({ width: 1024 }) // size
            .jpeg({ quality: 80 }) // quality
            .toBuffer();
    
        const result = await metadataImageUrl(processedImageBuffer);
        await dbFunction(String(ctx.from.username), { img: true });
        return result;
        
    } catch (error) {
        console.error("Error processing image:", error);
        ctx.reply("An error occurred while processing the image. Please try again.");
    }
}


export default function imageUpload(){
    try {
        bot.command("uploadtoarweave", async (ctx) => {
            try {
                let imageUse = await getImageUse(String(ctx.from.username));

                if (imageUse === 0) {
                    ctx.reply("📸 Please send an image that is less than 5 MB.");
                    ctx.reply(`Note for Image Upload:
                    
        File Size Limit: Maximum 5 MB

        👇Important👇:

        Uploading larger files may lead to a loss of image resolution and affect your ⛏️ NFT minting ⛏️ or 🪙 token utility 🪙.
        For optimal quality and seamless integration with decentralized platforms, please ensure your images are within the specified size limit.

        🙏Thank you🙏!`);
                    
                    try {
                        bot.on(message("photo"), async (ctx) => {
                            try {
                                const result = await uploadImagePermUrl(ctx);
                            
                                if (result) {
                                    ctx.reply("Here is your image link");
                                    ctx.reply(`[Click to open in browser](${result.tx.gatewayUrls[0]})`, { parse_mode: 'MarkdownV2' });
                                    ctx.reply(`\`${result.tx.gatewayUrls[0]}\``, { parse_mode: 'MarkdownV2' });
                                    // console.log(result.tx.gatewayUrls);
                            
                                    // Update database with image status
                                    await dbFunction(String(ctx.from.username), { img: true });
                                } else {
                                    ctx.reply("Please try again later.");
                                }
                            } catch (error) {
                                console.error("Error handling photo message:", error);
                                ctx.reply("An error occurred while processing your photo. Please try again.");
                            }
                        })
                        
                    } catch (error) {
                        console.error("Error setting up photo listener:", error);
                    }
                } else if (imageUse! > 5){
                    // console.log("Over use image upload")
                    ctx.reply("You have exceeded the maximum number of image uploads allowed.");
                }
            } catch (error) {
                console.error("Error in uploadToArweave command:", error);
                ctx.reply("An error occurred. Please try again later.");
            }
        })
    } catch (error) {
        console.error("Error setting up image upload command:", error);
    }
}
