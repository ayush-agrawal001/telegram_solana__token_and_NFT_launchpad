import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { bot} from "../botCode.js";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import dbFunction, { getIsWallet, isWallet } from "../db/dbFunction.js";
import { Context } from "telegraf";
import pTimeout from "p-timeout";
import { conn } from "../index.js";
import { creatingTokenMint } from "./token/createToken.js";
import { TokenInfo } from "./token/getMetadataFromUser.js";
import createNFTCollection, { NFTInfo } from "./NFTs/createNFTCollection.js";
import createRegularNFT from "./NFTs/createNFT.js";
import bcrypt from "bcrypt";
import userModel from "../db/dbSchema.js";
import { message } from "telegraf/filters";
import { Message } from "telegraf/typings/core/types/typegram";

export async function convertToKeypair(mnemonic : string) {
    try {
        const masterSeed = mnemonicToSeedSync(mnemonic);
        const derivedSeed = derivePath("m/44'/501'/0'/0'", masterSeed.toString("hex")).key
        const userKeypair = Keypair.fromSeed(derivedSeed);
        const userPubkey = userKeypair.publicKey.toBase58();
        return ({mnemonic, userKeypair, userPubkey});
    } catch (error) {
        throw error;
    }
}

async function walletGenerate(username: string){
    try {
        const mnemonic = generateMnemonic(); 
        const wallet = await convertToKeypair(mnemonic);

        await userModel.updateOne(
            {userName: username},
            {
                $set: {
                    walletSecretKey: wallet.userKeypair.secretKey,
                    walletMnemonic: mnemonic,
                    walletAddress: wallet.userPubkey
                }
            }
        );

    } catch (error) {
        console.error("Error in walletGenerate:", error);
        throw error;
    }
}

export async function balanceFromWallet(userPubkey : PublicKey) : Promise<number> {    
    try {
        const balance = await conn.getBalance(userPubkey);
        return balance;
    } catch (error) {
        console.error("Error getting wallet balance:", error);
        return 0;
    }
}


const warningMessage = `
⚠️ Warning: Sensitive Information ⚠️

By selecting "Show Private Key" below, you will be revealing the private key of your new wallet. This key is highly sensitive and should be kept secure. Anyone who gains access to your private key can take full control of your wallet and assets.
Proceed only if you are in a secure environment and ready to store your private key safely. Sharing or exposing this key to others could result in the permanent loss of your funds.
Stay safe and protect your assets!
`

    let botOn = false;
    export async function handleWalletReply(ctx: any) {
        try {
            await ctx.reply(warningMessage, {
                reply_markup : {
                    inline_keyboard : [
                        [{text : "Show Private Key Seed phrase and Public key", callback_data : 'ShowPvtKey'}],
                        [{text : "Show only Public key", callback_data : 'ShowPubKeyOnly'}]
                    ]
                }
            })
            botOn = false;
        } catch(error) {
            console.error("Error in handleWalletReply:", error);
            await ctx.reply("Something went wrong please try again later");
            botOn = false;  
        }
}

