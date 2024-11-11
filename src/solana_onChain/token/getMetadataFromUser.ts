import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { confirmWalletDeduction } from "../wallet";
import { Context } from "telegraf";
import { uploadImagePermUrl } from "../imageUpload/imgUploadCommands";
import dbFunction from "../../db/dbFunction";
import { WARNING_MESSAGE_IMAGE_UPLOAD } from "./createTokenMessages";

const isValidUrl = (urlString: string) => {
    var urlPattern = new RegExp('^(https?:\\/\\/)?' + 
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + 
    '((\\d{1,3}\\.){3}\\d{1,3}))' + 
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + 
    '(\\?[;&a-z\\d%_.~+=-]*)?' + 
    '(\\#[-a-z\\d_]*)?$', 'i');
    return !urlPattern.test(urlString);
}

export interface TokenInfo {
    tokenName: string;
    symbol: string;
    description: string;
    decimals: number;
    imgUrl: string;
}
let stage = 1;
export let tokenInfo: TokenInfo = {
    tokenName: "",
    symbol: "",
    description: "",
    decimals: 9,
    imgUrl: "",
};

let isImageUp = false;
let isMetadataListening = false;
let isPhotoListening = false;

async function switchStage(ctx: Context, inputText: string, next: () => void) {
    switch (stage) {
        case 1: // Step 1: Get token name
            if (inputText.length > 32) {
                await ctx.reply("🚨 Please enter a token name with less than 32 characters.");
                return;
            }
            tokenInfo.tokenName = inputText;
            stage = 2;
            await ctx.reply("💬 Great! Now, enter a short symbol or ticker for your token (max 10 characters).");
            break;

        case 2: // Step 2: Get symbol
            if (inputText.length > 10) {
                await ctx.reply("🚫 Symbol is too long! Please enter a symbol with less than 10 characters.");
                return;
            }
            tokenInfo.symbol = inputText;
            stage = 3;
            await ctx.reply("📜 Awesome! Add a brief description for your token. What makes it unique? (Max 200 characters)");
            break;

        case 3: // Step 3: Get description
            if (inputText.length > 200) {
                await ctx.reply("✍️ Keep it short! Please enter a description with less than 200 characters.");
                return;
            }
            tokenInfo.description = inputText;
            stage = 4;
            await ctx.reply("🔢 How many decimal places should your token support? (Typically between 0-18)");
            break;

        case 4: // Step 4: Get decimals
            const decimalsInput = parseInt(inputText);
            if (isNaN(decimalsInput) || decimalsInput < 0 || decimalsInput > 18) {
                await ctx.reply("❌ Please enter a valid number between 0 and 18 for decimal places.");
                return;
            }
            tokenInfo.decimals = decimalsInput;
            stage = 5;
            await ctx.reply("🖼️ What would you like to upload?", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📸 Image", callback_data: "imgUp" }, { text: "🌐 URL of Image", callback_data: "urlUp" }]
                    ]
                }
            });
            break;

        case 5: // Step 5: Get Image URL
            if (isValidUrl(inputText)) {
                await ctx.reply("🔗 Oops! That doesn’t look like a valid URL. Please try again.");
                return;
            }
            tokenInfo.imgUrl = inputText;
            const isConfirmed = await confirmWalletDeduction({ token: true }, ctx, tokenInfo);
            if (isConfirmed) {
                stage = 1;
                await ctx.reply("🎉 Success! We got your metadata! 🚀");
            }
            isMetadataListening = false;
            break;
    }
    next(); // Proceed to the next middleware
}

export async function getMetadataFromUser(ctx: Context) {
    await ctx.reply("Are you ready to create your token? 🎉", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes, let’s go! 🚀", callback_data: "YesCreateToken" }, { text: "No, not now 😅", callback_data: "NoDontCreateToken" }]
            ]
        }
    });

    bot.action("NoDontCreateToken", ctx => {
        ctx.reply("Alright, maybe next time! 🥲👍");
        ctx.answerCbQuery("ok 🥲👍");
    });

    bot.action("YesCreateToken", async (ctx) => {
        await ctx.reply("First, enter a name for your token (e.g., 'MyToken'). 📝 (Max 32 characters)");
        await ctx.answerCbQuery("Let’s get started!");
        isMetadataListening = true;
    });
    
    bot.action("imgUp", async (ctx) => {
        await ctx.reply(`${WARNING_MESSAGE_IMAGE_UPLOAD} 😊`);
        isPhotoListening = true;
        await ctx.answerCbQuery();
    });

    bot.action("urlUp", async (ctx) => {
        await ctx.reply("Please enter the image URL 🌐");
        isPhotoListening = false;
        stage = 5; // Move to the stage where URL is expected
        await ctx.answerCbQuery();
    });

    bot.on(message("photo"), async (ctx, next) => {
        if (!isMetadataListening || !isPhotoListening) {
            return next();
        }
        const imageUrl = await uploadImagePermUrl(ctx);
        if (imageUrl) {
            ctx.reply("Here is your image link");
            ctx.reply(`[Click to open in browser](${imageUrl.tx.gatewayUrls[0]})`, { parse_mode: 'MarkdownV2' });
            ctx.reply(`\`${imageUrl.tx.gatewayUrls[0]}\``, { parse_mode: 'MarkdownV2' });
            tokenInfo.imgUrl = imageUrl.tx.gatewayUrls[0];
            const isConfirmed = await confirmWalletDeduction({ token: true }, ctx, tokenInfo);
            if (isConfirmed) {
                stage = 1;
                await ctx.reply("🎉 Metadata with your uploaded image is all set!");
            }
            isMetadataListening = false;
            isPhotoListening = false;
        }
    });
    
    bot.on(message("text"), async (ctx, next) => {
        if (!isMetadataListening) {
            return next();
        }

        const inputText = ctx.message.text;
        await switchStage(ctx, inputText, next);
    });
}
