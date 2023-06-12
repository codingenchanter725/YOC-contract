// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());

    // const USDC = await ethers.getContractFactory("USDC");
    // const USDC_addr = await USDC.deploy();
    // await USDC_addr.deployed();
    // console.log("YOC Address: ", USDC_addr.address);

    const Token = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20")
    const testToken0 = await Token.deploy("TEST1", "TEST1");
    console.log(testToken0.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });