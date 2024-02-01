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

const WBNB = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd";
const WETH_SEPOLIA = "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9";

describe("Test YUSD", function () {
    let yocswapRouterContract, yocswapContract, USDC, YOC, WETH, YUSD, TOKENPoolContract, yocMasterChefContract;
    let deployer, wallet_1, wallet_2, wallet_3, wallet_admin;
    before(async function () {
        [
            deployer,
            wallet_1,
            wallet_2,
            wallet_3,
            wallet_admin,
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

        const YOCFactory = await hre.ethers.getContractFactory("YOC");
        YOC = await YOCFactory.deploy('YOCe', 'YOCe', 18);
        await YOC.deployed();
        console.log("YOC Address: ", YOC.address);

        const YUSDFactory = await hre.ethers.getContractFactory("YUSD");
        YUSD = await YUSDFactory.deploy(WETH.address, YOC.address, yocswapRouterContract.address, deployer.address, "0x694AA1769357215DE4FAC081bf1f309aDC325306"); // Sepolia
        // YUSD = await YUSDFactory.deploy(WETH.address, YOC.address, yocswapRouterContract.address, deployer.address, "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"); // bsc testnet
        await YUSD.deployed();
        console.log("YUSD Address:", YUSD.address);

        const yocMasterChefFactory = await hre.ethers.getContractFactory("YOCMasterChef");
        yocMasterChefContract = await yocMasterChefFactory.deploy(YOC.address, deployer.address);
        await yocMasterChefContract.deployed();
        console.log("YocMasterChef Address:", yocMasterChefContract.address + "\n");
        await YOC.addAuthorizedUser(yocMasterChefContract.address);
    })

    it("staking", async function () {
        // create USDC staking contract

        const _dummyToken = await ethers.getContractFactory("TOKEN")
        const dummyToken = await _dummyToken.deploy("Dummy Token", "Dummy");
        await dummyToken.deployed();
        await yocMasterChefContract.add(
            10, dummyToken.address, false, false,
            { ...overrides }
        )
        const TOKENPoolContractFactory = await hre.ethers.getContractFactory("TokenStaking");
        TOKENPoolContract = await TOKENPoolContractFactory.deploy(
            USDC.address,
            YOC.address,
            yocMasterChefContract.address,
            deployer.address,
            0
        )
        console.log("YOCStakingPool Address: ", TOKENPoolContract.address);
        await dummyToken.approve(
            TOKENPoolContract.address,
            MaxUint256,
        );
        await TOKENPoolContract.init(
            dummyToken.address
        )

        // USDC stake by wallet_1
        await USDC.transfer(wallet_1.address, bigNum_6(1000));
        await USDC.connect(wallet_1).approve(TOKENPoolContract.address, bigNum_6(100));
        await TOKENPoolContract.connect(wallet_1).deposit(bigNum_6(100));
        console.log("stake successfull")
        await delay(1000);
        await TOKENPoolContract.connect(wallet_1).withdraw(0);
        let YOCamount = smallNum(await YOC.balanceOf(wallet_1.address));
        console.log("withdraw and get YOC", YOCamount);

        // ETH-YOC pool create
        await YOC.connect(wallet_1).approve(yocswapRouterContract.address, MaxUint256);
        await yocswapRouterContract.connect(wallet_1).addLiquidityETH(
            YOC.address,
            bigNum(10000),
            0,
            0,
            wallet_1.address,
            MaxUint256, {
            value: bigNum(10)
        }
        )
        console.log("add liquidity ETH/YOC");
        let amounts = await yocswapRouterContract.getAmountsOut(
            bigNum(1),
            [WETH.address, YOC.address]
        );
        console.log("1ETH->YOC", smallNum(amounts[1]));
        let ETHPrice = smallNum_6(await YUSD.getETHPrice());
        console.log("Current ETHPrice", ETHPrice, "\n");

        // //  Mint
        // console.log("<============ Mint YUSD =============>")
        // let requireETHAmount = await YUSD.getETHAmountForMint(100);
        // console.log("require ETH", smallNum(requireETHAmount));
        // await YUSD.connect(wallet_2).mint(100, {
        //     value: requireETHAmount
        // });
        // let amount = smallNum_6(await YUSD.balanceOf(wallet_2.address));
        // console.log("<=== Mint 100 YUSD ===>")
        // console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));
        // console.log("ETH of YUSD contract", smallNum(await ethers.provider.getBalance(YUSD.address)));
        // console.log("YOC of YUSD contract", smallNum(await YOC.balanceOf(YUSD.address)));
        // console.log("ETH Percentage", (await YUSD.rate()) / 100);
        // console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");
        // console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));

        // await YUSD.connect(wallet_2).transfer(wallet_3.address, bigNum_6(100));

        
        //  Mint With YOC
        console.log("<============ Mint YUSD WITH YOC =============>")
        await TOKENPoolContract.connect(wallet_1).withdraw(0);
        YOCamount = smallNum(await YOC.balanceOf(wallet_1.address));
        console.log("withdraw and get YOC", YOCamount);

        let requireYOCAmount = await YUSD.getYOCAmountForMint(100);
        console.log("require YOC", smallNum(requireYOCAmount));
        await YOC.connect(wallet_1).transfer(wallet_2.address, requireYOCAmount);
        await YOC.connect(wallet_2).approve(YUSD.address, requireYOCAmount);
        await YUSD.connect(wallet_2).mintWithYOC(100);
        let amount = smallNum_6(await YUSD.balanceOf(wallet_2.address));
        console.log("<=== Mint 100 YUSD ===>")
        console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));
        console.log("ETH of YUSD contract", smallNum(await ethers.provider.getBalance(YUSD.address)));
        console.log("YOC of YUSD contract", smallNum(await YOC.balanceOf(YUSD.address)));
        console.log("ETH Percentage", (await YUSD.rate()) / 100);
        console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");
        console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));

        await YUSD.connect(wallet_2).transfer(wallet_3.address, bigNum_6(100));
/*
        // Burn
        console.log("<============ Burn YUSD =============>")
        console.log("wallet_3 ETH", smallNum(await wallet_3.getBalance()));
        console.log("wallet_3 YOC", smallNum(await YOC.balanceOf(wallet_3.address)));
        console.log("wallet_3 YUSD", smallNum_6(await YUSD.balanceOf(wallet_3.address)));
        await YUSD.connect(wallet_3).burn(10);
        console.log("<=== Burn 10 YUSD ===>")
        console.log("wallet_3 ETH", smallNum(await wallet_3.getBalance()));
        console.log("wallet_3 YOC", smallNum(await YOC.balanceOf(wallet_3.address)));
        console.log("wallet_3 YUSD", smallNum_6(await YUSD.balanceOf(wallet_3.address)));
        console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));
        console.log("ETH of YUSD contract", smallNum(await ethers.provider.getBalance(YUSD.address)));
        console.log("YOC of YUSD contract", smallNum(await YOC.balanceOf(YUSD.address)));
        console.log("ETH Percentage", (await YUSD.rate()) / 100);
        console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");


        console.log("<============ Set admin wallet =============>");
        await YUSD.setAdmin(wallet_admin.address);
        
        console.log("<============ Set auto function1 action =============>");
        await YUSD.connect(wallet_admin).setAutoFunction1Action(true);
        console.log("setAutoFunction1Action", await YUSD.autoFunction1Action());


        {
            console.log("<============ ETH/YOC pool is changed for function1! ============>")
            await yocswapRouterContract.connect(wallet_1).swapExactETHForTokens(
                0,
                [WETH.address, YOC.address],
                wallet_1.address,
                MaxUint256, 
                {
                    value: bigNum(15)
                }
            );
            console.log("ETH Percentage", (await YUSD.rate()) / 100);
            console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");

            console.log("\n<============ Function1 =============>");
            await YUSD.connect(wallet_admin).function1();
            console.log("wallet_admin ETH", smallNum(await wallet_admin.getBalance()));
            console.log("wallet_admin YOC", smallNum(await YOC.balanceOf(wallet_admin.address)));
            console.log("wallet_admin YUSD", smallNum_6(await YUSD.balanceOf(wallet_admin.address)));
            console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));
            console.log("ETH of YUSD contract", smallNum(await ethers.provider.getBalance(YUSD.address)));
            console.log("YOC of YUSD contract", smallNum(await YOC.balanceOf(YUSD.address)));
            console.log("ETH Percentage", (await YUSD.rate()) / 100);
            console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");
        }

        {
            // console.log("<============ ETH/YOC pool is changed for function2! ETH:20% ============>")
            // await yocswapRouterContract.connect(wallet_1).swapExactETHForTokens(
            //     0,
            //     [WETH.address, YOC.address],
            //     wallet_1.address,
            //     MaxUint256,
            //     {
            //         value: bigNum(4)
            //     }
            // );
            
            // // await TOKENPoolContract.connect(wallet_1).withdraw(0);
            // // let YOCamount = smallNum(await YOC.balanceOf(wallet_1.address));
            // // console.log("withdraw and get YOC", YOCamount);
            // // await yocswapRouterContract.connect(wallet_1).swapExactTokensForETH(
            // //     bigNum(14000),
            // //     0,
            // //     [YOC.address, WETH.address],
            // //     wallet_1.address,
            // //     MaxUint256
            // // );

            // console.log("ETH Percentage", (await YUSD.rate()) / 100);
            // console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");

            // console.log("\n<============ Function2 =============>");
            // console.log("detailsByFunction2", await YUSD.connect(wallet_admin).getReblancedDetailByFunction2())
            // await YUSD.connect(wallet_admin).function2();
            // console.log("wallet_admin ETH", smallNum(await wallet_admin.getBalance()));
            // console.log("wallet_admin YOC", smallNum(await YOC.balanceOf(wallet_admin.address)));
            // console.log("wallet_admin YUSD", smallNum_6(await YUSD.balanceOf(wallet_admin.address)));
            // console.log("YUSD Totalsupply", smallNum_6(await YUSD.totalSupply()));
            // console.log("ETH of YUSD contract", smallNum(await ethers.provider.getBalance(YUSD.address)));
            // console.log("YOC of YUSD contract", smallNum(await YOC.balanceOf(YUSD.address)));
            // console.log("ETH Percentage", (await YUSD.rate()) / 100);
            // console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");
        }
*/
        // console.log("<=== Burn 100 YUSD ===>")
        // await YUSD.connect(wallet_3).burn(100);
        // console.log("ETH Percentage", (await YUSD.rate()) / 100);
        // console.log("YUSD price", smallNum_6(await YUSD.price()), "\n");
    })
})

const delay = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
}