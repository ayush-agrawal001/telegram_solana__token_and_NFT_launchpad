import { devUserKeypair } from "../..";
import { bot } from "../../botCode";
import { INSUFFICIENT_BALANCE_MSG } from "../token/createTokenMessages";
import { balanceFromWallet, userKeypair } from "../wallet";
import { getNFTCollectionMetadata } from "./getNFTCollectioinfo";
import { getNFTMetadata } from "./getNFTinfo";

export default async function createNFTcommands() {
    bot.command("createNFT", async ctx => {
        
        const balance = await balanceFromWallet(devUserKeypair.publicKey);
        if (balance === 0) {
            ctx.reply(INSUFFICIENT_BALANCE_MSG);
            setTimeout(() => ctx.reply(`\`${userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
            return;
        }
        ctx.reply("Would you like to make a collectible or a regular NFT ?", {
            reply_markup : {
                inline_keyboard : [
                    [{text : "Create Colllectible", callback_data : "startCollectible"}],
                    [{text : "Create Regular NFT", callback_data : "createNFT"}]
                ]
            }
        })

        bot.action("startCollectible",async ctx => {
            await getNFTCollectionMetadata(ctx)
        })

        bot.action("createNFT",async ctx => {
            await getNFTMetadata(ctx);
        })
    })
}