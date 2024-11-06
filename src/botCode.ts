import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import geminiReply from "./geminiReply.js";
import walletCommands from "./solana_wallet/wallet.js";
import imageUpload from "./solana_wallet/img_upload_arweave.js";
import userModel from "./db/dbSchema.js";
import dbFunction, { addUser } from "./db/dbFunction.js";
import tokenCommands from "./solana_wallet/createTokenCommands.js";

export const bot = new Telegraf(process.env.BOT_TOKEN!);

function botCommands(){
    if (!process.env.BOT_TOKEN) {
        throw Error("No Bot Api key found")
    }

    bot.command("start", async (ctx) => {
        // console.log(ctx);
        await addUser(ctx.from.username!);
        bot.telegram.sendMessage(ctx.chat.id, 'Hello there! Welcome to the Ginie telegram bot.I respond to /createWallet. Please try it');
    })

    bot.on(message('sticker') , async (ctx) => {
        console.log(ctx.message.sticker.emoji)
        console.log(ctx.from.username)
        const replyMessage = await geminiReply(ctx.message.sticker.emoji!, ctx.from.first_name);
        ctx.reply(replyMessage, {parse_mode : "Markdown"});
    });

    
    walletCommands();
    
    tokenCommands();

    imageUpload();

    bot.launch(); //This Uses polling

}

export default botCommands;