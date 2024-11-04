import e , {Express, Request, Response} from "express";
import { configDotenv } from "dotenv";
import botCommands from "./botCode.js";
import mongoose from "mongoose";

const app : Express = e();
const port = 3000;
configDotenv();

mongoose.connect(String(process.env.MONGOOSE_URL));



app.get("/", (req : Request, res : Response) => {
    res.send("Hello");
});

botCommands(); 

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
