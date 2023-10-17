const { expect } = require('chai');
const { Contract, constants } = require("ethers");
const { MaxUint256, AddressZero, Zero } = constants;
const { ethers } = require('hardhat');
const { erc20_abi } = require('../external_abi/erc20.abi.json');

const bigNum = num => (num + '0'.repeat(18));
const smallNum = num => (parseInt(num) / bigNum(1));
const bigNum_6 = num => (num + '0'.repeat(6));
const smallNum_6 = num => (parseInt(num) / bigNum_6(1));

const overrides = {
    gasLimit: 9999999
}

describe("Test ProjectTrade Contract", function () {
    let YUSD, PToken, ProjectTrade;
    let deployer, wallet_1, wallet_2, wallet_3, wallet_tresury;
    before(async function () {
        [
            deployer,
            wallet_1,
            wallet_2,
            wallet_3,
            wallet_tresury,
        ] = await ethers.getSigners();

        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        const _YUSD = await hre.ethers.getContractFactory("ERC20_TOKEN");
        YUSD = await _YUSD.deploy("YUSD Token", "YUSD", 6);
        await YUSD.deployed();

        const _PToken = await hre.ethers.getContractFactory("ERC20_TOKEN");
        PToken = await _PToken.deploy("PToken Token", "PToken", 18);
        await PToken.deployed();

        const _ProjectTrade = await hre.ethers.getContractFactory('ProjectTrade');
        ProjectTrade = await _ProjectTrade.deploy(YUSD.address, wallet_tresury.address);
        await ProjectTrade.deployed();

        await PToken.transfer(wallet_1.address, bigNum(10000));
        await YUSD.transfer(wallet_1.address, bigNum_6(10000));
    })

    it("Sell and Buy", async function () {
        await PToken.connect(wallet_1).approve(ProjectTrade.address, bigNum(1000));
        console.log("<=== Sell 100 PToken for 90 YUSD ===>");
        console.log("PToken Amount:", smallNum(await PToken.balanceOf(wallet_1.address)));
        await ProjectTrade.connect(wallet_1).sell(PToken.address, bigNum(1000), bigNum_6(90));
        console.log("PToken Amount:", smallNum(await PToken.balanceOf(wallet_1.address)));
        console.log("PToken of Trade Contract Amount:", smallNum(await PToken.balanceOf(ProjectTrade.address)));

        console.log("<=== Buy 10 PToken for 90 YUSD ===>");
        console.log("set 100 YUSD per PToken as admin");
        await ProjectTrade.setPriceByAdmin(PToken.address, bigNum_6(100));
        await YUSD.connect(wallet_1).approve(ProjectTrade.address, bigNum_6(10000));
        console.log("YUSD Amount:", smallNum_6(await YUSD.balanceOf(wallet_1.address)));
        await ProjectTrade.connect(wallet_1).buy(PToken.address, bigNum(10), bigNum_6(100));
        console.log("YUSD Amount:", smallNum_6(await YUSD.balanceOf(wallet_1.address)));
        console.log("YUSD of Trade Contract Amount:", smallNum_6(await YUSD.balanceOf(ProjectTrade.address)));

        console.log("Buy   Orders:", await ProjectTrade.getBuyOrders(PToken.address));
        console.log("Sell  Orders:", await ProjectTrade.getSellOrders(PToken.address));
        console.log("Transactions:", await ProjectTrade.getTransactions(PToken.address));
    })
})

const delay = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
}