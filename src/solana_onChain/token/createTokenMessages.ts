// messages.js

// Message constants
export const MINT_TOKEN_DESTINATION_MSG = `💰 Mint Token Destination
Please specify the account you’d like to mint the token to:`;

export const INSUFFICIENT_BALANCE_MSG = "This command requires SOL on your account. Start by airdropping some SOL to:";

export const ENTER_PUBLIC_KEY_MSG = "🔗 Enter the public address of the recipient to send the token:";

export const ENTER_MINT_AMOUNT_MSG = "💸 How much would you like to mint?";

export const INVALID_PUBLIC_KEY_MSG = "❌ Invalid public key format. Please enter a valid base58 string.";

export const INVALID_AMOUNT_MSG = "Please enter a valid number greater than zero.";

export const MINT_SUCCESS_MSG = (tokenName : string , pubKey : string) => `🎉 Congratulations!
You’ve successfully minted ${tokenName} tokens to ${pubKey}! 🎊`;

export const MINT_ERROR_MSG = (tokenName : string) => `⚠️ Minting Error
Failed to mint ${tokenName}. Please check your inputs and try again.`;

export const MINTING_PROCESS_ERROR_MSG = "Something went wrong while minting the token. Please try again.";


export const WARNING_MESSAGE_IMAGE_UPLOAD = `Note for Image Upload:
            
File Size Limit: Maximum 5 MB

👇Important👇:

Uploading larger files may lead to a loss of image resolution and affect your ⛏️ NFT minting ⛏️ or 🪙 token utility 🪙.
For optimal quality and seamless integration with decentralized platforms, please ensure your images are within the specified size limit.

🙏Thank you🙏!`;

