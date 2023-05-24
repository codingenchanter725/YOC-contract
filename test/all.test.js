const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const DEPOSIT_FEE = 25
const WITHDRAW_FEE = 10
const PERCENT_PRECISION = 1000

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const Yoc1Address = "0x866020AFa80279595BfD2cC38f19D1a5E9a2aBBf";
const Yoc2Address = "0x1a0946DeB7b5Cbc2b03beE2ff23EE7165729860f";
const Yoc3Address = "0xB7E8F4F64D9F3EC0338d8872E2F28D8Fc490C763";
const Yoc4Address = "0x900d3C76D20C63CE1E96AF83Ea0BC505a15Dbf0f";
const Yoc5Address = "0xC25C0d4E47fF3cfbBc973EBF99d0237daEE57411";

describe("All Test", async function () {
    let yocFactory, yocMasterChef, yocStakingPool;
    let deployer
    let teamWallet
    let wallet0, wallet1, wallet2

    beforeEach(async () => {
        [
            deployer,
            teamWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

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

        const _yocFactory = await ethers.getContractFactory("YOC", "YOCe", 16);
        yocFactory = await _yocFactory.deploy();
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
        yocMasterChef = await _yocMasterChef.deploy(yocFactory.address, deployer.address);
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
        yocStakingPool = await _yocStakingPool.deploy(
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
    })

    describe("Deposit & Withdraw", () => {
        beforeEach(async () => {
            await yocFactory.connect(wallet2).approve(
                yocStakingPool.address,
                MaxUint256
            )
        })

        it ("Should have same balance to initial supply", async () => {
            const wallet2YocBalance = await yocFactory.balanceOf(wallet2.address)
            expect(wallet2YocBalance).to.equal(expandTo18Decimals(balances[1]))
        })
    })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}