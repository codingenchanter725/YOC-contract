// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const ERC20TOKEN = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20");
    const ERC20Yoc1 = await ERC20TOKEN.deploy("Yoc1", "Yoc1 FoundersCoin");
    await ERC20Yoc1.deployed();
    console.log("ERC20Yoc1 Address: ", ERC20Yoc1.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });