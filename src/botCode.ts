import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import geminiReply from "./geminiReply.js";
import walletCommands from "./solana_wallet/wallet.js";
import imageUpload from "./solana_wallet/img_upload_arweave.js";
import userModel from "./db/dbSchema.js";
import dbFunction from "./db/dbFunction.js";

export const bot = new Telegraf(process.env.BOT_TOKEN!);

function botCommands(){
    if (!process.env.BOT_TOKEN) {
        throw Error("No Bot Api key found")
    }

    bot.command("start", (ctx) => {
        // console.log(ctx);
        bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to the Ginie telegram bot.I respond to /createWallet. Please try it');
    })

    bot.on(message('sticker') , async (ctx) => {
        console.log(ctx.message.sticker.emoji)
        console.log(ctx.from.username)
        const replyMessage = await geminiReply(ctx.message.sticker.emoji!, ctx.from.first_name);
        ctx.reply(replyMessage, {parse_mode : "Markdown"});
    });

    
    walletCommands();

    imageUpload();
    bot.on(message('text') , async (ctx) => {
        console.log(ctx.message.text)
        console.log(ctx.from.first_name)
        dbFunction(String(ctx.from.username));
        const replyMessage = await geminiReply(ctx.message.text, ctx.from.first_name);
        ctx.reply(replyMessage, );
    });

    bot.launch(); //This Uses polling

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

export default botCommands;