const { Contract, constants } = require("ethers");
const { ethers } = require("hardhat");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92";

const overrides = {
    gasLimit: 9999999
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const projectManageFactory = await hre.ethers.getContractFactory("ProjectManage");
    const projectManageContract = await projectManageFactory.deploy();
    await projectManageContract.deployed();
    await projectManageContract.deployTransaction.wait(5);
    console.log("ProjectManage Address: ", projectManageContract.address);
    await contractVerify(projectManageContract.address, "ProjectManage");
    console.log("ProjectManage Complete!\n\n\n\n");

    const projectDetailFactory = await hre.ethers.getContractFactory("ProjectDetail");
    const projectDetailContract = await projectDetailFactory.deploy();
    await projectDetailContract.deployed();
    console.log("ProjectDetail Address: ", projectDetailContract.address);
    await projectDetailContract.deployTransaction.wait(5);
    await contractVerify(projectDetailContract.address, "ProjectDetail");
    console.log("ProjectDetail Complete!\n\n\n\n");

    const USDCFactory = await hre.ethers.getContractFactory("USDC");
    const USDCContract = await USDCFactory.deploy();
    await USDCContract.deployed();
    console.log("USDC Address: ", USDCContract.address);
    await USDCContract.deployTransaction.wait(5);
    await contractVerify(USDCContract.address, "USDC");
    console.log("USDC Complete!\n\n\n\n");

    const yocFactory = await hre.ethers.getContractFactory("YOC");
    const yocContract = await yocFactory.deploy("YOC-Global", "YOCe", 16);
    await yocContract.deployed();
    console.log("YOC Address: ", yocContract.address);
    await yocContract.deployTransaction.wait(5);
    await contractVerify(yocContract.address, "YOC-Global", "YOCe", 16);
    await contractVerify(yocContract.address, "YOC", ["YOC-Global", "YOCe", 16]);
    console.log("YOC Complete!\n\n\n\n");

    const yocswapFactory = await hre.ethers.getContractFactory("YocswapFactory");
    const yocswapContract = await yocswapFactory.deploy(deployer.address);
    await yocswapContract.deployed();
    console.log("yocswapContract Address:", yocswapContract.address);
    console.log("yocswapContract INIT_CODE_PAIR_HASH: ", await yocswapContract.INIT_CODE_PAIR_HASH());
    await yocswapContract.deployTransaction.wait(5);
    await contractVerify(yocswapContract.address, 'YocswapFactory', [deployer.address]);
    console.log("yocswapContract Complete!\n\n\n\n");

    // /* stop and again */
    // // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // // And then, please deploy the YocswapRouter contract
    const yocswapRouterFactory = await hre.ethers.getContractFactory("YocswapRouter");
    const yocswapRouterContract = await yocswapRouterFactory.deploy(yocswapContract.address, WETH_SEPOLIA);
    await yocswapRouterContract.deployed();
    console.log("YocswapRouter Address:", yocswapRouterContract.address);
    await yocswapRouterContract.deployTransaction.wait(5);
    await contractVerify(yocswapRouterContract.address, 'YocswapRouter', [yocswapContract.address, WETH_SEPOLIA]);
    console.log("yocswapRouter Complete!\n\n\n\n");

    const yocMasterChefFactory = await hre.ethers.getContractFactory("YOCMasterChef");
    const yocMasterChefContract = await yocMasterChefFactory.deploy(yocContract.address, deployer.address);
    await yocMasterChefContract.deployed();
    console.log("YocMasterChef Address:", yocMasterChefContract.address + "\n");
    await yocMasterChefContract.deployTransaction.wait(5);
    await contractVerify(yocMasterChefContract.address, 'YOCMasterChef', [yocContract.address, deployer.address]);
    console.log("YocMasterChef Complete!\n\n\n\n");
}

async function contractVerify(address, contract, constructorArguments = [], libraries = {}) {
    try {
        let contractOfContract = `contracts/${contract}.sol:${contract}`;
        if (contract == "YOCMasterChef") contractOfContract = `contracts/YocFarming.sol:${contract}`;
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