export default async function walletCommands() {
    try {
        bot.command("createwallet", async (ctx) => {
            try {
                const user = await userModel.findOne({userName : ctx.from?.username});
                
                if (user?.walletSecretKey) {
                    ctx.reply("You already have a wallet!");
                    setTimeout(() => ctx.reply(`Here is your wallet address \` ${user.walletAddress}\` `, {parse_mode : "MarkdownV2"}), 1000);
                    return;
                }

                await ctx.reply("Please enter the password")
                botOn = true;
                
                bot.on(message("text"), async (ctx, next) => {
                    try {
                        if (!botOn) {
                            return next();
                        }
                        
                        let walletInfo;
                        try {
                            walletInfo = await walletGenerate(ctx.from.username!);
                        } catch(error) {
                            console.error("Error generating wallet:", error);
                            ctx.reply("Something went wrong please try again later");
                            botOn = false;
                            return;
                        }

                        try {
                            const salt = await bcrypt.genSalt(10);
                            const hashedPassword = await bcrypt.hash(ctx.message.text, salt);
                            await userModel.updateOne(
                                {userName: ctx.from?.username},
                                {$set: {walletPrivateKeyHash: hashedPassword}}
                            );
                        } catch(error) {
                            console.error("Error storing password:", error);
                            ctx.reply("Error storing password. Please try again.");
                            botOn = false;
                            return;
                        }

                        await handleWalletReply(ctx);
                    } catch(error) {
                        console.error("Error in message handler:", error);
                        ctx.reply("An unexpected error occurred");
                        botOn = false;
                    }
                })
                
                bot.action("ShowPvtKey", async (ctx) => {
                    try {
                        const user = await userModel.findOne({userName : ctx.from?.username});
                        if (!user) {
                            ctx.reply("No wallet found. Please create one first with /createwallet");
                            return;
                        }

                        const mnemonic = user?.walletMnemonic;
                        const masterSeed = mnemonicToSeedSync(mnemonic!);
                        const derivedSeed = derivePath("m/44'/501'/0'/0'", masterSeed.toString("hex")).key
                        const walletKeypair = Keypair.fromSeed(derivedSeed);
                        const userPubkey = walletKeypair.publicKey.toBase58(); 

                        await ctx.editMessageText(`Private Key seed phrase :-${mnemonic}`, {
                            reply_markup : {
                                inline_keyboard : [
                                    [{text : "Delete Private Key Seed phrase Chat ", callback_data : 'deletePrivateKeyChat'}],
                                ]
                            }
                        });
                        
                        bot.action("deletePrivateKeyChat", (ctx) => {
                            try {
                                ctx.editMessageText('Deleted Private key chat.')
                            } catch(error) {
                                console.error("Error deleting private key chat:", error);
                            }
                        })
                        
                        await ctx.telegram.sendMessage(`${ctx.chat?.id}`, "Public id :-");
                        
                        setTimeout(() => ctx.reply(`\`${walletKeypair.publicKey.toBase58()}\` tap to copy`, {parse_mode : "MarkdownV2"}), 1000)
                        setTimeout(() => ctx.reply(`🎉 Your wallet has been created successfully! Start by depositing 1 SOL and use the /createToken command to create your token. 🚀`), 2000)
                        await isWallet(ctx.from.username!);
                    } catch(error) {
                        console.error("Error in ShowPvtKey handler:", error);
                        ctx.reply("An error occurred while showing private key");
                    }
                })
                
                bot.action("ShowPubKeyOnly", async (ctx) => {
                    try {
                        const user = await userModel.findOne({userName : ctx.from?.username});
                        const walletInfo = JSON.parse(Buffer.from(user?.walletSecretKey!, 'base64').toString());
                        const walletKeypair = Keypair.fromSecretKey(walletInfo.secretKey);
                        if (!walletInfo) {
                            ctx.reply("No wallet found. Please create one first with /createwallet");
                            return;
                        }
                        await ctx.editMessageText("Public id :-");
                        setTimeout(() => ctx.reply(`\`${walletKeypair.publicKey.toBase58()}\` tap to copy`, {parse_mode : "MarkdownV2"}), 1000)
                        setTimeout(() => ctx.reply(`🎉 Your wallet has been created successfully! Start by depositing 1 SOL and use the /createToken command to create your token. 🚀`), 2000)
                        await isWallet(ctx.from.username!);
                    } catch(error) {
                        console.error("Error in ShowPubKeyOnly handler:", error);
                        ctx.reply("An error occurred while showing public key");
                    }
                })

            } catch(error) {
                console.error("Error in createwallet command:", error);
                ctx.reply("An unexpected error occurred");
            }
        })
    } catch(error) {
        console.error("Error in walletCommands:", error);
    }
}

interface nftOrToken {
    nftCollectible? : boolean, 
    token? : boolean
    nftRegular? : boolean
}

let isYes = false;
let confirmMessage : Message;
let isListening = false;

