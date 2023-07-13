const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

const overrides = {
    gasLimit: 9999999
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // const yocswapFactory = await hre.ethers.getContractFactory("YocswapFactory");
    // const yocswapContract = await yocswapFactory.deploy(deployer.address);
    // await yocswapContract.deployed();
    // console.log("yocswapContract Address:", yocswapContract.address);
    // console.log("yocswapContract INIT_CODE_PAIR_HASH: ", await yocswapContract.INIT_CODE_PAIR_HASH());
    // await yocswapContract.deployTransaction.wait(5);
    // await contractVerify(yocswapContract.address, 'YocswapFactory', [deployer.address]);
    // console.log("yocswapContract Complete!\n\n\n\n");

    // /* stop and again */
    // // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // // And then, please deploy the YocswapRouter contract
    const yocswapRouterFactory = await hre.ethers.getContractFactory("YocswapRouter");
    const yocswapRouterContract = await yocswapRouterFactory.deploy("0x2b52A36AE5ff8b98a0Bceef22c01F67C0a9cc1DB", WETH_SEPOLIA);
    await yocswapRouterContract.deployed();
    console.log("YocswapRouter Address:", yocswapRouterContract.address);
    await yocswapRouterContract.deployTransaction.wait(5);
    await contractVerify(yocswapRouterContract.address, 'YocswapRouter', ["0x2b52A36AE5ff8b98a0Bceef22c01F67C0a9cc1DB", WETH_SEPOLIA]);
    console.log("yocswapRouter Complete!\n\n\n\n");
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
        console.log("Error occurs!")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });