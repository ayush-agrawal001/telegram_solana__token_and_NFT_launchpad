import { Keypair } from "@solana/web3.js";
import { bot } from "../botCode";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { addUser, isWallet } from "../db/dbFunction";

function walletGenerate(){
    const mnemonic = generateMnemonic();
    const masterSeed = mnemonicToSeedSync(mnemonic);
    const derivedSeed = derivePath("m/44'/501'/0'/0'", masterSeed.toString("hex")).key
    const userKeypair = Keypair.fromSeed(derivedSeed);
    const userPubkey = userKeypair.publicKey.toBase58();    

    return ({mnemonic, userKeypair, userPubkey});
}

let userKeypair;

export default function walletCommands(){    
    bot.command("createWallet",  async (ctx) : Promise<void> => {
        await addUser(ctx.from.username!);
        try{
            await ctx.reply(`⚠️ Warning: Sensitive Information ⚠️

By selecting "Show Private Key" below, you will be revealing the private key of your new wallet. This key is highly sensitive and should be kept secure. Anyone who gains access to your private key can take full control of your wallet and assets.

Proceed only if you are in a secure environment and ready to store your private key safely. Sharing or exposing this key to others could result in the permanent loss of your funds.

Stay safe and protect your assets!
            `, {
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

    const walletInfo = walletGenerate();
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

export {userKeypair};