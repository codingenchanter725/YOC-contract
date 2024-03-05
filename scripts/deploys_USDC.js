// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const USDCFactory = await ethers.getContractFactory("USDC");
    const USDC = await USDCFactory.deploy();
    await USDC.deployed();
    await USDC.deployTransaction.wait(5);
    await contractVerify(USDC.address, "USDC");
    console.log("USDC Address: ", USDC.address);
}

async function contractVerify(address, contract, constructorArguments = [], libraries = {}) {
    try {
        let contractOfContract = `contracts/${contract}.sol:${contract}`;
        if (contract == "YOCMasterChef") contractOfContract = `contracts/YocFarming.sol:${contract}`;
        if (contract == "ERC20_TOKEN") contractOfContract = `contracts/ERC20_TOKEN1.sol:${contract}`;
        await hre.run('verify:verify', {
            address: address,
            contract: contractOfContract,
            constructorArguments,
            libraries
        })
    } catch (err) {
        // console.log("Error occurs!")
        console.log(err);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });