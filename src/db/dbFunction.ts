import userModel from "./dbSchema"

interface opt {
    img? : boolean
    nft? : boolean
    token? : boolean
}

async function dbFunction(userName : string, opt? : opt){
    
    try {
        const response = await userModel.findOne({userName : userName})
        const imgUse = response?.imgUses
        const tokenUse = response?.TokenMinted
        const NftUse = response?.NFTMinted
        
    
        if (opt?.img === true) {
            const updateResult = await userModel.updateOne({userName : userName}, {$set : {imgUses : (imgUse! + 1)}}) 
            console.log("Update result for img:", updateResult);
        }
        if (opt?.nft === true) {
            await userModel.updateOne({userName : userName}, {$set : {imgUses : (NftUse! + 1)}})
        }
        if (opt?.token === true) {
            await userModel.updateOne({userName : userName}, {$set : {imgUses : (tokenUse! + 1)}})
        }
    
    } catch (error) {
        addUser(userName)
    }
}

async function addUser(userName : string){
    
    try {
        const user = await userModel.create({
            userName : userName,
        })
        return user;
    } catch (error : any) {
        if (error.code === 11000) {
            // console.log("User already exists")
            return;
        }
        console.log(error.code);
        // throw error;
    }
}

async function getImageUse(userName : string){
    try {
        const user = await userModel.findOne({userName : userName});
        if (!user) {
            return -1;
        }else if(user){
            return user.imgUses;
        }
    } catch (error) {
        console.log(error)
    }
}

async function isWallet(userName : string) {
    try {
        await userModel.updateOne({userName : userName}, {$set : {isWallet : true}})
    } catch (error) {
        console.log(error);
    }
}

async function getIsWallet(userName : string) {
    try {
        const user = await userModel.findOne({userName : userName});
        return user;
    } catch (error) {
        console.log(error);
    }
}

export async function setWallet(userName : string, walletAddress : string, walletPrivateKey : string){
    try {
        const result = await userModel.updateOne({userName : userName}, {$set : {walletAddress : walletAddress, walletPrivateKey : walletPrivateKey}})
        if (result) {
            return 1;
        }else{
            return 0;
        }
    } catch (error) {
        console.log(error);
        return 0;
    }
}

export {getImageUse, addUser, isWallet, getIsWallet};
export default dbFunction;