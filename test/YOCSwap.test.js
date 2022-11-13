const { expect } = require('chai');
const { ethers } = require('hardhat');
const { erc20_abi } = require('../external_abi/erc20.abi.json');

const bigNum = num => (num + '0'.repeat(18));
const smallNum = num => (parseInt(num) / bigNum(1));
const bigNum_6 = num => (num + '0'.repeat(6));
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

describe ("Test YOCSwap", function () {
    let routerAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    let daiAddr = "0x6b175474e89094c44da98b954eedeac495271d0f";
    let usdtAddr = "0xdac17f958d2ee523a2206206994597c13d831ec7";
    before (async function () {
        [
            this.deployer,
            this.wallet_1,
            this.wallet_2,
            this.wallet_3,
            this.feeReceiver_1
        ] = await ethers.getSigners();

        let yocSwapFactory = await ethers.getContractFactory("YOCSwap");
        this.yocSwap = await yocSwapFactory.deploy(routerAddr);
        await this.yocSwap.deployed();

        let usdcFactory = await ethers.getContractFactory("USDC");
        this.newUSDC = await usdcFactory.deploy();
        await this.newUSDC.deployed();

        this.DAI = new ethers.Contract(daiAddr, erc20_abi, this.deployer);
        this.USDT = new ethers.Contract(usdtAddr, erc20_abi, this.deployer);
    })

    it ("check", async function () {
        console.log("deployed successfully");
    })

    describe ("Swap", function () {
        it("swap ETH to DAI", async function () {
            let swapETHAmount = bigNum(500);

            let WETHAddr = await this.yocSwap.getWETH();
            let expectDAIAmount = await this.yocSwap.getExpectAmountOut(
                BigInt(swapETHAmount),
                [
                    WETHAddr,
                    daiAddr
                ]
            );

            let beforeBal = await this.DAI.balanceOf(this.deployer.address);
            await this.yocSwap.swapETHToToken(
                daiAddr,
                { value: BigInt(swapETHAmount) }
            );
            let afterBal = await this.DAI.balanceOf(this.deployer.address);

            expect(smallNum(afterBal) - smallNum(beforeBal)).to.be.closeTo(smallNum(expectDAIAmount), 0.1);
        })

        it ("swap DAI to USDT", async function () {
            let swapDAIAmount = bigNum(1000);

            let expectUSDTAmount = await this.yocSwap.getExpectAmountOut(
                BigInt(swapDAIAmount),
                [
                    daiAddr,
                    usdtAddr
                ]
            );

            let beforeBal = await this.USDT.balanceOf(this.deployer.address);
            await this.DAI.approve(this.yocSwap.address, BigInt(swapDAIAmount));
            await this.yocSwap.swapTokenToToken(
                BigInt(swapDAIAmount),
                [
                    daiAddr,
                    usdtAddr
                ]
            );
            let afterBal = await this.USDT.balanceOf(this.deployer.address);

            expect(smallNum_6(afterBal) - smallNum_6(beforeBal)).to.be.closeTo(smallNum_6(expectUSDTAmount), 0.1);
        })

        it("swap DAI to ETH", async function () {
            let desiredETHAmount = bigNum(10);
            let WETHAddr = await this.yocSwap.getWETH();
            
            let requireDAIAmount = await this.yocSwap.getExpectAmountIn(
                BigInt(desiredETHAmount),
                [
                    daiAddr,
                    WETHAddr
                ]
            );

            let beforeETHBal = await ethers.provider.getBalance(this.deployer.address);
            await this.DAI.approve(this.yocSwap.address, BigInt(requireDAIAmount))
            await this.yocSwap.swapTokenToETH(
                BigInt(requireDAIAmount),
                daiAddr
            );
            let afterETHBal = await ethers.provider.getBalance(this.deployer.address);
            
            expect (smallNum(afterETHBal) - smallNum(beforeETHBal)).to.be.closeTo(smallNum(desiredETHAmount), 0.1);
        })

        it("add liquidity with ETH", async function () {
            let swapDAIAmount = bigNum(3000);
            let expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
                daiAddr,
                this.newUSDC.address,
                BigInt(swapDAIAmount)
            );
            expect (smallNum_6(expectTokenBAmount)).to.be.equal(0);

            let WETHAddr = await this.yocSwap.getWETH();
            expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
                daiAddr,
                WETHAddr,
                BigInt(swapDAIAmount)
            );

            expect (smallNum(expectTokenBAmount)).to.be.greaterThan(2);

            await this.DAI.approve(this.yocSwap.address, BigInt(swapDAIAmount));
            await this.yocSwap.addLiquidityETH(
                daiAddr,
                BigInt(swapDAIAmount),
                this.deployer.address,
                {value: BigInt(expectTokenBAmount)}
            );
        })

        it("add liquidity with token", async function () {
            let liquidityDAIAmount = bigNum(3000);
            let liquidityUSDCAmount = bigNum_6(12000);

            await this.DAI.approve(this.yocSwap.address, BigInt(liquidityDAIAmount));
            await this.newUSDC.approve(this.yocSwap.address, BigInt(liquidityUSDCAmount));
            await this.yocSwap.addLiquidity(
                daiAddr,
                this.newUSDC.address,
                BigInt(liquidityDAIAmount),
                BigInt(liquidityUSDCAmount),
                this.deployer.address,
            );

            let daiAmount = bigNum(100);
            let expectTokenBAmount = await this.yocSwap.expectLiquidityAmount(
                daiAddr,
                this.newUSDC.address,
                BigInt(daiAmount)
            );
            expect(smallNum_6(expectTokenBAmount)).to.be.equal(400);
            console.log();
        })
    })
})