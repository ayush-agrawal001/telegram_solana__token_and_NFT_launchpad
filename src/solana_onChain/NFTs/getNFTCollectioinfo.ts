import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { confirmWalletDeduction } from "../wallet";
import { Context } from "telegraf";
import { NFTInfo } from "./createNFTCollection";

let nftStage = 1;

export let nftCollectionInfo: NFTInfo;

nftCollectionInfo = {
    tokenName: "",
    symbol: "",
    description: "",
    imgUrl: "",
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

export async function getNFTCollectionMetadata(ctx: Context) {
    await ctx.reply("Are you sure you want to create an NFT collection?", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Yes", callback_data: "YesCreateNFT" }, { text: "No", callback_data: "NoDontCreateNFT" }]
            ]
        }
    });

    bot.action("NoDontCreateNFT", ctx => {
        ctx.reply("Okay, maybe later! 👍");
        ctx.answerCbQuery("Okay, maybe later!");
    });

    bot.action("YesCreateNFT", async (ctx) => {
        await ctx.reply("Enter the name of your NFT collection (under 32 characters).");
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
                case 1: // Step 1: Get collection name
                    switchCase(
                        (inputText.length > 32),
                        "Enter a short symbol for the NFT collection (under 10 characters).",
                        "Please enter a collection name with less than 32 characters.",
                        "collection name",
                        1,
                        2
                    );
                    nftCollectionInfo.tokenName = inputText;
                    break;

                case 2: // Step 2: Get symbol
                    switchCase(
                        (inputText.length > 10),
                        "Describe your NFT collection in a few words (under 200 characters).",
                        "Please enter a symbol with less than 10 characters.",
                        "symbol",
                        2,
                        3
                    );
                    nftCollectionInfo.symbol = inputText;
                    break;

                case 3: // Step 3: Get description
                    switchCase(
                        (inputText.length > 200),
                        "Please provide a permanent storage URL for the collection image.",
                        "Please enter a description with less than 200 characters.",
                        "description",
                        3,
                        4
                    );
                    nftCollectionInfo.description = inputText;
                    break;

                case 4: // Step 4: Get Image URL
                    if (!isValidUrl(inputText)) {
                        ctx.reply("Please enter a valid URL for the image.");
                    } else {
                        nftCollectionInfo.imgUrl = inputText;
                        await confirmWalletDeduction({nft : true} ,ctx, nftCollectionInfo);
                        nftStage = 5;
                    }
                    break;

                case 5:
                    ctx.reply("Your NFT collection metadata has been recorded!");
                    console.log(nftCollectionInfo);
                    break;
            }
        });
    });
    return nftCollectionInfo;
}
