const { Contract, constants } = require("ethers");
const { ethers } = require("hardhat");
const { MaxUint256, AddressZero, Zero } = constants;

const bigNum = num => (num + '0'.repeat(18));
const smallNum = num => (parseInt(num) / bigNum(1));
const bigNum_6 = num => (num + '0'.repeat(6));
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

async function main() {
    const BNBPriceFeedAddress = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526";

    // Deploy your contract and pass BNBPriceFeedAddress to the constructor
    const BNBPriceContract = await ethers.getContractFactory("BNBPriceContract");
    const bnbPriceInstance = await BNBPriceContract.deploy(BNBPriceFeedAddress);

    await bnbPriceInstance.deployed();
    console.log("deployed:", bnbPriceInstance.address)
    await hre.run('verify:verify', {
        address: bnbPriceInstance.address,
        contract: 'contracts/BNBPrice.sol:BNBPriceContract',
        constructorArguments: ['0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526'],
        libraries: {}
    });

    const price = await bnbPriceInstance.getBNBPrice();
    console.log(price)
    console.log(smallNum(price))

    console.log("BNB/USD Price:", price.toString());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });