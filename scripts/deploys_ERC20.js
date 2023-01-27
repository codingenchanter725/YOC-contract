// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    for (let index = 1; index <= 5; index++) {
        const _ERC20YocToken = await ethers.getContractFactory("TOKEN");
        const ERC20YocToken = await _ERC20YocToken.deploy("YOC-FoundersCoin for Liquidity", `YOC${index}`);
        await ERC20YocToken.deployed();
        console.log(`ERC20YocToken${index} Address: `, ERC20YocToken.address);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });