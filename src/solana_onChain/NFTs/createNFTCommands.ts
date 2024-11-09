import { devUserKeypair } from "../..";
import { bot } from "../../botCode";
import { INSUFFICIENT_BALANCE_MSG } from "../token/createTokenMessages";
import { balanceFromWallet, userKeypair } from "../wallet";
import { getNFTCollectionMetadata } from "./getNFTCollectioinfo";

export default async function createNFTcommands() {
    bot.command("createNFT", async ctx => {
        const balance = await balanceFromWallet(devUserKeypair.publicKey);
        if (balance === 0) {
            ctx.reply(INSUFFICIENT_BALANCE_MSG);
            setTimeout(() => ctx.reply(`\`${userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
            return;
        }
        await getNFTCollectionMetadata(ctx)
    })
}