export async function confirmWalletDeduction({ nftCollectible, nftRegular , token } : nftOrToken ,ctx : Context, tokenMetadata : TokenInfo | NFTInfo) {
    try {
        setTimeout(() => ctx.reply("🔑 Please enter your password to continue.", {reply_markup : {force_reply : true}}), 1500)
        const user = await userModel.findOne({userName : ctx.from?.username});
        if (!user) {
            ctx.reply("No wallet found. Please create one first with /createwallet");
            return;
        }

        const secretKeyBuffer = Buffer.from(user.walletSecretKey!, 'base64');
        
        isListening = true;
        bot.on(message("text"), async (ctx, next) => {
            try {
                if (!isListening) {
                    return next();
                }
                try {
                    const  result = await bcrypt.compare(ctx.message.text, user.passwordHash)
                    // console.log(ctx.message.text);
                    // console.log(result);
                    if(result){
                        confirmMessage = await ctx.reply("This action will deduct some Solana from your account. Are you sure you want to proceed?", {
                            reply_markup : {
                                inline_keyboard : [
                                    [{text : "Yes", callback_data : "yesCreate"}, {text : "No", callback_data : "exitCommand"}],
                                ]
                            }
                        })
                        isListening = false;
                    } else {
                        await ctx.reply("Wrong password")
                        await ctx.reply("Please try again", {reply_markup : {
                            force_reply : true,
                            inline_keyboard : [
                                [{text : "Cancel ❌", callback_data : "cancel"}]
                            ]
                        }})
                        isListening = false;
                    }
                } catch(error) {
                    console.error("Error in password comparison callback:", error);
                    ctx.reply("An error occurred while processing password");
                }
            } catch(error) {
                console.error("Error in message handler:", error);
                ctx.reply("An error occurred while processing message");
            }
        })

        bot.action("cancel", (ctx) => {
            try {
                ctx.reply("Ok 🤨");
                isYes = false;
                isListening = false;
            } catch(error) {
                console.error("Error in cancel action:", error);
            }
        })

        bot.action("yesCreate", async (ctx) => {
            try {
                await ctx.deleteMessage(confirmMessage.message_id);
                isYes = true;
                const { message_id } = await ctx.reply(`⛓️ Syncing with the blockchain... Web3 runs on trustless networks, so a few extra seconds now means a safer, decentralized future! While we connect, here's a pro tip: patience is your best crypto!`);
                const user = await getIsWallet(ctx.from.username!);
                if (user?.isWallet === false) {
                    await ctx.reply("No wallet account exist", {
                        reply_markup : {
                            inline_keyboard : [
                                [{text : "Generate Wallet", callback_data : "generate"}]
                            ]
                        }
                    })
                    bot.action("generate", () => walletCommands());
                    isListening = false;
                    return;
                }

                if (token) {
                    try {
                        const result = await pTimeout(creatingTokenMint(tokenMetadata as TokenInfo, ctx.from.username!), {milliseconds : 90000});
                        if (result) {
                            await ctx.deleteMessage(message_id);
                            await dbFunction(String(ctx.from.username), { token: true });
                            // await ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                            await ctx.reply(result.link);
                            await ctx.reply("Operation completed successfully.");
                            await ctx.reply("Note : Token havent been minted yet. Use /minttoken command to mint your token.");
                        }
                    } catch (error) {
                        console.error("Error during token creation:", error);
                        ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
                    }
                } else if(nftCollectible) {
                    try {
                        const result = await pTimeout(createNFTCollection(tokenMetadata, ctx.from.username!), {milliseconds : 90000});
                        if (result) {
                            await ctx.deleteMessage(message_id);
                            await dbFunction(String(ctx.from.username), { nft: true });
                            // await ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                            await ctx.reply(result.link);
                            await ctx.reply("Operation completed successfully.");
                        }
                    } catch (error) {
                        console.error("Error during NFT collection creation:", error);
                        ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
                    }
                } else if (nftRegular) {
                    try {
                        const result = await pTimeout(createRegularNFT(tokenMetadata, ctx.from.username!), {milliseconds : 90000});
                        if (result) {
                            await ctx.deleteMessage(message_id);
                            await dbFunction(String(ctx.from.username), { nft: true });
                            // await ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                            await ctx.reply(result.link);
                            await ctx.reply("Operation completed successfully.");
                        }
                    } catch (error) {
                        console.error("Error during regular NFT creation:", error);
                        ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
                    }
                }
            } catch(error) {
                console.error("Error in yesCreate action:", error);
                ctx.reply("An unexpected error occurred");
            }
        });

        bot.action("exitCommand", (ctx) => {
            try {
                ctx.deleteMessage(confirmMessage.message_id);
                isYes = false;
                ctx.reply("Ok 🥲👍");
                ctx.answerCbQuery("Ok 🥲👍");
            } catch(error) {
                console.error("Error in exitCommand action:", error);
            }
        })

        return isYes;    
    } catch(error) {
        console.error("Error in confirmWalletDeduction:", error);
        ctx.reply("An unexpected error occurred");
        return false;
    }
}

export async function hashPassAndStore(ctx : Context, password : string){
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await userModel.updateOne(
            {userName: ctx.from?.username},
            {$set: {passwordHash : hashedPassword}}
        );
    } catch(error) {
        console.error("Error in hashPassAndStore:", error);
        throw error;
    }
}
