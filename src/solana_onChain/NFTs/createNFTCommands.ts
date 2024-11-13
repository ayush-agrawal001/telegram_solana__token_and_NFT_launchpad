import { Message } from "telegraf/typings/core/types/typegram";
import { devUserKeypair } from "../..";
import { bot } from "../../botCode";
import { INSUFFICIENT_BALANCE_MSG } from "../token/createTokenMessages";
import { balanceFromWallet } from "../wallet";
import { getNFTCollectionMetadata } from "./getNFTCollectioinfo";
import { getNFTMetadata } from "./getNFTinfo";
import userModel from "../../db/dbSchema";
import { Keypair } from "@solana/web3.js";

let optionMessage : Message;

export default async function createNFTcommands() {

    
    bot.command("createnft" || "createNFT", async ctx => {
        
        const user = await userModel.findOne({userName : ctx.from.username});
        const secretKey = Buffer.from(user?.walletSecretKey!, "base64");
        const userKeypair = Keypair.fromSecretKey(secretKey);
        
        try{
            const balance = await balanceFromWallet(devUserKeypair.publicKey);
            if (balance === 0) {
                ctx.reply(INSUFFICIENT_BALANCE_MSG);
                setTimeout(() => ctx.reply(`\`${userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
                return;
            }
        }catch(error){
            ctx.reply(`can't get balance please try again later`);
            setTimeout(() => ctx.reply(`\`${userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
            console.log(error);
            return;
        }
        optionMessage = await ctx.reply("Would you like to make a collectible or a regular NFT ?", {
            reply_markup : {
                inline_keyboard : [
                    [{text : "Create Colllectible", callback_data : "startCollectible"}],
                    [{text : "Create Regular NFT", callback_data : "createNFT"}]
                ]
            }
        })

        bot.action("startCollectible",async ctx => {
            ctx.deleteMessage(optionMessage.message_id);
            await getNFTCollectionMetadata(ctx)
            ctx.answerCbQuery("Connecting with NFT collection creation....")
        })

        bot.action("createNFT",async ctx => {
            ctx.deleteMessage(optionMessage.message_id);
            ctx.answerCbQuery("Connecting with NFT creation....")
            await getNFTMetadata(ctx);
        })
    })
    
}