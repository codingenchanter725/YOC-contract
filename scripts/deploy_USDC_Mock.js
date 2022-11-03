// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

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