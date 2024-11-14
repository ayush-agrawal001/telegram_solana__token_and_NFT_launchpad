import { Message } from "telegraf/typings/core/types/typegram";
import { bot } from "../../botCode.js";
import { INSUFFICIENT_BALANCE_MSG } from "../token/createTokenMessages.js";
import { balanceFromWallet, convertToKeypair } from "../wallet.js";
import { getNFTCollectionMetadata } from "./getNFTCollectioinfo.js";
import { getNFTMetadata } from "./getNFTinfo.js";
import userModel from "../../db/dbSchema.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import { publicKey } from "@metaplex-foundation/umi";

let optionMessage : Message;

export default async function createNFTcommands() {

    
    bot.command("createnft", async ctx => {
        try {
            const user = await userModel.findOne({userName : ctx.from.username})
            if (!user) {
                ctx.reply("No user found. Please create a wallet first.");
                return;
            }

            const mnemonic = user.walletMnemonic;
            if (!mnemonic) {
                ctx.reply("No wallet found for user. Please create a wallet first.");
                return;
            }

            const wallet = await convertToKeypair(mnemonic);
        
            try{
                const balance = await balanceFromWallet(new PublicKey(wallet.userPubkey));
                if (balance === 0) {
                    ctx.reply(INSUFFICIENT_BALANCE_MSG);
                    setTimeout(() => ctx.reply(`\`${wallet.userPubkey}\``, { parse_mode: 'MarkdownV2' }), 1000);
                    return;
                }
            }catch(error){
                ctx.reply(`can't get balance please try again later`);
                setTimeout(() => ctx.reply(`\`${wallet.userPubkey}\``, { parse_mode: 'MarkdownV2' }), 1000);
                // console.log(error);
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
                try {
                    ctx.deleteMessage(optionMessage.message_id);
                    await getNFTCollectionMetadata(ctx)
                    ctx.answerCbQuery("Connecting with NFT collection creation....")
                } catch (error) {
                    console.error(error);
                    ctx.reply("An error occurred while creating the collectible. Please try again.");
                }
            })

            bot.action("createNFT",async ctx => {
                try {
                    ctx.deleteMessage(optionMessage.message_id);
                    ctx.answerCbQuery("Connecting with NFT creation....")
                    await getNFTMetadata(ctx);
                } catch (error) {
                    console.error(error);
                    ctx.reply("An error occurred while creating the NFT. Please try again.");
                }
            })
        } catch (error) {
            console.error(error);
            ctx.reply("An error occurred. Please try again later.");
        }
    })
    
}