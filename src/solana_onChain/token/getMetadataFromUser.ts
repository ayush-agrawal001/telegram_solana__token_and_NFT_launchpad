import { message } from "telegraf/filters";
import { bot } from "../../botCode";
import { confirmWalletDeduction } from "../wallet";
import { Context } from "telegraf";

const isValidUrl = (urlString : string)=> {
    var urlPattern = new RegExp('^(https?:\\/\\/)?'+ // validate protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // validate domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // validate OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // validate port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // validate query string
  '(\\#[-a-z\\d_]*)?$','i'); // validate fragment locator
return !urlPattern.test(urlString);
}

export interface TokenInfo {
    tokenName : string;
    symbol : string;
    description : string;
    decimals : number;
    imgUrl : string;
}
let stage = 1;
export let tokenInfo : TokenInfo;
tokenInfo = {
    tokenName: "",
    symbol: "",
    description: "",
    decimals: 9,
    imgUrl: "",
};

export async function getMetadataFromUser(ctx : Context) {  
    await ctx.reply("Are you sure you want to create token ?", {
        reply_markup : {
            inline_keyboard : [
                [{text : "Yes", callback_data : "YesCreateToken"}, {text : "No", callback_data : "NoDontCreateToken"}]
            ]
        }
    })

    bot.action("NoDontCreateToken", ctx => {
        ctx.reply("ok 🥲👍");
        ctx.answerCbQuery("ok 🥲👍");
    })

    bot.action("YesCreateToken", async (ctx) => {
        await ctx.reply("Enter the name for your token (e.g., 'MyToken').(Not more then 32 characters)");
        await ctx.answerCbQuery("Let's Go");
        bot.on(message("text"), async (ctx) => {
            const inputText = ctx.message.text;

        function switchCase(condition : boolean, messageText : string, PrevWarningText : string, goBackType : string, goBackCaseNo : number, upgradeTo : number){
            try {
                
                if (condition) {
                    return ctx.reply(PrevWarningText);
                }
                setTimeout(async () => await ctx.reply(messageText, {
                    reply_markup : {
                        inline_keyboard : [
                            [{text : "Go Back", callback_data : `goBack${goBackCaseNo}`}]
                        ]
                    }
                }), 100);
                stage = upgradeTo;
                bot.action(`goBack${goBackCaseNo}`, (ctx) => {
                    stage -= 1;
                    ctx.reply(`Enter ${goBackType} again`, ((goBackCaseNo !== 1) ? {
                        reply_markup : {
                            inline_keyboard : [
                                [{text : "Go Back", callback_data : `goBack${goBackCaseNo-1}`}]
                            ]
                        }
                    } : {}));
                    ctx.answerCbQuery(`Enter ${goBackType} again`);
                })
            } catch (error) {
                console.log(error);
            }
        }

        switch (stage) {
            case 1: // Step 1: Get token name
                switchCase(
                    (inputText.length > 32), 
                    "Enter a short symbol or ticker for your token (under 10 characters).",
                    "Please enter a token name with less than 32 characters.",
                    "name",
                    1,
                    2
                )
                tokenInfo.tokenName = inputText;
                break;

            case 2: // Step 2: Get symbol
                switchCase(
                    (inputText.length > 10),
                    "Add a short description for your token. What makes it unique? (Under 200 characters)",
                    "Please enter a symbol with less than 10 characters.",
                    "symbol",
                    2,
                    3
                )
                tokenInfo.symbol = inputText;
                break;

            case 3: // Step 3: Get description
                switchCase(
                    (inputText.length > 200),
                    "How many decimal places should your token support? (Typically between 0-18)",
                    "Please enter a description with less than 200 characters.",
                    "Description",
                    3,
                    4
                )
                tokenInfo.description = inputText;
                break;

            case 4: // Step 4: Get decimals
                const decimalsInput = parseInt(inputText);
                switchCase(
                    (isNaN(decimalsInput) || decimalsInput < 0 || decimalsInput > 18),
                    "Please enter permanent storage URL for the Token image.",
                    "Please enter a valid number between 0 and 18 for decimal places.",
                    "Decimal",
                    4,
                    5
                )
                tokenInfo.decimals = decimalsInput;
                break;
            case 5: // Step 5: Get Image URL
                switchCase(
                    isValidUrl(inputText),
                    "Reupload the Image",
                    "Please Enter a valid URL",
                    "Image URL",
                    5,
                    6
                )
                !isValidUrl(inputText) ? await confirmWalletDeduction({token : true},ctx, tokenInfo) : {};
                tokenInfo.imgUrl = inputText;
                console.log(tokenInfo);
                break;

            case 6:
                ctx.reply("We got your metadata!!!");
                break;
        }
    });
    })
    return tokenInfo;
}
