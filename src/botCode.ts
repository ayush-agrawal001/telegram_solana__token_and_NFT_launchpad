import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import geminiReply from "./geminiReply.js";
import userModel from "./db/dbSchema.js";
import dbFunction, { addUser } from "./db/dbFunction.js";
import walletCommands from "./solana_onChain/wallet.js";
import tokenCommands from "./solana_onChain/token/createTokenCommands.js";
import imageUpload from "./solana_onChain/imageUpload/imgUploadCommands.js";
import createNFTcommands from "./solana_onChain/NFTs/createNFTCommands.js";

export const bot = new Telegraf(process.env.BOT_TOKEN!);

let isStickerListening = false;

function botCommands(){
    if (!process.env.BOT_TOKEN) {
        throw Error("No Bot Api key found")
    }
    
    bot.command("start", async (ctx) => {
        // console.log(ctx);
        await addUser(ctx.from.username!);
        bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to the Ginie telegram bot.I respond to /createWallet. Please try it');
    })

    isStickerListening = true
    bot.on(message('sticker') , async (ctx) => {
        if (!isStickerListening) {
            return;
        }

        console.log(ctx.message.sticker.emoji)
        console.log(ctx.from.username)
        const replyMessage = await geminiReply(ctx.message.sticker.emoji!, ctx.from.first_name);
        ctx.reply(replyMessage, {parse_mode : "Markdown"});
        isStickerListening = false
    });
    
    tokenCommands();
    
    createNFTcommands();
    
    walletCommands();

    imageUpload();
    
    bot.launch(); //This Uses polling

    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

export default botCommands;