import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { confirmWalletDeduction } from "../wallet";
import { Context } from "telegraf";
import { uploadImagePermUrl } from "../imageUpload/imgUploadCommands";
import { WARNING_MESSAGE_IMAGE_UPLOAD } from "../token/createTokenMessages";
import { Message } from "telegraf/typings/core/types/typegram";

const isValidUrl = (urlString: string) => {
    var urlPattern = new RegExp('^(https?:\\/\\/)?' + 
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + 
    '((\\d{1,3}\\.){3}\\d{1,3}))' + 
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + 
    '(\\?[;&a-z\\d%_.~+=-]*)?' + 
    '(\\#[-a-z\\d_]*)?$', 'i');
    return !urlPattern.test(urlString);
}

export interface NFTInfo {
    tokenName: string;
    symbol: string;
    description: string;
    imgUrl: string;
    collectibleId: string;
}

let stage = 1;
export let nftInfo: NFTInfo = {
    tokenName: "",
    symbol: "",
    description: "", 
    imgUrl: "",
    collectibleId: ""
};

let isMetadataListening = false;
let isPhotoListening = false;

// Add message tracking variables
let message1: Message;
let message2: Message;
let message3: Message;
let message4: Message;
let message5: Message;

// Add cancel and goBack functions
async function cancelProcess(ctx: Context) {
    isMetadataListening = false;
    isPhotoListening = false;
    stage = 1;
    await ctx.reply("❌ Process cancelled. You can start over when you're ready!");
}

async function goBack(ctx: Context, next: () => void) {
    stage = Math.max(1, stage - 1);
    await handleStage(ctx, null, next);
}

async function handleStage(ctx: Context, inputText: string | null, next: () => void) {
    switch (stage) {
        case 1:
            if (inputText) {
                if (inputText.length > 32) {
                    await ctx.reply("🚨 Please enter a NFT name with less than 32 characters.");
                    return;
                }
                nftInfo.tokenName = inputText;
                stage = 2;
                await handleStage(ctx, null, next);
            } else {
                message1 = await ctx.reply("First, enter a name for your NFT (e.g., 'MyNFT'). 📝 (Max 32 characters)", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "⬅️ Go Back", callback_data: "goBack" }, { text: "❌ Cancel", callback_data: "cancel" }]
                        ]
                    }
                });
            }
            break;

        case 2:
            if (inputText) {
                if (inputText.length > 10) {
                    await ctx.reply("🚫 Symbol is too long! Please enter a symbol with less than 10 characters.");
                    return;
                }
                nftInfo.symbol = inputText;
                stage = 3;
                await handleStage(ctx, null, next);
            } else {
                message2 = await ctx.reply("💬 Enter a short symbol or ticker for your NFT (max 10 characters).", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "⬅️ Go Back", callback_data: "goBack" }, { text: "❌ Cancel", callback_data: "cancel" }]
                        ]
                    }
                });
            }
            break;

        case 3:
            if (inputText) {
                if (inputText.length > 200) {
                    await ctx.reply("✍️ Keep it short! Please enter a description with less than 200 characters.");
                    return;
                }
                nftInfo.description = inputText;
                stage = 4;
                await handleStage(ctx, null, next);
            } else {
                message3 = await ctx.reply("📜 Add a brief description for your NFT. What makes it unique? (Max 200 characters)", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "⬅️ Go Back", callback_data: "goBack" }, { text: "❌ Cancel", callback_data: "cancel" }]
                        ]
                    }
                });
            }
            break;

        case 4:
            if (inputText) {
                if (inputText.toLowerCase() === "skip") {
                    nftInfo.collectibleId = "";
                    stage = 5;
                } else {
                    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(inputText)) {
                        await ctx.reply("❌ Please enter a valid Solana public key or type 'skip' to proceed without one.");
                        return;
                    } else {
                        console.log(inputText);
                        nftInfo.collectibleId = inputText;
                        stage = 5;
                    }
                }
                await handleStage(ctx, null, next);
            } else {
                message4 = await ctx.reply("🆔 Enter the collectible public ID to associate with this NFT, or type 'skip' to proceed without one.", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "⬅️ Go Back", callback_data: "goBack" }, { text: "❌ Cancel", callback_data: "cancel" }]
                        ]
                    }
                });
            }
            break;

        case 5:
            if (inputText) {
                if (isValidUrl(inputText)) {
                    await ctx.reply("🔗 Oops! That doesn't look like a valid URL. Please try again.");
                    return;
                }
                nftInfo.imgUrl = inputText;
                const isConfirmed = await confirmWalletDeduction({ nftRegular: true }, ctx, nftInfo);
                if (isConfirmed) {
                    stage = 1;
                    await ctx.reply("🎉 Success! We got your NFT metadata! 🚀");
                    next();
                } else if (!isConfirmed) {
                    stage = 1;
                    next();
                    isMetadataListening = false;
                    isPhotoListening = false;
                }
            } else {
                message5 = await ctx.reply("🖼️ What would you like to upload?", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "📸 Image", callback_data: "imgUp" }],
                            [{ text: "🌐 URL of Image", callback_data: "urlUp" }],
                            [{ text: "⬅️ Go Back", callback_data: "goBack" }, { text: "❌ Cancel", callback_data: "cancel" }]
                        ]
                    }
                });
            }
            break;
    }
}

let confirmMessage: Message;

export async function getNFTMetadata(ctx: Context) {
    confirmMessage = await ctx.reply("Are you ready to create your NFT? 🎉", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes, let's go! 🚀", callback_data: "YesCreateNFT" }, { text: "No, not now 😅", callback_data: "NoDontCreateNFT" }]
            ]
        }
    });

    bot.action("NoDontCreateNFT", ctx => {
        ctx.reply("Alright, maybe next time! 🥲👍");
        ctx.answerCbQuery("ok 🥲👍");
    });

    bot.action("YesCreateNFT", async (ctx, next) => {
        ctx.deleteMessage(confirmMessage.message_id);
        await ctx.reply("⚠️ Important: Please do not use any other commands while creating your NFT. This could disrupt the creation process.");
        await ctx.answerCbQuery("Let's get started!");
        isMetadataListening = true;
        handleStage(ctx, null, next);
    });
    
    bot.action("imgUp", async (ctx) => {
        ctx.deleteMessage(message5.message_id);
        await ctx.reply(`${WARNING_MESSAGE_IMAGE_UPLOAD} 😊`);
        isPhotoListening = true;
        await ctx.answerCbQuery();
    });

    bot.action("urlUp", async (ctx) => {
        ctx.deleteMessage(message5.message_id);
        await ctx.reply("Please enter the image URL 🌐");
        isPhotoListening = false;
        stage = 5;
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
            nftInfo.imgUrl = imageUrl.tx.gatewayUrls[0];
            const isConfirmed = await confirmWalletDeduction({ nftRegular: true }, ctx, nftInfo);
            if (isConfirmed) {
                stage = 1;
                await ctx.reply("🎉 NFT metadata with your uploaded image is all set!");
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
        await handleStage(ctx, inputText, next);
    });

    bot.action("cancel", async (ctx) => {
        await cancelProcess(ctx);
        await ctx.answerCbQuery("Process cancelled");
    });

    bot.action("goBack", async (ctx, next) => {
        const msgToDelete = [message1, message2, message3, message4, message5];
        for (let i = 0; i < msgToDelete.length; i++) {
            if (stage === i + 1 && msgToDelete[i]) {
                ctx.deleteMessage(msgToDelete[i].message_id);
            }
        }
        await goBack(ctx, next);
        await ctx.answerCbQuery("Going back");
    });
}
