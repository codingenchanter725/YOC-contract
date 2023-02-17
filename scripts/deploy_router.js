const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const Yoc1Address = "0x5fb8fBeeFcEd7DFE2C6bA21754EA764aFdE8fe9f";
const Yoc2Address = "0x6572a96eE12eCf3fDbE92eB2a05f768e40d74080";
const Yoc3Address = "0x19ff1dA431B6D723561D8E45002234573E64c655";
const Yoc4Address = "0x6Fb3eAD94e597B75b0Cf2D9d11275Bcb499c9FBC";
const Yoc5Address = "0x6c9DE6074fc06d8924789d242A7037e48c682C10";

const overrides = {
    gasLimit: 9999999
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    

    const _yocswapRouter = await ethers.getContractFactory("YocswapRouter");
    const yocswapRouter = await _yocswapRouter.deploy("0x94625dC914C88C435b6bD31e0D6f278C3f504bB8", WBNB);
    await yocswapRouter.deployed();
    console.log("YocswapRouter Address:", yocswapRouter.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });