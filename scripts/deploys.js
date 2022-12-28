// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const ProjectManage = await ethers.getContractFactory("ProjectManage");
    const ProjectManage_addr = await ProjectManage.deploy();
    await ProjectManage_addr.deployed();
    console.log("ProjectManage Address: ", ProjectManage_addr.address);

    const ProjectDetail = await ethers.getContractFactory("ProjectDetail");
    const ProjectDetail_addr = await ProjectDetail.deploy();
    await ProjectDetail_addr.deployed();
    console.log("ProjectDetail Address: ", ProjectDetail_addr.address);

    const USDC = await ethers.getContractFactory("USDC");
    const USDC_addr = await USDC.deploy();
    await USDC_addr.deployed();
    console.log("USDC Address: ", USDC_addr.address);

    const YocswapFactory = await hre.ethers.getContractFactory("YocswapFactory");
    const yocswapFactory = await YocswapFactory.deploy(deployer.address);
    await yocswapFactory.deployed();
    console.log("YocswapFactory Address:", yocswapFactory.address);
    console.log("YocswapFactory INIT_CODE_PAIR_HASH: ", yocswapFactory.INIT_CODE_PAIR_HASH());

    /* stop and again */ 

    // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // And then, please deploy the YocswapRouter contract
    const factory = yocswapFactory.address;
    const WBNB = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
    const YocswapRouter = await hre.ethers.getContractFactory("YocswapRouter");
    const yocswapRouter = await YocswapRouter.deploy(factory, WBNB);
    await yocswapRouter.deployed();
    console.log("YocswapRouter deployed to:", yocswapRouter.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });