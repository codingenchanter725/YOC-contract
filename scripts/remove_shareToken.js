// import { ethers } from "ethers";

const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    await ethers.getContractAt("YOC", "0x517547C300891C0858dDC1F1694269997a4BFc89", deployer);
    const USDC = await ethers.getContractFactory("USDC");
    const USDC_addr = await USDC.deploy();
    console.log("Mock USDC Address: ", USDC_addr.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });