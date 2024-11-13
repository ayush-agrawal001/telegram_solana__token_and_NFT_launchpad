import { Keypair, PublicKey } from "@solana/web3.js";
import walletCommands, { balanceFromWallet, confirmWalletDeduction, convertToKeypair } from "../wallet";
import { bot } from "../../botCode";
import { getIsWallet } from "../../db/dbFunction";
import { message } from "telegraf/filters";
import { mintingToken } from "./createToken";
import { config } from "dotenv";
import { getMetadataFromUser, tokenInfo, TokenInfo } from "./getMetadataFromUser";
import { ENTER_MINT_AMOUNT_MSG, ENTER_PUBLIC_KEY_MSG, INSUFFICIENT_BALANCE_MSG, INVALID_AMOUNT_MSG, INVALID_PUBLIC_KEY_MSG, MINT_ERROR_MSG, MINT_SUCCESS_MSG, MINT_TOKEN_DESTINATION_MSG, MINTING_PROCESS_ERROR_MSG } from "./createTokenMessages";
import userModel from "../../db/dbSchema";

async function tokenCommands() {

    
    bot.command("createtoken", async (ctx) => {
        const user = await userModel.findOne({userName : ctx.from.username})
        const mnemonic = user?.walletMnemonic;
        const userWallet = await convertToKeypair(mnemonic!);
        
        try {
            const balance = await balanceFromWallet(userWallet.userKeypair.publicKey);
            if (balance === 0) {
                ctx.reply(INSUFFICIENT_BALANCE_MSG);
                setTimeout(() => ctx.reply(`\`${userWallet.userKeypair.publicKey}\``, { parse_mode: 'MarkdownV2' }), 1000);
                return;
            }
            await getMetadataFromUser(ctx);
        } catch (error) {
            console.error(error);
        }
    });
    let tokenPublicKey: PublicKey;
    
    let isMintTokenListening = false;
    let isExistAcListening = false;
    let isExternalAcListening = false;

    bot.command("minttoken", async (ctx) => {
        // First ask for token public key
        await ctx.reply("Please enter the public key of the token you want to mint:", {
            reply_markup: {
                force_reply: true
            }
        });

        const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

        // Listen for token public key
        isMintTokenListening = true;
        bot.on(message("text"), async (ctx, next) => {
            if (!isMintTokenListening) return next();
            const inputText = ctx.message.text.trim();
            
            try {
                if (!base58Regex.test(inputText)) {
                    throw new Error("Invalid characters in the input. Only base58 characters are allowed.");
                }
                tokenPublicKey = new PublicKey(inputText);
                
                // After valid token public key, show mint options
                await ctx.reply(MINT_TOKEN_DESTINATION_MSG, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔹 Mint to Current Account", callback_data: "existAc" }],
                            [{ text: "🔹 Mint to External Account (via Public Key)", callback_data: "externalAc" }]
                        ]
                    }
                });
                isMintTokenListening = false;
            } catch (error) {
                console.error("Error validating token public key:", error);
                await ctx.reply("Invalid token public key. Please enter a valid Solana public key.");
                isMintTokenListening = false;
                return;
            }
        });
        
    });

    bot.action("existAc", async (ctx) => {
        const user = await userModel.findOne({userName : ctx.from.username})
        const mnemonic = user?.walletMnemonic;
        const userWallet = await convertToKeypair(mnemonic!);

        await ctx.reply(ENTER_MINT_AMOUNT_MSG);
        
            isExistAcListening = true;
            bot.on(message("text"), async (ctx, next) => {
                if (!isExistAcListening) return next();
                const mintAmount = parseFloat(ctx.message.text);
                // console.log(mintAmount);
                if (isNaN(mintAmount) || mintAmount <= 0) {
                    return ctx.reply(INVALID_AMOUNT_MSG);
                }
                const isMinted = await mintingToken(9, mintAmount, tokenPublicKey, new PublicKey(userWallet.userPubkey), ctx.from.username!);
                // console.log(isMinted);
                if (isMinted) {
                    ctx.reply(MINT_SUCCESS_MSG("Token", "your account"));
                } else {
                    ctx.reply(MINT_ERROR_MSG("Token"));
                }
                isExistAcListening = false;
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

        isExternalAcListening = true;
        bot.on(message("text"), async (ctx, next) => {
            if (!isExternalAcListening) return next();
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
                const {message_id} = await   ctx.reply("🪙⛏️ Minting 🪙⛏️ in progress...");
                try {
                    const isMinted = await mintingToken(9, mintAmount, tokenPublicKey ,pubKey, ctx.from.username!);
                    if (isMinted) {
                        await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
                        await ctx.reply(MINT_SUCCESS_MSG("Token", pubKey.toString()));
                    } else {
                        await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
                        await ctx.reply(MINT_ERROR_MSG("Token"));
                    }
                } catch (error) {
                    console.error("Error while minting token:", error);
                    await ctx.telegram.deleteMessage(ctx.chat.id, message_id);
                    await ctx.reply(MINTING_PROCESS_ERROR_MSG);
                }
                stage = 3; // End of minting process
                isExternalAcListening = false;
            }
        });
    });
    
}

export default tokenCommands;
