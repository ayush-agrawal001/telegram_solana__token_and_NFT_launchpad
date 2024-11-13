import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    userName : {type : String, unique : true, required : true},
    imgUses : {type : Number, default : 0},
    TokenMinted : {type : Number, default : 0},
    NFTMinted : {type : Number, default : 0},
    isWallet : {type : Boolean, default : false},
    walletAddress : {type : String, default : ""},
    walletSecretKey : {type : String, default : ""},
    passwordHash : {type : String, default : ""},
    walletMnemonic : {type : String, default : ""}
})

const userModel = mongoose.model("user", userSchema);
export default userModel;