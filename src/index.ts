import e , {Express, Request, Response} from "express";
import { configDotenv } from "dotenv";
import botCommands from "./botCode.js";
import mongoose from "mongoose";
import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";

const app : Express = e();
const port = 3000;
configDotenv();

mongoose.connect(String(process.env.MONGOOSE_URL));

export const conn = new Connection(clusterApiUrl('devnet'));
export const devUserKeypair = Keypair.fromSecretKey(new Uint8Array());


app.get("/", (req : Request, res : Response) => {
    res.send("Hello");
});

botCommands(); 

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
