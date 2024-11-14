import e , {Express, Request, Response} from "express";
import botCommands from "./botCode.js";
import mongoose from "mongoose";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import path, {dirname , resolve} from "path";
import dotenv from "dotenv";
import { fileURLToPath  } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({path : resolve(__dirname, "../.env")});

if (!process.env.MONGOOSE_URL) {
    throw Error("No Mongoose url found")
}

export const app : Express = e();
const port = 3000;

mongoose.connect(String(process.env.MONGOOSE_URL));

export const conn = new Connection(clusterApiUrl("devnet"));


app.get("/", (req : Request, res : Response) => {
    res.send("Hello");
});
    
botCommands(); 


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
