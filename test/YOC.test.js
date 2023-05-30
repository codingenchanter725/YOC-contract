const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const DEPOSIT_FEE = 25
const WITHDRAW_FEE = 10
const PERCENT_PRECISION = 1000

// yoc staking contract test

describe("Test", function () {
    let rewardWallet;
    let wallet0, wallet1, wallet2
    let yocContract, yocMasterChefContract, yocStakingPool, tokenStakingPool, dummyForYOCToken, dummyForToken, USDCContract;
    const decimals = 18;
    const balances = [10000, 500, 1000000]

    const expandTo18Decimals = (n) => {
        return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
    }

    const expandToMDecimals = (n) => {
        return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
    }

    beforeEach(async () => {
        [
            deployer,
            rewardWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

        console.log("Deployer Address: ", deployer.address);

        const yocFactory = await hre.ethers.getContractFactory("YOC");
        yocContract = await yocFactory.deploy("YOC-Global", "YOCe", decimals);
        await yocContract.deployed();
        console.log("YOC Address: ", yocContract.address);

        const yocMasterChefFactory = await hre.ethers.getContractFactory("YOCMasterChef");
        yocMasterChefContract = await yocMasterChefFactory.deploy(yocContract.address, deployer.address);
        await yocMasterChefContract.deployed();
        console.log("YocMasterChef Address:", yocMasterChefContract.address + "\n");

        let pairID = 0;
        // // create the pools for YOC Staking ================================== YOC =====================================
        // console.log("Staking Start")
        // const _dummyForYOCToken = await ethers.getContractFactory("DUMMY");
        // dummyForYOCToken = await _dummyForYOCToken.deploy("Dummy Token for staking", "DUMMY_YOC");
        // await dummyForYOCToken.deployed();
        // console.log("YocDummy Address: ", dummyForYOCToken.address);

        // await yocMasterChefContract.add(
        //     10, dummyForYOCToken.address, false, true,
        //     { ...overrides }
        // );
        // console.log("YocDummy is added on yocFarmsContract")
        // pairID = await yocMasterChefContract.poolLength();
        // console.log("Pairs Length: ", pairID);

        // const _yocStakingPool = await ethers.getContractFactory("YocStaking");
        // yocStakingPool = await _yocStakingPool.deploy(
        //     yocContract.address, // staked token - YOC:must
        //     yocMasterChefContract.address, // yocMasterChefContract.address
        //     deployer.address, // admin
        //     deployer.address, // fee address
        //     pairID - 1,
        //     true,
        // );
        // await yocStakingPool.deployed();
        // console.log("YocStakingPool Address:", yocStakingPool.address);
        // await dummyForYOCToken.approve(yocStakingPool.address, MaxUint256);
        // console.log("YocStakingPool Approve");
        // // await yocStakingPool.init(
        // //     dummyForYOCToken.address,
        // //     { ...overrides }
        // // );
        // // console.log("YocStakingPool init\n");


        const USDCFactory = await ethers.getContractFactory("USDC");
        USDCContract = await USDCFactory.deploy();
        await USDCContract.deployed();
        console.log("USDC Address: ", USDCContract.address);
        await USDCContract.transfer(rewardWallet.address, 1000 * 10 ** 6);

        console.log("Staking Start")
        const _dummyForToken = await ethers.getContractFactory("DUMMY");
        dummyForToken = await _dummyForToken.deploy("Dummy Token for staking", "DUMMY_YOC");
        await dummyForToken.deployed();
        console.log("YocDummy Address: ", dummyForToken.address);

        await yocMasterChefContract.add(
            10, dummyForToken.address, false, true,
            { ...overrides }
        );
        console.log("YocDummy is added on yocFarmsContract")
        pairID = await yocMasterChefContract.poolLength();
        console.log("Pairs Length: ", pairID);

        const _tokenStakingPool = await ethers.getContractFactory("TokenStaking");
        tokenStakingPool = await _tokenStakingPool.deploy(
            USDCContract.address,
            yocContract.address, // staked token - YOC:must
            yocMasterChefContract.address, // yocMasterChefContract.address
            deployer.address, // admin
            pairID - 1,
        );
        await tokenStakingPool.deployed();
        console.log("TokenStakingPool Address:", tokenStakingPool.address);
        await dummyForToken.approve(tokenStakingPool.address, MaxUint256);
        console.log("TokenStakingPool Approve");
        await tokenStakingPool.init(
            dummyForToken.address,
            { ...overrides }
        );
        console.log("TokenStakingPool init\n");
    })

    describe("YOC", () => {
        beforeEach(async () => {
        })

        // it("Mint", async () => {
        //     const balance1 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //     await delay(100); // same with 2 second
        //     await yocContract.mint();
        //     const balance2 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //     console.log("Balances: ", balance1, balance2);
        //     expect(balance1).to.equal(balance2 - 2 * 100);
        // })

        // it("SetMasterChef", async () => {
        //     await yocContract.setMasterChef(yocMasterChefContract.address)
        //     const MasterChef = await yocContract.MasterChef();
        //     console.log("MasterChef: ", MasterChef);
        //     expect(yocMasterChefContract.address).to.equal(MasterChef);
        // })

        // describe("MasterChef", () => {
        //     beforeEach(async () => {
        //         await yocContract.setMasterChef(yocMasterChefContract.address);
        //         let masterChef = await yocContract.MasterChef();
        //         console.log("masterChef:", masterChef);
        //     })

        //     it("MintToMasterChef", async () => {
        //         await yocContract.mint();
        //         let yocBalance1 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //         await delay(1000);
        //         await yocMasterChefContract._safeTransfer(rewardWallet.address, expandTo18Decimals(10));
        //         let yocBalance2 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //         console.log("YC Balance:", yocBalance1, yocBalance2)

        //         let yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
        //         console.log("Reward Balances:", yocRewardBalance);

        //         expect(0).to.equal(yocRewardBalance - 10);

        //         let YOCToMasterChefallowance = await yocContract.allowance(yocContract.address, yocMasterChefContract.address);
        //         console.log("allowance:", YOCToMasterChefallowance / (10 ** decimals));
        //     })
        // })

        // describe("YOC stacking", () => {
        //     beforeEach(async () => {
        //         await yocContract.setMasterChef(yocMasterChefContract.address);
        //         let masterChef = await yocContract.MasterChef();
        //         console.log("masterChef:", masterChef);

        //         await yocContract.connect(rewardWallet).approve(yocStakingPool.address, expandTo18Decimals(10000));
        //     })

        //     it("Deposit & withdraw", async () => {
        //         await yocContract.mint();
        //         let yocBalance1 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //         await delay(1000);
        //         await yocMasterChefContract._safeTransfer(rewardWallet.address, expandTo18Decimals(400));
        //         let yocBalance2 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
        //         console.log("YOC Balance:", yocBalance1, yocBalance2)

        //         let yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
        //         console.log("Reward Balances:", yocRewardBalance);

        //         await yocStakingPool.init(
        //             dummyForYOCToken.address,
        //             { ...overrides }
        //         );
        //         console.log("YocStakingPool init\n");

        //         await yocStakingPool.connect(rewardWallet).deposit(expandTo18Decimals(50));

        //         let YOCToMasterChefallowance = await yocContract.allowance(rewardWallet.address, yocStakingPool.address);
        //         console.log("allowance:", YOCToMasterChefallowance / (10 ** decimals));


        //         yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
        //         console.log("Reward Balances:", yocRewardBalance);

        //         await delay(1000);
        //         await yocStakingPool.connect(rewardWallet).withdraw(expandTo18Decimals(50));

        //         yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
        //         console.log("Reward Balances:", yocRewardBalance);
        //     })
        // })

        describe("TOKEN stacking", () => {
            beforeEach(async () => {
                await yocContract.setAddressForTransferToThere(yocMasterChefContract.address, true);
                // await yocContract.setAddressForTransferToThere(tokenStakingPool.address, true);

                await USDCContract.connect(rewardWallet).approve(tokenStakingPool.address, 10000 * 10 ** 6);
            })

            it("addressForTransferToThere", async () => {
                let flag = await yocContract.isAddressForTransferToThere(yocMasterChefContract.address);
                console.log("state:", flag);

                flag = await yocContract.isAddressForTransferToThere(tokenStakingPool.address);
                console.log("state:", flag);
            })

            it("Deposit & withdraw", async () => {
                // await yocContract.mint();
                // let yocBalance1 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
                // await delay(1000);
                // await yocMasterChefContract._safeTransfer(rewardWallet.address, expandTo18Decimals(400));
                // let yocBalance2 = await yocContract.balanceOf(yocContract.address) / (10 ** decimals);
                // console.log("YOC Balance:", yocBalance1, yocBalance2)

                // let yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
                // console.log("Reward Balances:", yocRewardBalance);

                // await delay(3000);

                let USDCbalance1 = await USDCContract.connect(rewardWallet).balanceOf(deployer.address) / (10 ** 6);
                await tokenStakingPool.connect(rewardWallet).deposit(100 * (10 ** 6));
                console.log("Deposit 100 UDSC");
                let USDCbalance2 = await USDCContract.connect(rewardWallet).balanceOf(rewardWallet.address) / (10 ** 6);
                console.log("USDCbalance", USDCbalance1, USDCbalance2);


                let YOCToMasterChefallowance = await USDCContract.allowance(rewardWallet.address, tokenStakingPool.address);
                console.log("allowance:", YOCToMasterChefallowance / (10 ** decimals));


                yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
                console.log("Reward Balances:", yocRewardBalance);

                // await delay(1000);

                await tokenStakingPool.connect(rewardWallet).withdraw(10 * (10 ** 6));
                console.log("Withdraw 100 UDSC");

                yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
                console.log("Reward Balances:", yocRewardBalance);

                let userShare = (await tokenStakingPool.userInfo(rewardWallet.address)).amount / (10 ** 6);
                console.log("userShare", userShare);
                await tokenStakingPool.connect(rewardWallet).withdraw(userShare * (10 ** 6));
                console.log("Withdraw 100 UDSC");

                yocRewardBalance = await yocContract.balanceOf(rewardWallet.address) / (10 ** decimals);
                console.log("Reward Balances:", yocRewardBalance);
            })
        })
    })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}