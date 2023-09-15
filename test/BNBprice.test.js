const { ethers } = require("hardhat");

const bigNum = num => (num + '0'.repeat(18));
const bigNum_8 = num => (num + '0'.repeat(8));
const bigNum_6 = num => (num + '0'.repeat(6));
const smallNum = num => (parseInt(num) / bigNum(1));
const smallNum_8 = num => (parseInt(num) / bigNum_8(1));
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

async function main() {
  // Deployed contract address
  const contractAddress = "0xAdD217F14Ce8A61b92B57272498b930F14B98335"; // Replace with the actual contract address
  
  // Get the contract instance
  const BNBPriceContract = await ethers.getContractFactory("BNBPriceContract");
  const bnbPriceInstance = await BNBPriceContract.attach(contractAddress);

  // Call the getBNBPrice function
  const price = await bnbPriceInstance.getBNBPrice();
  console.log("BNB/USD Price:", smallNum_8(price))

  console.log("BNB/USD Price:", price.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });