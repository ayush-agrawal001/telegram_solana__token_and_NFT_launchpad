import e , {Express, Request, Response} from "express";
import { configDotenv } from "dotenv";
import botCommands from "./botCode.js";
import mongoose from "mongoose";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import botWalletCommands from "./botWalletCommands.js";

const app : Express = e();
const port = 3000;
configDotenv();

mongoose.connect(String(process.env.MONGOOSE_URL));

export const conn = new Connection(clusterApiUrl('devnet'));
export const devUserKeypair = Keypair.fromSecretKey(new Uint8Array([105, 136, 100, 179, 134, 121, 44, 196, 72, 166, 132, 241, 129, 226, 91, 243, 187, 8, 190, 240, 28, 108, 207, 9, 206, 102, 113, 235, 166, 2, 205, 8, 33, 55, 168, 2, 75, 165, 70, 86, 170, 30, 230, 172, 132, 107, 56, 192, 57, 152, 214, 40, 117, 27, 152, 221, 31, 43, 126, 119, 78, 132, 20, 231]));


app.get("/", (req : Request, res : Response) => {
    res.send("Hello");
});
    
botCommands(); 


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
