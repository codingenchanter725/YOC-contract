const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const Yoc1Address = "0x866020AFa80279595BfD2cC38f19D1a5E9a2aBBf";
const Yoc2Address = "0x1a0946DeB7b5Cbc2b03beE2ff23EE7165729860f";
const Yoc3Address = "0xB7E8F4F64D9F3EC0338d8872E2F28D8Fc490C763";
const Yoc4Address = "0x900d3C76D20C63CE1E96AF83Ea0BC505a15Dbf0f";
const Yoc5Address = "0xC25C0d4E47fF3cfbBc973EBF99d0237daEE57411";

const overrides = {
    gasLimit: 9999999
}

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const _projectManageFactory = await ethers.getContractFactory("ProjectManage");
    const projectManageFactory = await _projectManageFactory.deploy();
    await projectManageFactory.deployed();
    console.log("ProjectManage Address: ", projectManageFactory.address);

    const _projectDetailFactory = await ethers.getContractFactory("ProjectDetail");
    const projectDetailFactory = await _projectDetailFactory.deploy();
    await projectDetailFactory.deployed();
    console.log("ProjectDetail Address: ", projectDetailFactory.address);

    const _USDCFactory = await ethers.getContractFactory("USDC");
    const USDCFactory = await _USDCFactory.deploy();
    await USDCFactory.deployed();
    console.log("USDC Address: ", USDCFactory.address);

    const _yocFactory = await ethers.getContractFactory("YOC");
    const yocFactory = await _yocFactory.deploy("YOC", "YOCe", 16);
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
    const yocswapRouter = await _yocswapRouter.deploy(yocswapFactory.address, WBNB);
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
        pairID - 1,
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

        let tx = await yocMasterChef.add(
            10, dummyToken.address, false, true,
            { ...overrides }
        );
        await tx.wait();
        console.log("Dummy is added on yocFarmsContract")
        let pairID = await yocMasterChef.poolLength();
        console.log("Pairs Length: ", pairID);

        const _tokenStakingPool = await ethers.getContractFactory("TokenStaking");
        const tokenStakingPool = await _tokenStakingPool.deploy(
            stakingTokenAddressArr[index], // staked token - USDC, YOC1, TOKEN
            yocFactory.address, // yoc
            yocMasterChef.address, // yocMasterChef.address
            deployer.address, // treasury address
            pairID - 1,
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