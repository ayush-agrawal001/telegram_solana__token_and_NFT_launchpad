import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { bot, walletPassword } from "../botCode";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import dbFunction, { getIsWallet, isWallet } from "../db/dbFunction";
import { Context } from "telegraf";
import pTimeout from "p-timeout";
import { conn } from "..";
import { creatingTokenMint } from "./token/createToken";
import { TokenInfo } from "./token/getMetadataFromUser";
import createNFTCollection, { NFTInfo } from "./NFTs/createNFTCollection";
import createRegularNFT from "./NFTs/createNFT";
import bcrypt from "bcrypt";
import userModel from "../db/dbSchema";

async function walletGenerate(){
    const mnemonic = generateMnemonic();
    const masterSeed = mnemonicToSeedSync(mnemonic);
    const derivedSeed = derivePath("m/44'/501'/0'/0'", masterSeed.toString("hex")).key
    const userKeypair = Keypair.fromSeed(derivedSeed);
    const userPubkey = userKeypair.publicKey.toBase58();    
    
    if(walletPassword.userName !== ""){
        const password = walletPassword.password;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password + userKeypair.secretKey.toString(), salt);
        await userModel.updateOne({userName : walletPassword.userName}, {$set : {walletPrivateKeyHash : hashedPassword}})
        await userModel.updateOne({userName : walletPassword.userName}, {$set : {walletAddress : userPubkey}})
    }

    return ({mnemonic, userKeypair, userPubkey});
}

export async function balanceFromWallet(userPubkey : PublicKey) : Promise<number> {    
    try {
        const balance = await conn.getBalance(userPubkey);
        return balance;
    } catch (error) {
        console.error(error);
        return 0;
    }
}

let userKeypair : Keypair;

const warningMessage = `
⚠️ Warning: Sensitive Information ⚠️

By selecting "Show Private Key" below, you will be revealing the private key of your new wallet. This key is highly sensitive and should be kept secure. Anyone who gains access to your private key can take full control of your wallet and assets.
Proceed only if you are in a secure environment and ready to store your private key safely. Sharing or exposing this key to others could result in the permanent loss of your funds.
Stay safe and protect your assets!
`

export default async function walletCommands(){    
    bot.command("createWallet",  async (ctx) : Promise<void> => {
        try{
            await ctx.reply(warningMessage, {
                reply_markup : {
                    inline_keyboard : [
                        [{text : "Show Private Key Seed phrase and Public key", callback_data : 'ShowPvtKey'}],
                        [{text : "Show only Public key", callback_data : 'ShowPubKeyOnly'}]
                    ]
                }
            })}
        catch(error){
            console.log(error);
        }
    })

    const walletInfo = await walletGenerate();
    userKeypair = walletInfo.userKeypair;

    bot.action("ShowPvtKey", async (ctx) => {
        ctx.editMessageText(`
            Private Key :-

${walletInfo.mnemonic}`, {
            reply_markup : {
                inline_keyboard : [
                    [{text : "Delete Private Key Seed phrase Chat ", callback_data : 'deletePrivateKeyChat'}],
                ]
            }
        });
        
        bot.action("deletePrivateKeyChat", (ctx) => {
            ctx.editMessageText('Deleted Private key chat.')
        })
        
        ctx.telegram.sendMessage(`${ctx.chat?.id}`, "Public id :-");
        
        setTimeout(() => ctx.reply(`\`${walletInfo.userPubkey}\` tap to copy`, {parse_mode : "MarkdownV2"}), 1000)
        setTimeout(() => ctx.reply(`🎉 Your wallet has been created successfully! Start by depositing 1 SOL and use the /createToken command to create your token. 🚀`), 2000)
        isWallet(ctx.from.username!);
    })

    bot.action("ShowPubKeyOnly", (ctx) => {
        ctx.editMessageText("Public id :-");
        setTimeout(() => ctx.reply(`\`${walletInfo.userPubkey}\` tap to copy`, {parse_mode : "MarkdownV2"}), 1000)
        setTimeout(() => ctx.reply(`🎉 Your wallet has been created successfully! Start by depositing 1 SOL and use the /createToken command to create your token. 🚀`), 2000)
        isWallet(ctx.from.username!);
    })

}

interface nftOrToken {
    nftCollectible? : boolean, 
    token? : boolean
    nftRegular? : boolean
}

let isYes = false;

export async function confirmWalletDeduction({ nftCollectible, nftRegular , token } : nftOrToken ,ctx : Context, tokenMetadata : TokenInfo | NFTInfo) {
    
    const confirmMessage = await ctx.reply("This action will deduct some Solana from your account. Are you sure you want to proceed?", {
        reply_markup : {
            inline_keyboard : [
                [{text : "Yes", callback_data : "yesCreate"}, {text : "No", callback_data : "exitCommand"}],
            ]
        }
    })

    bot.action("yesCreate", async (ctx) => {
        ctx.deleteMessage(confirmMessage.message_id);
        isYes = true;
        const { message_id } = await ctx.reply(`⛓️ Syncing with the blockchain... Web3 runs on trustless networks, so a few extra seconds now means a safer, decentralized future! While we connect, here’s a pro tip: patience is your best crypto!`);
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
        }else{
            console.log("break");
        }
        if (token) {
            try {
                const result = await pTimeout(creatingTokenMint(tokenMetadata as TokenInfo), {milliseconds : 90000});
                if (result) {
                    await ctx.deleteMessage(message_id);
                    await dbFunction(String(ctx.from.username), { token: true });
                }
                ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                ctx.reply(result.link)
                ctx.reply("Operation completed successfully.");
            } catch (error) {
                console.error("Error during operation:", error);
                ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
            }
        }else if(nftCollectible){
            try {
                const result = await pTimeout(createNFTCollection(tokenMetadata), {milliseconds : 90000});
                if (result) {
                    await ctx.deleteMessage(message_id);
                    await dbFunction(String(ctx.from.username), { nft: true });
                }
                ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                ctx.reply(result.link)
                ctx.reply("Operation completed successfully.");
            } catch (error) {
                console.error("Error during operation:", error);
                ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
            }
        }else if (nftRegular) {
            try {
                const result = await pTimeout(createRegularNFT(tokenMetadata), {milliseconds : 90000});
                if (result) {
                    await ctx.deleteMessage(message_id);
                    await dbFunction(String(ctx.from.username), { nft: true });
                }
                ctx.reply(`Deducted SOL amount ${result.minimumRequired/LAMPORTS_PER_SOL}`);
                ctx.reply(result.link)
                ctx.reply("Operation completed successfully.");
            } catch (error) {
                console.error("Error during operation:", error);
                ctx.reply("Sorry, the operation took too long and timed out. Please try again later.");
            }
        }
    });

    bot.action("exitCommand", (ctx) => {
        ctx.deleteMessage(confirmMessage.message_id);
        isYes = false;
        ctx.reply("Ok 🥲👍");
        ctx.answerCbQuery("Ok 🥲👍");
    })
    console.log(isYes);
    return isYes;    
}

export {userKeypair};