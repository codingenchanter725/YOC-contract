const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const DEPOSIT_FEE = 25
const WITHDRAW_FEE = 10
const PERCENT_PRECISION = 1000

describe("SmartChef Test", function() {
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

        const _YOC = await ethers.getContractFactory("BEP20Token")
        YOC = await _YOC.deploy()

        const _normalLPToken = await ethers.getContractFactory("TestToken")
        normalLPToken = await _normalLPToken.deploy("BUSD-WETH pair", "BUSD-WETH")
        const _yocLPToken = await ethers.getContractFactory("TestToken")
        yocLPToken = await _yocLPToken.deploy("YOC-WETH pair", "YOC-WETH")
        const _dummyToken = await ethers.getContractFactory("TestToken")
        dummyToken = await _dummyToken.deploy("Dummy Token", "Dummy")

        const _yocFarmingContract = await ethers.getContractFactory("YOCMasterChef")
        yocFarmingContract = await _yocFarmingContract.deploy(
            YOC.address,
            teamWallet.address
        )
        // Add three pool
        await yocFarmingContract.add(
            25, dummyToken.address, false, false,
            { ...overrides }
        )
        await yocFarmingContract.add(
            25, normalLPToken.address, false, false,
            { ...overrides }
        )
        await yocFarmingContract.add(
            50, yocLPToken.address, true, false,
            { ...overrides }
        )

        
        const _randomToken = await ethers.getContractFactory("TestToken")
        randomToken = await _randomToken.deploy("Random Token", "RT")

        const _smartChef = await ethers.getContractFactory("SmartChef")
        smartChef = await _smartChef.deploy(
            randomToken.address,
            YOC.address,
            yocFarmingContract.address,
            teamWallet.address,
            0
        )
        await dummyToken.approve(smartChef.address, MaxUint256)
        await smartChef.init(
            dummyToken.address,
            { ...overrides }
        );

        await normalLPToken.transfer(wallet0.address, expandTo18Decimals(balances[0]))
        await yocLPToken.transfer(wallet1.address, expandTo18Decimals(balances[1]))
        await YOC.transfer(yocFarmingContract.address, expandTo18Decimals(balances[2]))
        await randomToken.transfer(wallet2.address, expandTo18Decimals(balances[1]))
    })

    describe("Deposit & Withdraw", () => {
        beforeEach(async () => {
            await randomToken.connect(wallet2).approve(
                smartChef.address,
                MaxUint256
            )
        })

        it("Should have same balance to initial supply", async () => {
            const wallet2TokenBalance = await randomToken.balanceOf(wallet2.address)
            expect(wallet2TokenBalance).to.equal(expandTo18Decimals(balances[1]))
        })

        it("Deposit", async () => {
            const depositAmount = expandTo18Decimals(100)

            // Deposit should have 2.5% fee
            await smartChef.connect(wallet2).deposit(
                depositAmount
            )
            await smartChef.connect(wallet2).deposit(
                depositAmount
            )

            const userInfo = await smartChef.userInfo(
                wallet2.address
            )
            console.log(userInfo)
        })

        it("Withdraw", async () => {
            const depositAmount = expandTo18Decimals(100)

            // Withdraw should have 1% fee
            await smartChef.connect(wallet2).deposit(
                depositAmount
            )
            await smartChef.connect(wallet2).deposit(
                depositAmount
            )
            await smartChef.connect(wallet2).withdraw(
                depositAmount
            )
            // Check the user balance
            const userInfo = await smartChef.userInfo(
                wallet2.address
            )
            const balance = await randomToken.balanceOf(wallet2.address)
            console.log(userInfo)
            console.log(balance)
        })
    })
})