const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xaAEc40a06542F89Cf171defc07400219A6347082";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
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
    const yocswapFactory = await _yocswapFactory.deploy(deployer.address);
    await yocswapFactory.deployed();
    console.log("yocswapFactory Address:", yocswapFactory.address);
    console.log("yocswapFactory INIT_CODE_PAIR_HASH: ", await yocswapFactory.INIT_CODE_PAIR_HASH());

    /* stop and again */
    // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
    // And then, please deploy the YocswapRouter contract
    const _yocswapRouter = await ethers.getContractFactory("YocswapRouter");
    const yocswapRouter = await _yocswapRouter.deploy(yocswapFactory.address, WETH);
    await yocswapRouter.deployed();
    console.log("YocswapRouter Address:", yocswapRouter.address);

    const _yocMasterChef = await ethers.getContractFactory("YOCMasterChef");
    const yocMasterChef = await _yocMasterChef.deploy(yocFactory.address, deployer.address);
    await yocMasterChef.deployed();
    console.log("YocMasterChef Address:", yocMasterChef.address + "\n");


    // create the pools for YOC Staking ================================== YOC =====================================
    console.log("Staking Start")
    const _dummyForYOCToken = await ethers.getContractFactory("DUMMY");
    const dummyForYOCToken = await _dummyForYOCToken.deploy("Dummy Token for staking", "DUMMY_YOC");
    await dummyForYOCToken.deployed();
    console.log("YocDummy Address: ", dummyForYOCToken.address);

    await yocMasterChef.add(
        10, dummyForYOCToken.address, false, true,
        { ...overrides }
    );
    console.log("YocDummy is added on yocFarmsContract")
    let pairID = await yocMasterChef.poolLength();
    console.log("Pairs Length: ", pairID);

    const _yocStakingPool = await ethers.getContractFactory("YocStaking");
    const yocStakingPool = await _yocStakingPool.deploy(
        yocFactory.address, // staked token - YOC:must
        yocMasterChef.address, // yocMasterChef.address
        deployer.address, // admin
        deployer.address, // fee address
        pairID,
        true,
    );
    await yocStakingPool.deployed();
    console.log("YocStakingPool Address:", yocStakingPool.address);
    await dummyForYOCToken.approve(yocStakingPool.address, MaxUint256);
    console.log("YocStakingPool Approve");
    await yocStakingPool.init(
        dummyForYOCToken.address,
        { ...overrides }
    );
    console.log("YocStakingPool init\n");


    const stakingTokenAddressArr = [USDCFactory.address, Yoc1Address];
    for (let index = 0; index < stakingTokenAddressArr.length; index++) {
        // create the pools for Token Staking ================================= USDC, YOC1, TOKEN ======================================
        const _dummyToken = await ethers.getContractFactory("DUMMY");
        const dummyToken = await _dummyToken.deploy("Dummy Token for staking", "DUMMY");
        await dummyToken.deployed();
        console.log(`Dummy Address: `, dummyToken.address);

        await yocMasterChef.add(
            10, dummyToken.address, false, true,
            { ...overrides }
        );
        console.log("Dummy is added on yocFarmsContract")
        let pairID = await yocMasterChef.poolLength();
        console.log("Pairs Length: ", pairID);

        const _tokenStakingPool = await ethers.getContractFactory("TokenStaking");
        const tokenStakingPool = await _tokenStakingPool.deploy(
            stakingTokenAddressArr[index], // staked token - USDC, YOC1, TOKEN
            yocFactory.address, // yoc
            yocMasterChef.address, // yocMasterChef.address
            deployer.address, // treasury address
            pairID,
        );
        await tokenStakingPool.deployed();
        console.log("TokenStakingPool Address:", tokenStakingPool.address);
        await dummyToken.approve(tokenStakingPool.address, MaxUint256);
        console.log("TokenStakingPool Approve");
        await tokenStakingPool.init(
            dummyToken.address,
            { ...overrides }
        );
        console.log("TokenStakingPool init\n");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });