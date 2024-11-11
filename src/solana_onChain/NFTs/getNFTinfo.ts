import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { Context } from "telegraf";
import { confirmWalletDeduction } from "../wallet";
import { NFTInfo } from "./createNFTCollection";
import { uploadImagePermUrl } from "../imageUpload/imgUploadCommands";
import dbFunction from "../../db/dbFunction";

export let nftInfo: NFTInfo;
let nftStage = 1;

nftInfo = {
    tokenName: "",
    symbol: "",
    description: "",
    imgUrl: "",
    collectibleId: "", // New field for collectible public ID
};

const isValidUrl = (urlString: string) => {
    const urlPattern = new RegExp('^(https?:\\/\\/)?'+
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
        '((\\d{1,3}\\.){3}\\d{1,3}))'+
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
        '(\\?[;&a-z\\d%_.~+=-]*)?'+
        '(\\#[-a-z\\d_]*)?$','i');
    return urlPattern.test(urlString);
}

export async function getNFTMetadata(ctx: Context) {
    await ctx.reply("Ready to add an NFT to your collection?", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes", callback_data: "YesAddNFT" }, { text: "No", callback_data: "NoAddNFT" }]
            ]
        }
    });

    bot.action("NoAddNFT", ctx => {
        ctx.reply("Alright, NFT collection is complete!");
        ctx.answerCbQuery("NFT collection complete.");
    });

    bot.action("YesAddNFT", async (ctx) => {
        await ctx.reply("Enter the name of your NFT (under 32 characters).");
        await ctx.answerCbQuery("Let's Go");

        bot.on(message("text"), async (ctx) => {
            console.log(ctx)
            const inputText = ctx.message.text;

            function switchCase(condition: boolean, messageText: string, warningText: string, fieldType: string, goBackStage: number, nextStage: number,isUrlPrompt? : boolean ) {
                if (condition) {
                    ctx.reply(warningText);
                } else {
                    setTimeout(async () => await ctx.reply(messageText, {
                        reply_markup: {
                            inline_keyboard: [
                                (isUrlPrompt ? [{text : "🖼️ Image", callback_data : "imgUp"}, {text : "🌐 URL", callback_data : "urlUp"}] : []),
                                [{ text: "Go Back", callback_data: `goBack${goBackStage}` }],
                                [{ text: "Cancel", callback_data: `goBack${goBackStage}` }],
                            ]
                        }
                    }), 100);
                    nftStage = nextStage;
                    bot.action(`goBack${goBackStage}`, (ctx) => {
                        nftStage -= 1;
                        ctx.reply(`Please re-enter the ${fieldType}.`);
                        ctx.answerCbQuery(`Re-enter ${fieldType}`);
                    });
                    bot.action("imgUp", ctx => {
                        ctx.reply("📸 Please send an image that is less than 5 MB.");
            ctx.reply(`Note for Image Upload:
                
    File Size Limit: Maximum 5 MB
    
    👇Important👇:
    
    Uploading larger files may lead to a loss of image resolution and affect your ⛏️ NFT minting ⛏️ or 🪙 token utility 🪙.
    For optimal quality and seamless integration with decentralized platforms, please ensure your images are within the specified size limit.
    
    🙏Thank you🙏!`);
                        bot.on(message('photo'), async ctx => {
                            const result = await uploadImagePermUrl(ctx);
                            if (result) {
                                ctx.reply("Here is your image link");
                                ctx.reply(`[Click to open in browser](${result.tx.gatewayUrls[0]})`, { parse_mode: 'MarkdownV2' });
                                ctx.reply(`\`${result.tx.gatewayUrls[0]}\``, { parse_mode: 'MarkdownV2' });
                                console.log(result.tx.gatewayUrls);
                        
                                // Update database with image status
                                await dbFunction(String(ctx.from.username), { img: true });

                                ctx.reply("✨ For the best results, please send the image URL provided above! 🌐");
                            }
                        })
                    })
    
                    bot.action("urlUp", (ctx => {
                        ctx.reply("Please send image URL");
                    }))
                }
            }

            switch (nftStage) {
                case 1: // Step 1: Get NFT name
                    switchCase(
                        (inputText.length > 32),
                        "Enter a unique symbol for this NFT (under 10 characters).",
                        "Please enter an NFT name with less than 32 characters.",
                        "NFT name",
                        1,
                        2
                    );
                    nftInfo.tokenName = inputText;
                    break;

                case 2: // Step 2: Get symbol
                    switchCase(
                        (inputText.length > 10),
                        "Describe your NFT in a few words (under 200 characters).",
                        "Please enter a symbol with less than 10 characters.",
                        "symbol",
                        2,
                        3
                    );
                    nftInfo.symbol = inputText;
                    break;

                case 3: // Step 3: Get description
                    switchCase(
                        (inputText.length > 200),
                        "🔄 What would you like to upload?",
                        "Please enter a description with less than 200 characters.",
                        "description",
                        3,
                        4,
                        true
                    );
                    nftInfo.description = inputText;
                    break;

                case 4: // Step 4: Get Image URL
                    if (!isValidUrl(inputText)) {
                        ctx.reply("Please enter a valid URL for the image.");
                    } else {
                        nftInfo.imgUrl = inputText;
                        nftStage = 5;
                        await ctx.reply("Enter the collectible public ID.");
                    }
                    break;

                case 5: // Step 5: Get Collectible Public ID
                    nftInfo.collectibleId = inputText;
                    await confirmWalletDeduction({ nftRegular: true }, ctx, nftInfo);
                    nftStage = 6;
                    process.once('SIGINT', () => bot.stop('SIGINT'))
                    process.once('SIGTERM', () => bot.stop('SIGTERM'))
                    break;

                case 6:
                    ctx.reply("Your NFT metadata has been recorded! Would you like to add another NFT?", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Yes", callback_data: "YesAddMoreNFT" }, { text: "No", callback_data: "NoMoreNFT" }]
                            ]
                        }
                    });
                    nftStage = 1; // Reset stage for next NFT if needed
                    bot.action("YesAddMoreNFT", async (ctx) => {
                        ctx.reply("Let's add another NFT! Enter the name of your new NFT.");
                        nftStage = 1;
                        nftInfo = { tokenName: "", symbol: "", description: "", imgUrl: "", collectibleId: "" };
                        await ctx.answerCbQuery("Add more NFT");
                    });
                    bot.action("NoMoreNFT", (ctx) => {
                        ctx.reply("All NFTs have been added. Thank you!");
                        ctx.answerCbQuery("Collection complete!");
                    });
                    break;
            }
        });
    });
}
