// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const ERC20TOKEN = await ethers.getContractFactory("DUMMY");
    const ERC20Yoc1 = await ERC20TOKEN.deploy("Dummy Token for staking", "DUMMY2");
    await ERC20Yoc1.deployed();
    console.log("ERC20Yoc1 Address: ", ERC20Yoc1.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });