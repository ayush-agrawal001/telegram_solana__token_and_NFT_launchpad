import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import geminiReply, { helpFromGemini } from "./geminiReply.js";
import userModel from "./db/dbSchema.js";
import dbFunction, { addUser, setWallet } from "./db/dbFunction.js";
import walletCommands from "./solana_onChain/wallet.js";
import tokenCommands from "./solana_onChain/token/createTokenCommands.js";
import imageUpload from "./solana_onChain/imageUpload/imgUploadCommands.js";
import createNFTcommands from "./solana_onChain/NFTs/createNFTCommands.js";

export const bot = new Telegraf(process.env.BOT_TOKEN!);


let isPromptListening = false;

const startMessage = `Welcome to ChainGenie! 🌐

I’m here to make your Web3 journey simple and seamless. From generating wallets and creating tokens to minting NFTs and storing images permanently on Arweave, ChainGenie has got you covered! 🪄✨

Here's a quick guide to get started:

/wallet – Generate a new wallet with ease.
/token – Create and mint tokens in seconds.
/nft – Craft unique NFTs with custom metadata.
/store – Securely store images on Arweave for permanent access.
Ready to dive in? Type a command, and let’s explore the world of decentralized technology together!`

interface walletPassword{
    userName : string;
    password : string;
}

export let walletPassword : walletPassword = {userName : "", password : ""};

function botCommands(){
    if (!process.env.BOT_TOKEN) {
        throw Error("No Bot Api key found")
    }
    
    bot.command("start", async (ctx) => {
        // console.log(ctx);
        try {
            await addUser(ctx.from.username!);
            bot.telegram.sendMessage(ctx.chat.id,startMessage);
            ctx.reply("🔒 To secure your wallet, please create a strong password. This will help protect your assets and keep your account safe! 🛡️✨");
            bot.on(message("text"), async (ctx, next) => {
                if (ctx.message.text) {
                    walletPassword = {userName : ctx.from.username!, password : ctx.message.text};
                    ctx.reply("Password set successfully! You can now use /wallet to generate your wallet.");
                    next();
                }  
            })
        } catch (error) {
            console.log(error);
        }
    })


    bot.on(message('sticker') , async (ctx) => {
        console.log(ctx.message.sticker.emoji)
        console.log(ctx.from.username)
        const replyMessage = await geminiReply(ctx.message.sticker.emoji!, ctx.from.first_name);
        ctx.reply(replyMessage, {parse_mode : "Markdown"});
    });
    
    bot.command("askgenie", async (ctx) => {
        await ctx.reply("Hey there! 👋 I'm ChainGenie, your AI-powered Telegram bot 🤖. Feel free to ask me anything – I'm here to help with token creation 💰, NFT minting 🎨, wallet management 🔐, and so much more! Just drop your question, and I'll be ready for the next chat! 💬");
        await ctx.reply("To exit the chat, use /exit command");
        isPromptListening = true;
    });

    bot.command("exit", (ctx) => {
        if (isPromptListening) {
            isPromptListening = false;
            ctx.reply("Chat ended! Use /askgenie to start a new chat.");
        }
    });

    bot.on(message("text"), async (ctx, next) => {
        if (!isPromptListening || ctx.message.text.startsWith('/')) {
            return next();
        }
        const replyMessage = await helpFromGemini(ctx.message.text, ctx.from.first_name);
        await ctx.reply(replyMessage);
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