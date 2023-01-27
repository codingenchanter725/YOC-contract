const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // const _projectManageFactory = await ethers.getContractFactory("ProjectManage");
    // const projectManageFactory = await _projectManageFactory.deploy();
    // await projectManageFactory.deployed();
    // console.log("ProjectManage Address: ", projectManageFactory.address);

    // const _projectDetailFactory = await ethers.getContractFactory("ProjectDetail");
    // const projectDetailFactory = await _projectDetailFactory.deploy();
    // await projectDetailFactory.deployed();
    // console.log("ProjectDetail Address: ", projectDetailFactory.address);

    const _USDCFactory = await ethers.getContractFactory("USDC");
    const USDCFactory = await _USDCFactory.deploy();
    await USDCFactory.deployed();
    console.log("USDC Address: ", USDCFactory.address);

    const _yocFactory = await ethers.getContractFactory("YOC");
    const yocFactory = await _yocFactory.deploy();
    await yocFactory.deployed();
    console.log("YOC Address: ", yocFactory.address);

    const _yocswapFactory = await ethers.getContractFactory("YocswapFactory");
    const yocswapFactory = await _yocswapFactory.deploy();
    await yocswapFactory.deployed();
    console.log("yocswapFactory Address:", yocswapFactory.address);
    console.log("yocswapFactory INIT_CODE_PAIR_HASH: ", await yocswapFactory.INIT_CODE_PAIR_HASH());

    /* stop and again */

    // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // And then, please deploy the YocswapRouter contract
    const factory = yocswapFactory.address;
    const WETH = "0xaAEc40a06542F89Cf171defc07400219A6347082";
    // const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
    const _yocswapRouter = await ethers.getContractFactory("YocswapRouter");
    const yocswapRouter = await _yocswapRouter.deploy(factory, WETH);
    await yocswapRouter.deployed();
    console.log("YocswapRouter Address:", yocswapRouter.address);

    const _yocMasterChef = await ethers.getContractFactory("YOCMasterChef");
    const yocMasterChef = await _yocMasterChef.deploy(yocFactory.address, deployer.address);
    await yocMasterChef.deployed();
    console.log("YocMasterChef Address:", yocMasterChef.address);


    // create the pools for YOC Staking
    const _dummyForYOCToken = await ethers.getContractFactory("DUMMY");
    const dummyForYOCToken = await _dummyForYOCToken.deploy("Dummy Token for staking", "DUMMY_YOC");
    await dummyForYOCToken.deployed();
    console.log("YocDummy Address: ", dummyForYOCToken.address);

    await yocMasterChef.add(10, dummyForYOCToken.address, false, true);
    let pairID = await yocMasterChef.poolLength() - 1;

    const _yocStakingPool = await ethers.getContractFactory("YocStaking");
    // const _tokenStakingPool = await ethers.getContractFactory("TokenStaking");
    const yocStakingPool = await _yocStakingPool.deploy(
        "0x3EFb72DA89a6d1060A1D6c28a2564a235F5Bf38d", // staked token - WETH, USDC, YOC5, YOC, DUMMY2
        "0xe73262495BC2a7e98554c1aB2141577018d49fA5", // yocMasterChef.address
        deployer.address, // admin
        deployer.address, // fee address
        pairID,
        true,
    );
    await yocStakingPool.deployed();
    console.log("YocStakingPool Address:", yocStakingPool.address);
    await dummyForYOCToken.approve(yocStakingPool.address, MaxUint256);
    console.log("YocStakingPool Approve");
    await yocStakingPool.init(dummyForYOCToken.address);
    console.log("YocStakingPool init");


    // create the pools for Token Staking =======================================================================
    const _dummyToken = await ethers.getContractFactory("DUMMY");
    const dummyToken = await _dummyToken.deploy("Dummy Token for staking", "DUMMY_YOC");
    await dummyToken.deployed();
    console.log("Dummy Address: ", dummyToken.address);

    await yocMasterChef.add(10, dummyToken.address, false, true);
    pairID = await yocMasterChef.poolLength() - 1;

    const _tokenStakingPool = await ethers.getContractFactory("YocStaking");
    // const _tokenStakingPool = await ethers.getContractFactory("TokenStaking");
    const tokenStakingPool = await _tokenStakingPool.deploy(
        "0x3EFb72DA89a6d1060A1D6c28a2564a235F5Bf38d", // staked token - WETH, USDC, YOC5, YOC, DUMMY2
        "0xe73262495BC2a7e98554c1aB2141577018d49fA5", // yocMasterChef.address
        deployer.address, // admin
        deployer.address, // fee address
        pairID,
        true,
    );
    await tokenStakingPool.deployed();
    console.log("TokenStakingPool Address:", tokenStakingPool.address);
    await dummyToken.approve(tokenStakingPool.address, MaxUint256);
    console.log("TokenStakingPool Approve");
    await tokenStakingPool.init(dummyToken.address);
    console.log("TokenStakingPool init");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });