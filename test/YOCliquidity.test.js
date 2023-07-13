const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 } } = require("ethers")

const overrides = {
    gasLimit: 9999999
}

const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

describe("All Test", async function () {
    let yocFactory, yocSwapRouter, token0, token1;
    let deployer
    let teamWallet
    let wallet0, wallet1, wallet2

    const expandTo18Decimals = (n) => {
        return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
    }

    beforeEach(async () => {
        [
            deployer,
            teamWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        const Token = await ethers.getContractFactory("contracts/test/ERC20.sol:ERC20")
        token0 = await Token.deploy("token0", "token0");
        token1 = await Token.deploy("token1", "token1");

        const _yocswapFactory = await ethers.getContractFactory("YocswapFactory");
        const yocswapFactory = await _yocswapFactory.deploy(deployer.address);
        await yocswapFactory.deployed();
        console.log("yocswapFactory Address:", yocswapFactory.address);
        console.log("yocswapFactory INIT_CODE_PAIR_HASH: ", await yocswapFactory.INIT_CODE_PAIR_HASH());

        /* stop and again */
        // Before deploying, should change 26 line of YocswapLibrary.sol into INIT_CODE_PAIR_HASH.
        // And then, please deploy the YocswapRouter contract
        const _yocswapRouter = await ethers.getContractFactory("YocswapRouter");
        yocSwapRouter = await _yocswapRouter.deploy(yocswapFactory.address, WETH_SEPOLIA);
        await yocSwapRouter.deployed();
        console.log("YocswapRouter Address:", yocSwapRouter.address);
    })

    describe("Add Liquidity", () => {
        beforeEach(async () => {
            await token0.approve(yocSwapRouter.address, MaxUint256);
            await token1.approve(yocSwapRouter.address, MaxUint256);
        })

        it("Token - Token", async () => {
            let allowance0 = await token0.allowance(deployer.address, yocSwapRouter.address);
            console.log(allowance0);
            expect(0).to.eq(0);

            await yocSwapRouter.addLiquidity(
                token0.address,
                token1.address,
                expandTo18Decimals(1000),
                expandTo18Decimals(1000),
                0,
                0,
                deployer.address,
                Date.now() + 1000 * 60 * 50
            )
        })
    })

    // describe("Add LiquidityETH", () => {
    //     beforeEach(async () => {
    //         await token0.approve(yocSwapRouter.address, MaxUint256);
    //     })

    //     it("Token - Token", async () => {
    //         let allowance0 = await token0.allowance(deployer.address, yocSwapRouter.address);
    //         console.log(allowance0);
    //         expect(0).to.eq(0);

    //         await yocSwapRouter.addLiquidityETH(
    //             token0.address,
    //             token1.address,
    //             expandTo18Decimals(1000),
    //             expandTo18Decimals(1000),
    //             0,
    //             0,
    //             deployer.address,
    //             Date.now() + 1000 * 60 * 50
    //         )
    //     })
    // })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}