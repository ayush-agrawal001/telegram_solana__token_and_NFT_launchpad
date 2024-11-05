import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    userName : {type : String, unique : true},
    imgUses : {type : Number, default : 0},
    TokenMinted : {type : Number, default : 0},
    NFTMinted : {type : Number, default : 0},
    isWallet : {type : Boolean, default : false},
})

const userModel = mongoose.model("user", userSchema);
export default userModel;