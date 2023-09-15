const { Contract, constants } = require("ethers");
const { ethers } = require("hardhat");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

const SEPOLIA_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const BNB_FEED = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526";

const overrides = {
    gasLimit: 9999999
}

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // const projectManageFactory = await hre.ethers.getContractFactory("ProjectManage");
    // const projectManageContract = await projectManageFactory.deploy();
    // await projectManageContract.deployed();
    // await projectManageContract.deployTransaction.wait(5);
    // console.log("ProjectManage Address: ", projectManageContract.address);
    // await contractVerify(projectManageContract.address, "ProjectManage");
    // console.log("ProjectManage Complete!\n\n\n\n");

    // const projectDetailFactory = await hre.ethers.getContractFactory("ProjectDetail");
    // const projectDetailContract = await projectDetailFactory.deploy();
    // await projectDetailContract.deployed();
    // console.log("ProjectDetail Address: ", projectDetailContract.address);
    // await projectDetailContract.deployTransaction.wait(5);
    // await contractVerify(projectDetailContract.address, "ProjectDetail");
    // console.log("ProjectDetail Complete!\n\n\n\n");

    // const USDCFactory = await hre.ethers.getContractFactory("USDC");
    // const USDCContract = await USDCFactory.deploy();
    // await USDCContract.deployed();
    // console.log("USDC Address: ", USDCContract.address);
    // await USDCContract.deployTransaction.wait(5);
    // console.log("USDC Complete!\n\n\n\n");

    const yocFactory = await hre.ethers.getContractFactory("YOC");
    const yocContract = await yocFactory.deploy("YOC-Global", "YOCe", 18);
    await yocContract.deployed();
    console.log("YOC Address: ", yocContract.address);
    await yocContract.deployTransaction.wait(5);
    await contractVerify(yocContract.address, "YOC", ["YOC-Global", "YOCe", 18]);
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

    await yocContract.setAddressForTransferToThere(yocMasterChefContract.address, true);
    console.log("Set MasterChef Address of YOC contract\n");

    const YUSDFactory = await hre.ethers.getContractFactory("YUSD");
    const YUSD = await YUSDFactory.deploy(WETH_SEPOLIA, yocContract.address, yocswapRouterContract.address, deployer.address, SEPOLIA_FEED);
    await YUSD.deployed();
    console.log("YUSD Address:", YUSD.address);
    await YUSD.deployTransaction.wait(5);
    await contractVerify(YUSD.address, 'YUSD', [WETH_SEPOLIA, yocContract.address, yocswapRouterContract.address, deployer.address, SEPOLIA_FEED]);
    console.log("YUSD Complete!\n\n\n\n");
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