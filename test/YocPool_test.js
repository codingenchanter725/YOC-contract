const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const DEPOSIT_FEE = 25
const WITHDRAW_FEE = 10
const PERCENT_PRECISION = 1000

describe("YOC Farming Test", function() {
    let owner
    let teamWallet
    let wallet0, wallet1, wallet2
    let YOC, normalLPToken, yocLPToken, dummyToken, yocPool, yocFarmingContract
    const balances = [10000, 500, 1000000]

    const expandTo18Decimals = (n) => {
        return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
    }

    const delay = (delayTimes) => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(2)
            }, delayTimes)
        })
      }

    beforeEach(async () => {
        [
            owner,
            teamWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

        const _YOC = await ethers.getContractFactory("YOC")
        YOC = await _YOC.deploy("YOC", "YOC", 18);

        const _normalLPToken = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20")
        normalLPToken = await _normalLPToken.deploy("BUSD-WETH pair", "BUSD-WETH")
        const _yocLPToken = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20")
        yocLPToken = await _yocLPToken.deploy("YOC-WETH pair", "YOC-WETH")
        const _dummyToken = await ethers.getContractFactory("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20")
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

        const _yocPool = await ethers.getContractFactory("YocStaking")
        yocPool = await _yocPool.deploy(
            YOC.address,
            yocFarmingContract.address,
            owner.address,
            teamWallet.address,
            0,
            false
        )
        await dummyToken.approve(yocPool.address, MaxUint256)
        await yocPool.init(
            dummyToken.address,
            { ...overrides }
        );

        await normalLPToken.transfer(wallet0.address, expandTo18Decimals(balances[0]))
        await yocLPToken.transfer(wallet1.address, expandTo18Decimals(balances[1]))
        await YOC.transfer(yocFarmingContract.address, expandTo18Decimals(balances[2]))
        await YOC.transfer(wallet2.address, expandTo18Decimals(balances[1]))
    })

    describe("Deposit & Withdraw", () => {
        beforeEach(async () => {
            await YOC.connect(wallet2).approve(
                yocPool.address,
                MaxUint256
            )
        })

        it("Should have same balance to initial supply", async () => {
            const wallet2YocBalance = await YOC.balanceOf(wallet2.address)
            expect(wallet2YocBalance).to.equal(expandTo18Decimals(balances[1]))
        })

        it("Deposit", async () => {
            const depositAmount = expandTo18Decimals(100)

            // Deposit should have 2.5% fee
            await yocPool.connect(wallet2).deposit(
                depositAmount
            )
            await yocPool.connect(wallet2).deposit(
                depositAmount
            )

            const userInfo = await yocPool.userInfo(
                wallet2.address
            )
            console.log(userInfo)
        })

        it("Withdraw", async () => {
            const depositAmount = expandTo18Decimals(100)

            // Withdraw should have 1% fee
            await yocPool.connect(wallet2).deposit(
                depositAmount
            )
            await yocPool.connect(wallet2).deposit(
                depositAmount
            )
            await yocPool.connect(wallet2).withdraw(
                depositAmount
            )
            // Check the user balance
            const userInfo = await yocPool.userInfo(
                wallet2.address
            )
            const balance = await YOC.balanceOf(wallet2.address)
            console.log(userInfo)
            console.log(balance)
        })
    })
})