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
            await addUser(userName);
            return -1;
        }else if(user){
            return user.imgUses;
        }
    } catch (error) {
        console.log(error)
    }
}

export {getImageUse, addUser};
export default dbFunction;