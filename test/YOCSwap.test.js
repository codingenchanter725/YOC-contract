const { expect } = require('chai');
const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;
const { ethers } = require('hardhat');
const { erc20_abi } = require('../external_abi/erc20.abi.json');

const bigNum = num => (num + '0'.repeat(18));
const smallNum = num => (parseInt(num) / bigNum(1));
const bigNum_6 = num => (num + '0'.repeat(6));
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

describe("Test YOCSwap", function () {
    let yocswapRouterContract, yocswapContract, USDC, YOC1, WETH;
    let deployer, wallet_1, wallet_2, wallet_3
    before(async function () {
        [
            deployer,
            wallet_1,
            wallet_2,
            wallet_3,
        ] = await ethers.getSigners();

        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        const _WETH = await ethers.getContractFactory("WETH");
        WETH = await _WETH.deploy();
        console.log(`WETH Address: `, WETH.address);

        const yocswapFactory = await hre.ethers.getContractFactory("YocswapFactory");
        yocswapContract = await yocswapFactory.deploy(deployer.address);
        await yocswapContract.deployed();
        console.log("Hash:", await yocswapContract.INIT_CODE_PAIR_HASH())
        console.log("yocswapContract Address:", yocswapContract.address);

        const yocswapRouterFactory = await hre.ethers.getContractFactory("YocswapRouter");
        yocswapRouterContract = await yocswapRouterFactory.deploy(yocswapContract.address, WETH.address);
        await yocswapRouterContract.deployed();
        console.log("YocswapRouter Address:", yocswapRouterContract.address);

        const USDCFactory = await hre.ethers.getContractFactory("USDC");
        USDC = await USDCFactory.deploy();
        await USDC.deployed();
        console.log("USDC Address: ", USDC.address);

        const _ERC20YocToken = await hre.ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
        YOC1 = await _ERC20YocToken.deploy("YOC-FoundersCoin for Liquidity", `YOC1`);
        await YOC1.deployed();
        console.log(`YOC1 Address: `, YOC1.address);
  
    })

    it("check", async function () {
        console.log("deployed successfully");
    })

    // describe("Swap TEST", () => {
    //     const token0Amount = bigNum_6(10000);
    //     const token1Amount = bigNum(10000);
    //     const swapAmount = bigNum_6(100000);
    //     const expectedOutputAmount = '9008189262966333030027'  // 99 / 599 * 10 ^ 18
    //     let pairAddress, pair;

    //     beforeEach(async () => {
    //         await USDC.transfer(wallet_1.address, swapAmount)
    //         console.log("transfer USDC");
    //         await USDC.approve(yocswapRouterContract.address, MaxUint256);
    //         console.log("approve USDC");
    //         await YOC1.approve(yocswapRouterContract.address, MaxUint256);
    //         console.log("approve YOC1");

    //         let b = await YOC1.balanceOf(wallet_1.address);
    //         console.log('first YOC1', b, smallNum(b));

    //         await yocswapRouterContract.addLiquidity(
    //             USDC.address,
    //             YOC1.address,
    //             token0Amount,
    //             token1Amount,
    //             0,
    //             0,
    //             deployer.address,
    //             MaxUint256
    //         )

    //         pairAddress = await yocswapContract.getPair(USDC.address, YOC1.address);
    //         pair = await ethers.getContractAt("IYocswapPair", pairAddress);

    //         await USDC.connect(wallet_1).approve(yocswapRouterContract.address, MaxUint256);
    //     })

    //     it("get Espected amount", async () => {
    //         let expectAmount = await yocswapRouterContract.getAmountsOut(
    //             swapAmount,
    //             [USDC.address, YOC1.address]
    //         )
    //         console.log("expectAmount", expectAmount, smallNum(expectAmount[1]));

    //         let USDCPairAmount = await USDC.balanceOf(pair.address);
    //         let YOC1PairAmount = await YOC1.balanceOf(pair.address);
    //         console.log("USDCPairAmount", USDCPairAmount);
    //         console.log("YOC1PairAmount", YOC1PairAmount);

    //         let pairAmounts = await pair.getReserves()
    //         console.log("pairAmounts", pairAmounts);

    //         let expectAmount1 = await yocswapRouterContract.getAmountOut(
    //             swapAmount,
    //             USDCPairAmount,
    //             YOC1PairAmount
    //         )
    //         console.log("expectAmount1", expectAmount1, smallNum(expectAmount1));


    //         await yocswapRouterContract.connect(wallet_1).swapExactTokensForTokens(
    //             swapAmount,
    //             0,
    //             [USDC.address, YOC1.address],
    //             wallet_1.address,
    //             MaxUint256
    //         )

    //         let b = await YOC1.balanceOf(wallet_1.address);
    //         console.log('received YOC1', b, smallNum(b));
    //         // )
    //         // .to.emit(USDC, 'Transfer')
    //         // .withArgs(wallet_1.address, pair.address, swapAmount)
    //         // .to.emit(YOC1, 'Transfer')
    //         // .withArgs(pair.address, wallet_1.address, expectedOutputAmount)
    //         // .to.emit(pair, 'Sync')
    //         // .withArgs(token0Amount + swapAmount, token1Amount - expectedOutputAmount)
    //         // .to.emit(pair, 'Swap')
    //         // .withArgs(yocswapRouterContract.address, swapAmount, 0, 0, expectedOutputAmount, wallet_1.address)
    //     })
    // })

    describe("Remove Liquidity", () => {
        const USDCAmount = bigNum_6(100);
        const WETHAmount = bigNum(100);
        let LPAmount;
        let pairAddress, pair;

        beforeEach(async () => {
            await USDC.transfer(wallet_1.address, USDCAmount)
            console.log("transfer USDC");

            await USDC.approve(yocswapRouterContract.address, MaxUint256);
            console.log("approve USDC");

            await yocswapRouterContract.addLiquidityETH(
                USDC.address,
                USDCAmount,
                0,
                0,
                wallet_1.address,
                MaxUint256,
                {
                    value: WETHAmount
                }
            )

            pairAddress = await yocswapContract.getPair(USDC.address, WETH.address);
            pair = await ethers.getContractAt("IYocswapPair", pairAddress);
            console.log("Pair", pair.address);

            LPAmount = await pair.balanceOf(wallet_1.address);
            console.log("LPAmount", smallNum(LPAmount));

            await pair.connect(wallet_1).approve(yocswapRouterContract.address, MaxUint256);
            console.log("Wallet_1 approve the yocswapRouterContract");
        })

        it("Test", async () => {
            let originETHAmount = smallNum(await wallet_1.getBalance());
            console.log("originETHAmount", originETHAmount)
            let pairETHamount = await WETH.balanceOf(pair.address);
            console.log("pairETHamount", smallNum(pairETHamount), LPAmount)
            await yocswapRouterContract.connect(wallet_1).removeLiquidityETH(
                USDC.address,
                LPAmount,
                0,
                0,
                wallet_1.address,
                MaxUint256
            )

            let USDCAmount = smallNum_6(await USDC.balanceOf(wallet_1.address));
            console.log("USDCAmount", USDCAmount)
            let ETHAmount = smallNum(await wallet_1.getBalance());
            console.log("ETHAmount", ETHAmount)
        })
    })

    // describe("Swap", function () {
    //     it("swap ETH to DAI", async function () {
    //         let swapETHAmount = bigNum(500);

    //         let WETHAddr = await this.yocSwap.getWETH();
    //         let expectDAIAmount = await this.yocSwap.getExpectAmountOut(
    //             BigInt(swapETHAmount),
    //             [
    //                 WETHAddr,
    //                 daiAddr
    //             ]
    //         );

    //         let beforeBal = await this.DAI.balanceOf(deployer.address);
    //         await this.yocSwap.swapETHToToken(
    //             daiAddr,
    //             { value: BigInt(swapETHAmount) }
    //         );
    //         let afterBal = await this.DAI.balanceOf(deployer.address);

    //         expect(smallNum(afterBal) - smallNum(beforeBal)).to.be.closeTo(smallNum(expectDAIAmount), 0.1);
    //     })

    //     it("swap DAI to USDT", async function () {
    //         let swapDAIAmount = bigNum(1000);

    //         let expectUSDTAmount = await this.yocSwap.getExpectAmountOut(
    //             BigInt(swapDAIAmount),
    //             [
    //                 daiAddr,
    //                 usdtAddr
    //             ]
    //         );

    //         let beforeBal = await this.USDT.balanceOf(deployer.address);
    //         await this.DAI.approve(this.yocSwap.address, BigInt(swapDAIAmount));
    //         await this.yocSwap.swapTokenToToken(
    //             BigInt(swapDAIAmount),
    //             [
    //                 daiAddr,
    //                 usdtAddr
    //             ]
    //         );
    //         let afterBal = await this.USDT.balanceOf(deployer.address);

    //         expect(smallNum_6(afterBal) - smallNum_6(beforeBal)).to.be.closeTo(smallNum_6(expectUSDTAmount), 0.1);
    //     })

    //     it("swap DAI to ETH", async function () {
    //         let desiredETHAmount = bigNum(10);
    //         let WETHAddr = await this.yocSwap.getWETH();

    //         let requireDAIAmount = await this.yocSwap.getExpectAmountIn(
    //             BigInt(desiredETHAmount),
    //             [
    //                 daiAddr,
    //                 WETHAddr
    //             ]
    //         );

    //         let beforeETHBal = await ethers.provider.getBalance(deployer.address);
    //         await this.DAI.approve(this.yocSwap.address, BigInt(requireDAIAmount))
    //         await this.yocSwap.swapTokenToETH(
    //             BigInt(requireDAIAmount),
    //             daiAddr
    //         );
    //         let afterETHBal = await ethers.provider.getBalance(deployer.address);

    //         expect(smallNum(afterETHBal) - smallNum(beforeETHBal)).to.be.closeTo(smallNum(desiredETHAmount), 0.1);
    //     })

    //     it("add liquidity with ETH", async function () {
    //         let swapDAIAmount = bigNum(3000);
    //         let expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
    //             daiAddr,
    //             this.newUSDC.address,
    //             BigInt(swapDAIAmount)
    //         );
    //         expect(smallNum_6(expectTokenBAmount)).to.be.equal(0);

    //         let WETHAddr = await this.yocSwap.getWETH();
    //         expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
    //             daiAddr,
    //             WETHAddr,
    //             BigInt(swapDAIAmount)
    //         );

    //         expect(smallNum(expectTokenBAmount)).to.be.greaterThan(2);

    //         await this.DAI.approve(this.yocSwap.address, BigInt(swapDAIAmount));
    //         await this.yocSwap.addLiquidityETH(
    //             daiAddr,
    //             BigInt(swapDAIAmount),
    //             deployer.address,
    //             { value: BigInt(expectTokenBAmount) }
    //         );
    //     })

    //     it("add liquidity with token", async function () {
    //         let liquidityDAIAmount = bigNum(3000);
    //         let liquidityUSDCAmount = bigNum_6(12000);

    //         await this.DAI.approve(this.yocSwap.address, BigInt(liquidityDAIAmount));
    //         await this.newUSDC.approve(this.yocSwap.address, BigInt(liquidityUSDCAmount));
    //         await this.yocSwap.addLiquidity(
    //             daiAddr,
    //             this.newUSDC.address,
    //             BigInt(liquidityDAIAmount),
    //             BigInt(liquidityUSDCAmount),
    //             deployer.address,
    //         );

    //         let daiAmount = bigNum(100);
    //         let expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
    //             daiAddr,
    //             this.newUSDC.address,
    //             BigInt(daiAmount)
    //         );
    //         expect(smallNum_6(expectTokenBAmount)).to.be.equal(400);
    //         console.log();
    //     })
    // })
})