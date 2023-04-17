const { expect, assert } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const DEPOSIT_FEE = 25
const WITHDRAW_FEE = 10
const PERCENT_PRECISION = 1000

// yoc staking contract test

describe("SmartChef Test", function () {
    let owner
    let teamWallet
    let wallet0, wallet1, wallet2
    let YOC, normalLPToken, yocLPToken, dummyToken, randomToken, smartChef, yocFarmingContract
    const balances = [10000, 500, 1000000]

    const expandTo18Decimals = (n) => {
        return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
    }

    beforeEach(async () => {
        [
            owner,
            teamWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

        const _YOC = await ethers.getContractFactory("YOC")
        YOC = await _YOC.deploy()

        const _normalLPToken = await ethers.getContractFactory("TOKEN")
        normalLPToken = await _normalLPToken.deploy("BUSD-WETH pair", "BUSD-WETH")
        const _yocLPToken = await ethers.getContractFactory("TOKEN")
        yocLPToken = await _yocLPToken.deploy("YOC-WETH pair", "YOC-WETH")

        const _yocFarmingContract = await ethers.getContractFactory("YOCMasterChef")
        yocFarmingContract = await _yocFarmingContract.deploy(
            YOC.address,
            teamWallet.address
        )
        // Add Second pool
        await yocFarmingContract.add(
            25, normalLPToken.address, false, false,
            { ...overrides }
        )
        await yocFarmingContract.add(
            50, yocLPToken.address, true, false,
            { ...overrides }
        )

        console.log(wallet0.address, balances[0], expandTo18Decimals(balances[0]));

        await normalLPToken.transfer(wallet0.address, expandTo18Decimals(balances[0]))
        await yocLPToken.transfer(wallet0.address, expandTo18Decimals(balances[0]))
        // await YOC.transfer(yocFarmingContract.address, expandTo18Decimals(balances[2]))
    })

    describe("Deposit & Withdraw", () => {
        beforeEach(async () => {
            await normalLPToken.connect(wallet0).approve(
                yocFarmingContract.address,
                MaxUint256
            );
            await yocLPToken.connect(wallet0).approve(
                yocFarmingContract.address,
                MaxUint256
            );
        })

        it("Should have same balance to initial supply", async () => {
            const wallet1TokenBalance = await yocLPToken.balanceOf(wallet0.address)
            expect(wallet1TokenBalance).to.equal(expandTo18Decimals(balances[0]))
        })

        // it("Deposit", async () => {
        //     const depositAmount = expandTo18Decimals(balances[0])

        //     // Deposit should have 2.5% fee
        //     await yocFarmingContract.connect(wallet0).deposit(
        //         0,
        //         depositAmount
        //     )
        //     // await yocFarmingContract.connect(wallet0).deposit(
        //     //     depositAmount
        //     // )

        //     // const eventFilter = yocFarmingContract.filters.Deposit();
        //     // const event = await yocFarmingContract.waitFor(eventFilter);
        //     // console.log(event.args);
        //     // assert.equal(event.args.user, wallet0.address);
        //     // assert.equal(event.args.pid, 0);
        //     // assert.equal(event.args.amount, depositAmount);

        //     const userInfo = await yocFarmingContract.userInfo(
        //         0,
        //         wallet0.address
        //     )
        //     console.log(userInfo)
        // })

        it("Withdraw", async () => {
            const depositAmount = expandTo18Decimals(balances[1])
            const withdrawAmount = expandTo18Decimals(balances[1] / 2)

            // Withdraw should have 1% fee
            await yocFarmingContract.connect(wallet0).deposit(
                0,
                depositAmount
            )
            let userInfo = await yocFarmingContract.userInfo(
                0,
                wallet0.address
            )
            console.log(userInfo)

            await delay(5000);

            await yocFarmingContract.connect(wallet0).withdraw(
                0,
                0
            )
            await yocFarmingContract.connect(wallet0).withdraw(
                0,
                withdrawAmount
            )

            userInfo = await yocFarmingContract.userInfo(
                0,
                wallet0.address
            )
            console.log(userInfo)

            const balance = await YOC.balanceOf(wallet0.address);
            console.log(balance);
        })
    })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}