const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

async function main() {
    const [deployer] = await ethers.getSigners();

    // console.log("Deploying contracts with the account:", deployer.address);
    // console.log("Account balance:", (await deployer.getBalance()).toString());

    // const ProjectManageFactory = await ethers.getContractFactory("ProjectManage");
    // const projectManageFactory = await ProjectManageFactory.deploy();
    // await projectManageFactory.deployed();
    // console.log("ProjectManage Address: ", projectManageFactory.address);

    // const ProjectDetailFactory = await ethers.getContractFactory("ProjectDetail");
    // const projectDetailFactory = await ProjectDetailFactory.deploy();
    // await projectDetailFactory.deployed();
    // console.log("ProjectDetail Address: ", projectDetailFactory.address);

    // const USDCFactory = await ethers.getContractFactory("USDC");
    // const usdcFactory = await USDCFactory.deploy();
    // await usdcFactory.deployed();
    // console.log("USDC Address: ", usdcFactory.address);

    const YOCFactory = await ethers.getContractFactory("YOC");
    const yocFactory = await YOCFactory.deploy();
    await yocFactory.deployed();
    console.log("YOC Address: ", yocFactory.address);

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



    // // // create the pools for Staking
    // const DummyToken = await ethers.getContractFactory("DUMMY");
    // const dummyToken = await DummyToken.deploy("Dummy Token for staking", "DUMMY_YOC");    
    // await dummyToken.deployed();
    // console.log("Dummy Address: ", dummyToken.address);

    // // await yocMasterChef.add(10, dummyToken.address, false, true);
    // // const pairID = await yocMasterChef.poolLength() - 1;

    // const YocPool = await ethers.getContractFactory("YocPool");
    // // const YocPool = await ethers.getContractFactory("SmartChef");
    // const yocPool = await YocPool.deploy(
    //     "0x3EFb72DA89a6d1060A1D6c28a2564a235F5Bf38d", // staked token - WETH, USDC, YOC5, YOC, DUMMY2
    //     "0xe73262495BC2a7e98554c1aB2141577018d49fA5", // yocMasterChef.address
    //     deployer.address, // admin
    //     deployer.address, // fee address
    //     11, // pairID,
    //     true, 
    // );
    // await yocPool.deployed();
    // console.log("YocPool deployed to:", yocPool.address);
    // await dummyToken.approve(yocPool.address, MaxUint256);
    // console.log("YocPool Approve");
    // // await yocPool.init(dummyToken.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });