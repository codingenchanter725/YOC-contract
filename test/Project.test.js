const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BigNumber, constants: { MaxUint256 }, Contract } = require("ethers")

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
    let projectManager, projectDetail, projectAddresses, USDC, ProjectTrade, YUSD, yocFarming, YOC;
    let deployer
    let teamWallet
    let wallet0, wallet1, wallet2, wallet3

    beforeEach(async () => {
        [
            deployer,
            teamWallet,
            wallet0, wallet1, wallet2, wallet3
        ] = await ethers.getSigners()

        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());

        const USDCFactory = await ethers.getContractFactory("USDC");
        USDC = await USDCFactory.deploy();
        await USDC.deployed();
        console.log("USDC Address: ", USDC.address);
        await USDC.transfer(wallet0.address, ethers.utils.parseUnits("5000", 6));
        await USDC.transfer(wallet1.address, ethers.utils.parseUnits("2000", 6));
        await USDC.transfer(wallet2.address, ethers.utils.parseUnits("3000", 6));

        const _projectDetailFactory = await ethers.getContractFactory("ProjectDetail");
        projectDetail = await _projectDetailFactory.deploy();
        await projectDetail.deployed();
        console.log("ProjectDetail Address: ", projectDetail.address);

        const _YOC = await ethers.getContractFactory("YOC")
        YOC = await _YOC.deploy('YOC', "YOC", 16);
        const _yocFarmingContract = await ethers.getContractFactory("YOCMasterChef")
        yocFarming = await _yocFarmingContract.deploy(
            YOC.address,
            teamWallet.address
        )
        console.log("yocFarming Address: ", yocFarming.address);
        YOC.addAuthorizedUser(yocFarming.address)

        const _YUSD = await hre.ethers.getContractFactory("ERC20_TOKEN");
        YUSD = await _YUSD.deploy("YUSD Token", "YUSD", 6);
        await YUSD.deployed();
        console.log("YUSD Address: ", YUSD.address);

        const _ProjectTrade = await hre.ethers.getContractFactory('ProjectTrade');
        ProjectTrade = await _ProjectTrade.deploy(USDC.address, teamWallet.address);
        await ProjectTrade.deployed();
        console.log("ProjectTrade Address: ", ProjectTrade.address);

        const _projectManageFactory = await ethers.getContractFactory("ProjectManage");
        projectManager = await _projectManageFactory.deploy(yocFarming.address, ProjectTrade.address);
        await projectManager.deployed();
        console.log("ProjectManage Address: ", projectManager.address);
        await yocFarming.addAuthorizedUser(projectManager.address);

        // const TokenTemplateFactory = await hre.ethers.getContractFactory("TokenTemplate");
        // const TokenTemplateContract = await TokenTemplateFactory.deploy("YTEST Token", "YTEST", 10000 * 10 ** 6, 6, 6000 * 10 ** 6, deployer.address);
        // await TokenTemplateContract.deployed();
        // console.log("TokenTemplate Address: ", TokenTemplateContract.address);
        // console.log("TokenTemplate Complete!\n\n\n\n");

        // const investToken = "0x500bdA7d9c1371cA11fe5e82e12C9fe1A520A8f1", royality = 80, APR = 80, ongoingPercent = 75; // USDC
        // const projectFactory = await hre.ethers.getContractFactory("Project");
        // const projectContract = await projectFactory.deploy(
        //     ["YTEST", "YTEST DESCRIPTION", "Category", "localhost:ddd", "/images/coins/YOCb.png", "/images/coins/YOCb.png"],
        //     [1 * 1000, royality, APR, 1685176168423, 1685176268423, ongoingPercent],
        //     [TokenTemplateContract.address, investToken],
        //     6000 * 10 ** 6
        // );
        // await projectContract.deployed();
        // console.log("Project Address: ", projectContract.address)
        // console.log("Project Complete!\n\n\n\n");
    })

    describe("Project", () => {
        beforeEach(async () => {
            let title = "YTEST", decimals = "6", desc = 'YTEST description', category = 'category example', projectWebsite = 'localhost:222',
                iconUrl = "/images/coins/YOCb.png", symbolUrl = "/images/coins/YOCb.png", price = "1", apr = "80", roi = "80", multiplier = '10',
                startDate = (new Date()).getTime() - 1000 * 60 * 60 * 24 * 10 + "",
                endDate = (new Date()).getTime() + 1000 * 60 * 60 * 24 * 4 + "",
                ongoingPercent = 80, total = "10000", sellPercent = 50, tokenWallet = USDC.address;
            console.log(startDate, new Date(+startDate));
            await projectManager.createProject(
                `${title} Token`,
                "YTEST",
                ethers.utils.parseUnits(total, decimals),
                ethers.utils.parseUnits(decimals, 0),
                ethers.utils.parseUnits(((Number(total) * Number(sellPercent)) / 100).toFixed(2), decimals),
                [title, desc, category, projectWebsite, iconUrl, symbolUrl],
                [ethers.utils.parseUnits(price, decimals), ethers.utils.parseUnits(roi, 0), ethers.utils.parseUnits(startDate, 0), ethers.utils.parseUnits(endDate, 0), ongoingPercent, ethers.utils.parseUnits(multiplier, 0),],
                [USDC.address, wallet3.address],
                { gasLimit: 7000000 }
            )

            projectAddresses = await projectManager.getProjectAllContract();
            console.log(projectAddresses[0]);
        })

        it("get the details", async () => {
            const details = await projectDetail.getProjectDetails(projectAddresses[0], deployer.address);
            console.log(details);
        })

        it("BuyToken", async () => {
            const projectFactory = await ethers.getContractFactory("Project");
            const projectContract = await projectFactory.attach(projectAddresses[0]);

            let endDate = await projectContract.endDate();
            console.log('endDate', endDate);

            // await USDC.connect(wallet0).approve(projectAddresses[0], ethers.utils.parseUnits("2000", 6));
            // await projectContract.connect(wallet0).participate(ethers.utils.parseUnits("2000", 6), ethers.utils.parseUnits("2000", 6));

            await USDC.connect(wallet1).approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            await projectContract.connect(wallet1).participate(ethers.utils.parseUnits("1000", 6), ethers.utils.parseUnits("1000", 6));

            // console.log("admin deposit");
            // await USDC.approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            // await projectContract.makeDepositProfit(ethers.utils.parseUnits("1000", 6));
            // console.log("admin deposit end");

            let yocAmount = await YOC.balanceOf(projectContract.address);
            console.log('yocAmount', yocAmount);
            let shareRes0 = await projectContract.investEarnAmountCheck(wallet0.address);
            console.log('reward0', shareRes0);
            let shareRes1 = await projectContract.investEarnAmountCheck(wallet1.address);
            console.log('reward1', shareRes1);
            // await projectContract.claimInvestEarn();

            endDate = await projectContract.endDate();
            console.log('endDate', endDate);

            // manualMoveTrade section
            await USDC.connect(wallet2).approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            await projectContract.connect(wallet2).participate(ethers.utils.parseUnits("1000", 6), ethers.utils.parseUnits("1000", 6));
            endDate = await projectContract.endDate();
            console.log('endDate', endDate);

            await USDC.connect(wallet2).approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            await projectContract.connect(wallet2).participate(ethers.utils.parseUnits("1000", 6), ethers.utils.parseUnits("1000", 6));

            yocAmount = await YOC.balanceOf(projectContract.address);
            console.log('project yocAmount', yocAmount);
            let shareRes2 = await projectContract.investEarnAmountCheck(wallet2.address);
            console.log('reward2', shareRes2);

            // await projectContract.connect(wallet0).claimInvestEarn();
            // yocAmount = await YOC.balanceOf(wallet0.address);
            // console.log('wallet0 yocAmount', yocAmount);
            // // await projectContract.connect(wallet0).claimInvestEarn();

            // let shareRes3 = await projectContract.investEarnAmountCheck(wallet0.address);
            // console.log('reward', shareRes3)
            // // let res0 = await projectContract.profitWalletAmountCheck(wallet0.address);
            // // console.log(res0);

            // let manualMoveTradeTx = await projectContract.manualMoveTrade();
            // await manualMoveTradeTx.wait();

            // let res0 = await projectDetail.getProjectDetails(projectAddresses[0], wallet0.address);
            // console.log(res0);
            let res1 = await projectDetail.getProjectDetails(projectAddresses[0], wallet1.address);
            console.log(res1);

            let USDCAmountOfProjectWallet = await USDC.balanceOf(wallet3.address);
            console.log('USDCAmountOfProjectWallet', ethers.utils.formatUnits(USDCAmountOfProjectWallet, 6))
        })
    })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}