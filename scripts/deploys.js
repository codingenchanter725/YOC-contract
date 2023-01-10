// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    // console.log("Deploying contracts with the account:", deployer.address);
    // console.log("Account balance:", (await deployer.getBalance()).toString());

    // const ProjectManage = await ethers.getContractFactory("ProjectManage");
    // const ProjectManage_addr = await ProjectManage.deploy();
    // await ProjectManage_addr.deployed();
    // console.log("ProjectManage Address: ", ProjectManage_addr.address);

    // const ProjectDetail = await ethers.getContractFactory("ProjectDetail");
    // const ProjectDetail_addr = await ProjectDetail.deploy();
    // await ProjectDetail_addr.deployed();
    // console.log("ProjectDetail Address: ", ProjectDetail_addr.address);

    // const USDC = await ethers.getContractFactory("USDC");
    // const USDC_addr = await USDC.deploy();
    // await USDC_addr.deployed();
    // console.log("USDC Address: ", USDC_addr.address);

    // const YocswapFactory = await ethers.getContractFactory("YocswapFactory");
    // const yocswapFactory = await YocswapFactory.deploy(deployer.address);
    // await yocswapFactory.deployed();
    // console.log("YocswapFactory Address:", yocswapFactory.address);
    // console.log("YocswapFactory INIT_CODE_PAIR_HASH: ", await yocswapFactory.INIT_CODE_PAIR_HASH());

    /* stop and again */ 

    // // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // // And then, please deploy the YocswapRouter contract
    // const factory = '0x122f4421A7f52A45e9e65ceBcb712C2961c32835' // yocswapFactory.address;
    // // // const WETH = "0xaAEc40a06542F89Cf171defc07400219A6347082";
    // const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
    // const YocswapRouter = await ethers.getContractFactory("YocswapRouter");
    // const yocswapRouter = await YocswapRouter.deploy(factory, WBNB);
    // await yocswapRouter.deployed();
    // console.log("YocswapRouter deployed to:", yocswapRouter.address);

    // const YocMasterChef = await ethers.getContractFactory("YOCMasterChef");
    // const yocMasterChef = await YocMasterChef.deploy("0x3EFb72DA89a6d1060A1D6c28a2564a235F5Bf38d", deployer.address);
    // await yocMasterChef.deployed();
    // console.log("YocMasterChef deployed to:", yocMasterChef.address);

    const YocPool = await ethers.getContractFactory("YocPool");
    const yocPool = await YocPool.deploy(
        "0xbb9b0c89C100610E238e7e9dd9DDB954Df2BE199", // staked token - WETH, USDC
        "0xe73262495BC2a7e98554c1aB2141577018d49fA5", // farms
        deployer.address, // admin
        deployer.address, // fee address
        4, // pair ID
        false
    );
    await yocPool.deployed();
    console.log("YocPool deployed to:", yocPool.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });