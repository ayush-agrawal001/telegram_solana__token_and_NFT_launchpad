import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import walletCommands, { userKeypair } from "./wallet";
import { createMint, ExtensionType, getMinimumBalanceForRentExemptMint, getMintLen } from "@solana/spl-token"
import { airdropIfRequired, getExplorerLink } from "@solana-developers/helpers";
import { bot } from "../botCode";
import { addUser, getIsWallet } from "../db/dbFunction";
import { Context } from "telegraf";
import { message } from "telegraf/filters";

async function creatingTokenMint(){
    const conn = new Connection("http://127.0.0.1:8899");
    
    await  airdropIfRequired(conn, userKeypair!.publicKey, 10 * LAMPORTS_PER_SOL, 1 * LAMPORTS_PER_SOL);
    
    const balance = await conn.getBalance(userKeypair!.publicKey);
    const mintLength = getMintLen([ExtensionType.MetadataPointer]);  
    const minimumRequired = await conn.getMinimumBalanceForRentExemption(mintLength);
    
    
    const tokenMint = await createMint(conn, userKeypair!, userKeypair!.publicKey, null , 9); //Mint account
    const link = getExplorerLink("address", tokenMint.toString(), 'localnet');
    console.log(link);
    return link;
}

async function getMetadataFromUser(ctx : Context) {
    let tokenName : string;
    let symbol : string;
    let description : string;
    let decimals : number;
    let imgUrl : string;
    let imageBuffer : Buffer[];

    await ctx.reply("Enter the name for your token (e.g., 'MyToken').(Not more then 32 characters)");
    let stopEaring = false;
    bot.on(message("text"), ctx => {
        if (stopEaring === false) {
            if (ctx.message.text.length > 32) {
                return ctx.reply("Please enter Token name less then 32 characters");
            }
            tokenName = ctx.message.text;
            ctx.reply("Enter short symbol or ticker you would like to give to your token? (Please reply in text under 10 characters only)");  
            stopEaring = true;
        }
    })

    console.log(stopEaring);

    // if (stopEaring === true) {
    //     bot.on(message("text"), ctx => {
    //         if (ctx.message.text.length > 10) {
    //             ctx.reply("Please enter symbol less then 10 characters");
    //             return;
    //         }
    //         symbol = ctx.message.text;
    //         ctx.reply("Add a short description for your token. What makes it unique?");
    //         bot.on(message("text"), ctx => {
    //             if (ctx.message.text.length > 200) {
    //                 ctx.answerCbQuery("Please enter description less then 200 characters");
    //                 return;
    //             }
    //             description = ctx.message.text;
    //             ctx.reply("How many decimal places should your token support? (Typically between 0-18)");
    //             bot.on(message("text"), ctx => {
    //                 if (!parseInt(ctx.message.text)) {
    //                     ctx.reply("Not a number");
    //                 }
    //             })
    //         })
    //     })
    // }
}

async function tokenCommands() {
    bot.command("createToken",async (ctx) => {
        await addUser(ctx.from.username!);
        
        await getMetadataFromUser(ctx);

        ctx.reply("This action will deduct some Solana from your account. Are you sure you want to proceed?", {
            reply_markup : {
                inline_keyboard : [
                    [{text : "Yes", callback_data : "yesCreate"}, {text : "No", callback_data : "exitCommand"}],
                ]
            }
        })

        bot.action("yesCreate", async (ctx) => {
            ctx.reply(`⚠️ This may take a moment—so while you wait, check out this fun fact about patience!

Did you know that the average bamboo plant takes about five years to start growing above ground, but once it does, it can grow up to three feet in a single day? Patience is like that—sometimes, the best things take a little time, but the payoff is worth the wait!

So remember, a little patience now will soon reward you with your favorite token! 🌱💫`);
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
            await creatingTokenMint();
            const link = await creatingTokenMint();
            ctx.reply(link)
        });

        bot.action("exitCommand", (ctx) => {
            ctx.reply("Ok 🥲👍");
            ctx.answerCbQuery("Ok 🥲👍");
        })


    })

}

export default tokenCommands;