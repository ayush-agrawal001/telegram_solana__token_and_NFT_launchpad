import { Telegraf } from "telegraf";
import { message } from "telegraf/filters"
import geminiReply, { helpFromGemini } from "./geminiReply.js";
import userModel from "./db/dbSchema.js";
import dbFunction, { addUser, setWallet } from "./db/dbFunction.js";
import walletCommands, { handleWalletReply, hashPassAndStore } from "./solana_onChain/wallet.js";
import tokenCommands from "./solana_onChain/token/createTokenCommands.js";
import imageUpload from "./solana_onChain/imageUpload/imgUploadCommands.js";
import createNFTcommands from "./solana_onChain/NFTs/createNFTCommands.js";

export const bot = new Telegraf(process.env.BOT_TOKEN!);

let isPromptListening = false;

const startMessage = `Welcome to ChainGenie! 🌐

I'm here to make your Web3 journey simple and seamless. From generating wallets and creating tokens to minting NFTs and storing images permanently on Arweave, ChainGenie has got you covered! 🪄✨`

let isBotListening = false;

function botCommands(){
    if (!process.env.BOT_TOKEN) {
        throw Error("No Bot Api key found")
    }
    
    bot.command("start", async (ctx) => {
        try {
            if (!ctx.from?.username) {
                ctx.reply("No username found. Please register your username in Telegram first before using this bot.");
                return;
            }
            await addUser(ctx.from.username);
            bot.telegram.sendMessage(ctx.chat.id,startMessage);
            ctx.reply("🔒 To secure your wallet, please create a strong password. This will help protect your assets and keep your account safe! 🛡️✨", {reply_markup : {force_reply : true}});
            isBotListening = true;
            bot.on(message("text"), async (ctx, next) => {
                try {
                    if (!isBotListening) {
                        return next();
                    }
                    ctx.reply("Password set successfully!");
                    ctx.reply("Start with /createwallet.");
                    // console.log(ctx.message.text);
                    setTimeout(() => hashPassAndStore(ctx, ctx.message.text), 1000);
                    isBotListening = false;
                } catch (error) {
                    console.error("Error in text message handler:", error);
                    ctx.reply("An error occurred while setting password");
                }
            })
        } catch (error) {
            console.error("Error in start command:", error);
            ctx.reply("Something went wrong. Please try again later.");
        }
    })

    bot.on(message('sticker') , async (ctx) => {
        try {
            if (!ctx.from?.username) {
                ctx.reply("No username found");
                return;
            }
            const user = await userModel.findOne({userName: ctx.from.username});
            if (!user) {
                ctx.reply("No user found. Please use /start first to register.");
                return;
            }
            // console.log(ctx.message.sticker.emoji)
            // console.log(ctx.from.username)
            const replyMessage = await geminiReply(ctx.message.sticker.emoji!, ctx.from.first_name);
            ctx.reply(replyMessage, {parse_mode : "Markdown"});
        } catch (error) {
            console.error("Error in sticker handler:", error);
            ctx.reply("Something went wrong. Please try again later.");
        }
    });
    
    bot.command("askgenie", async (ctx) => {
        try {
            if (!ctx.from?.username) {
                ctx.reply("No username found");
                return;
            }
            const user = await userModel.findOne({userName: ctx.from.username});
            if (!user) {
                ctx.reply("No user found. Please use /start first to register.");
                return;
            }
            await ctx.reply("Hey there! 👋 I'm ChainGenie, your AI-powered Telegram bot 🤖. Feel free to ask me anything – I'm here to help with token creation 💰, NFT minting 🎨, wallet management 🔐, and so much more! Just drop your question, and I'll be ready for the next chat! 💬");
            await ctx.reply("To exit the chat, use /exit command");
            isPromptListening = true;
        } catch (error) {
            console.error("Error in askgenie command:", error);
            ctx.reply("Something went wrong. Please try again later.");
        }
    });

    bot.command("exit", async (ctx) => {
        try {
            if (!ctx.from?.username) {
                ctx.reply("No username found");
                return;
            }
            const user = await userModel.findOne({userName: ctx.from.username});
            if (!user) {
                ctx.reply("No user found. Please use /start first to register.");
                return;
            }
            if (isPromptListening) {
                isPromptListening = false;
                ctx.reply("Chat ended! Use /askgenie to start a new chat.");
            }
        } catch (error) {
            console.error("Error in exit command:", error);
            ctx.reply("Something went wrong. Please try again later.");
        }
    });

    bot.on(message("text"), async (ctx, next) => {
        try {
            if (!isPromptListening || ctx.message.text.startsWith('/')) {
                return next();
            }
            if (!ctx.from?.username) {
                ctx.reply("No username found");
                return;
            }
            const user = await userModel.findOne({userName: ctx.from.username});
            if (!user) {
                ctx.reply("No user found. Please use /start first to register.");
                return;
            }
            const replyMessage = await helpFromGemini(ctx.message.text, ctx.from.first_name);
            await ctx.reply(replyMessage);
        } catch (error) {
            console.error("Error in text message handler:", error);
            ctx.reply("Something went wrong. Please try again later.");
        }
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