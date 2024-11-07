import { Keypair, PublicKey } from "@solana/web3.js";
import walletCommands, { balanceFromWallet, confirmWalletDeduction, userKeypair } from "./wallet";
import { bot } from "../botCode";
import { getIsWallet } from "../db/dbFunction";
import { message } from "telegraf/filters";
import { mintingToken } from "./createToken";
import { config } from "dotenv";
import { getMetadataFromUser, tokenInfo, TokenInfo } from "./getMetadataFromUser";
import { ENTER_MINT_AMOUNT_MSG, ENTER_PUBLIC_KEY_MSG, INSUFFICIENT_BALANCE_MSG, INVALID_AMOUNT_MSG, INVALID_PUBLIC_KEY_MSG, MINT_ERROR_MSG, MINT_SUCCESS_MSG, MINT_TOKEN_DESTINATION_MSG, MINTING_PROCESS_ERROR_MSG } from "./createTokenMessages";
import { devUserKeypair } from "..";

async function tokenCommands() {
    bot.command("createToken", async (ctx) => {
        const balance = await balanceFromWallet(devUserKeypair.publicKey);
        if (balance === 0) {
            ctx.reply(INSUFFICIENT_BALANCE_MSG);
            setTimeout(() => ctx.reply(`\`${userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
            return;
        }
        await getMetadataFromUser(ctx);
    });

    bot.command("mintToken", (ctx) => {
        ctx.reply(MINT_TOKEN_DESTINATION_MSG, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔹 Mint to Current Account", callback_data: "existAc" }],
                    [{ text: "🔹 Mint to External Account (via Public Key)", callback_data: "externalAc" }]
                ]
            }
        });
    });

    bot.action("existAc", async (ctx) => {
        await ctx.reply(ENTER_MINT_AMOUNT_MSG);
        bot.on(message("text"), async (ctx) => {
            const mintAmount = parseFloat(ctx.message.text);
            console.log(mintAmount);
            if (isNaN(mintAmount) || mintAmount <= 0) {
                return ctx.reply(INVALID_AMOUNT_MSG);
            }
            const isMinted = await mintingToken(tokenInfo.decimals, mintAmount);
            console.log(isMinted);
            if (isMinted) {
                ctx.reply(MINT_SUCCESS_MSG(tokenInfo.tokenName, "your account"));
            } else {
                ctx.reply(MINT_ERROR_MSG(tokenInfo.tokenName));
            }
        });
    });

    bot.action("externalAc", async (ctx) => {
        let stage = 1;
        let pubKey : PublicKey;
        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/; // Valid base58 characters

        async function promptForPublicKey() {
            await ctx.reply(ENTER_PUBLIC_KEY_MSG);
            stage = 1;
        }

        async function promptForMintAmount() {
            await ctx.reply(ENTER_MINT_AMOUNT_MSG);
            stage = 2;
        }

        await promptForPublicKey();

        bot.on(message("text"), async (ctx) => {
            const inputText = String(ctx.message.text).trim();

            if (stage === 1) {
                try {
                    if (!base58Regex.test(inputText)) {
                        throw new Error("Invalid characters in the input. Only base58 characters are allowed.");
                    }
                    pubKey = new PublicKey(inputText);
                    await promptForMintAmount();
                } catch (error) {
                    console.error("Error while converting to PublicKey:", error);
                    await ctx.reply(INVALID_PUBLIC_KEY_MSG);
                    return await promptForPublicKey();
                }
            } else if (stage === 2) {
                const mintAmount = parseFloat(inputText);
                if (isNaN(mintAmount) || mintAmount <= 0) {
                    return ctx.reply(INVALID_AMOUNT_MSG);
                }

                try {
                    const isMinted = await mintingToken(tokenInfo.decimals, mintAmount, pubKey);
                    if (isMinted) {
                        await ctx.reply(MINT_SUCCESS_MSG(tokenInfo.tokenName, pubKey.toString()));
                    } else {
                        await ctx.reply(MINT_ERROR_MSG(tokenInfo.tokenName));
                    }
                } catch (error) {
                    console.error("Error while minting token:", error);
                    await ctx.reply(MINTING_PROCESS_ERROR_MSG);
                }
                stage = 3; // End of minting process
            }
        });
    });
}

export default tokenCommands;
