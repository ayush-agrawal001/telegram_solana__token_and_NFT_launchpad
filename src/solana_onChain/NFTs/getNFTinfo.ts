import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { Context } from "telegraf";
import { confirmWalletDeduction } from "../wallet";
import { NFTInfo } from "./createNFTCollection";

export let nftInfo: NFTInfo;
let nftStage = 1;

nftInfo = {
    tokenName: "",
    symbol: "",
    description: "",
    imgUrl: "",
    collectibleId: "", // New field for collectible public ID
};

const isValidUrl = (urlString: string) => {
    const urlPattern = new RegExp('^(https?:\\/\\/)?'+
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+
        '((\\d{1,3}\\.){3}\\d{1,3}))'+
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+
        '(\\?[;&a-z\\d%_.~+=-]*)?'+
        '(\\#[-a-z\\d_]*)?$','i');
    return urlPattern.test(urlString);
}

export async function getNFTMetadata(ctx: Context) {
    await ctx.reply("Ready to add an NFT to your collection?", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes", callback_data: "YesAddNFT" }, { text: "No", callback_data: "NoAddNFT" }]
            ]
        }
    });

    bot.action("NoAddNFT", ctx => {
        ctx.reply("Alright, NFT collection is complete!");
        ctx.answerCbQuery("NFT collection complete.");
    });

    bot.action("YesAddNFT", async (ctx) => {
        await ctx.reply("Enter the name of your NFT (under 32 characters).");
        await ctx.answerCbQuery("Let's Go");

        bot.on(message("text"), async (ctx) => {
            const inputText = ctx.message.text;

            function switchCase(condition: boolean, messageText: string, warningText: string, fieldType: string, goBackStage: number, nextStage: number) {
                if (condition) {
                    ctx.reply(warningText);
                } else {
                    setTimeout(async () => await ctx.reply(messageText, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Go Back", callback_data: `goBack${goBackStage}` }]
                            ]
                        }
                    }), 100);
                    nftStage = nextStage;
                    bot.action(`goBack${goBackStage}`, (ctx) => {
                        nftStage -= 1;
                        ctx.reply(`Please re-enter the ${fieldType}.`);
                        ctx.answerCbQuery(`Re-enter ${fieldType}`);
                    });
                }
            }

            switch (nftStage) {
                case 1: // Step 1: Get NFT name
                    switchCase(
                        (inputText.length > 32),
                        "Enter a unique symbol for this NFT (under 10 characters).",
                        "Please enter an NFT name with less than 32 characters.",
                        "NFT name",
                        1,
                        2
                    );
                    nftInfo.tokenName = inputText;
                    break;

                case 2: // Step 2: Get symbol
                    switchCase(
                        (inputText.length > 10),
                        "Describe your NFT in a few words (under 200 characters).",
                        "Please enter a symbol with less than 10 characters.",
                        "symbol",
                        2,
                        3
                    );
                    nftInfo.symbol = inputText;
                    break;

                case 3: // Step 3: Get description
                    switchCase(
                        (inputText.length > 200),
                        "Please provide a URL for the NFT image.",
                        "Please enter a description with less than 200 characters.",
                        "description",
                        3,
                        4
                    );
                    nftInfo.description = inputText;
                    break;

                case 4: // Step 4: Get Image URL
                    if (!isValidUrl(inputText)) {
                        ctx.reply("Please enter a valid URL for the image.");
                    } else {
                        nftInfo.imgUrl = inputText;
                        nftStage = 5;
                        await ctx.reply("Enter the collectible public ID.");
                    }
                    break;

                case 5: // Step 5: Get Collectible Public ID
                    nftInfo.collectibleId = inputText;
                    await confirmWalletDeduction({ nftRegular: true }, ctx, nftInfo);
                    nftStage = 6;
                    break;

                case 6:
                    ctx.reply("Your NFT metadata has been recorded! Would you like to add another NFT?", {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "Yes", callback_data: "YesAddMoreNFT" }, { text: "No", callback_data: "NoMoreNFT" }]
                            ]
                        }
                    });
                    nftStage = 1; // Reset stage for next NFT if needed
                    bot.action("YesAddMoreNFT", async (ctx) => {
                        ctx.reply("Let's add another NFT! Enter the name of your new NFT.");
                        nftStage = 1;
                        nftInfo = { tokenName: "", symbol: "", description: "", imgUrl: "", collectibleId: "" };
                        await ctx.answerCbQuery("Add more NFT");
                    });
                    bot.action("NoMoreNFT", (ctx) => {
                        ctx.reply("All NFTs have been added. Thank you!");
                        ctx.answerCbQuery("Collection complete!");
                    });
                    break;
            }
        });
    });
}
