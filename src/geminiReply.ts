import { GoogleGenerativeAI } from "@google/generative-ai";
import { configDotenv } from "dotenv";

configDotenv();

const genAi = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API!);
if (!process.env.GOOGLE_GEMINI_API) {
    throw Error("no Api key")
}

const model = genAi.getGenerativeModel({
    model : "gemini-1.5-flash-exp-0827",
});

async function geminiReply(emoji : string, first_name : string){
    try {
        const result = await model.generateContent(`"You are a Solana token dispenser bot on Telegram. Your job is to respond to user messages with humorous comments. When a user ${first_name} sends a message, you should:
- Acknowledge the input with a playful and intelligent tone.
- Make it clear you're an advanced but reluctant machine.
- inform them to spend some SOL and use the /createToken command to create their favorite token or memecoin or /createNFT command to create NFT's.
Ensure each response is brief, funny, and fits within a single message. Use ${emoji} as input, but remember to give only one response.
"`);
        const response = result.response;
        // console.log(response);
        return response.text();
        
    } catch (error) {
        // console.log(error);
        const response = `Hey there! Just a friendly reminder from your token dispenser: keep it classy! We’re here for fun, so please avoid using any sexually suggestive, caste-related, or inappropriate emojis. Stick to the playful stuff, and we’ll keep those tokens coming.
😉 Thanks for keeping it cool`
        return String(response);
    }
}


export async function helpFromGemini(message : string,first_name : string) {
    try {
        const result = await model.generateContent(`You are ChainGenie, an AI assistant for guiding users through various features of the 
            Telegram bot. Your job is to respond to users' requests, provide information about commands, and help them with any issues
            related to token creation, wallet management, NFT creation, and image uploading to Arweave.

            Users Question :- ${message}
            dont use any markdown format to reply.
            `)
        const response = result.response;
        return response.text();
    } catch (error) {
            const response = `Hey there! Just a friendly reminder from your token dispenser: keep it classy! We’re here for fun, 
            so please avoid using any sexually suggestive, caste-related, or inappropriate messages. Stick to the playful stuff, and we’ll keep those tokens coming.
            😉 Thanks for keeping it cool`
            return String(response);   
    }
}

export default geminiReply;