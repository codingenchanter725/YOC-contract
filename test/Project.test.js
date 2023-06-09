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
    let projectManageContract, projectDetailContract, projectAddresses, USDCContract;
    let deployer
    let teamWallet
    let wallet0, wallet1, wallet2

    beforeEach(async () => {
        [
            deployer,
            teamWallet,
            wallet0, wallet1, wallet2
        ] = await ethers.getSigners()

        console.log("Deploying contracts with the account:", deployer.address);
        console.log("Account balance:", (await deployer.getBalance()).toString());


        const USDCFactory = await ethers.getContractFactory("USDC");
        USDCContract = await USDCFactory.deploy();
        await USDCContract.deployed();
        console.log("USDC Address: ", USDCContract.address);
        await USDCContract.transfer(wallet0.address, ethers.utils.parseUnits("4000", 6));
        await USDCContract.transfer(wallet1.address, ethers.utils.parseUnits("1000", 6));

        const _projectManageFactory = await ethers.getContractFactory("ProjectManage");
        projectManageContract = await _projectManageFactory.deploy();
        await projectManageContract.deployed();
        console.log("ProjectManage Address: ", projectManageContract.address);

        const _projectDetailFactory = await ethers.getContractFactory("ProjectDetail");
        projectDetailContract = await _projectDetailFactory.deploy();
        await projectDetailContract.deployed();
        console.log("ProjectDetail Address: ", projectDetailContract.address);

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
                iconUrl = "/images/coins/YOCb.png", symbolUrl = "/images/coins/YOCb.png", price = "1", apr = "80", roi = "80",
                startDate = (new Date()).getTime() - 1000 * 60 * 60 * 24 * 10 + "",
                endDate = (new Date()).getTime() + 1000 * 60 * 60 * 24 * 4 + "",
                ongoingPercent = 75, total = "10000", sellPercent = 60, tokenWallet = USDCContract.address;
                console.log(startDate, new Date(+startDate));
            await projectManageContract.createProject(
                `${title} Token`,
                "YTEST",
                ethers.utils.parseUnits(total, decimals),
                ethers.utils.parseUnits(decimals, 0),
                ethers.utils.parseUnits(((Number(total) * Number(sellPercent)) / 100).toFixed(2), decimals),
                [title, desc, category, projectWebsite, iconUrl, symbolUrl],
                [ethers.utils.parseUnits(price, 3), ethers.utils.parseUnits(roi, 0), ethers.utils.parseUnits(apr, 0), ethers.utils.parseUnits(startDate, 0), ethers.utils.parseUnits(endDate, 0), ongoingPercent],
                tokenWallet,
                { gasLimit: 5000000 }
            )

            projectAddresses = await projectManageContract.getProjectAllContract();
            console.log(projectAddresses[0]);
        })

        it("get the details", async () => {
            const details = await projectDetailContract.getProjectDetails(projectAddresses[0], deployer.address);
            console.log(details);
        })

        it("BuyToken", async () => {
            const projectFactory = await ethers.getContractFactory("Project");
            const projectContract = await projectFactory.attach(projectAddresses[0]);

            await USDCContract.connect(wallet0).approve(projectAddresses[0], ethers.utils.parseUnits("4000", 6));
            await projectContract.connect(wallet0).participate(ethers.utils.parseUnits("4000", 6), ethers.utils.parseUnits("1000", 6));

            await USDCContract.connect(wallet1).approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            await projectContract.connect(wallet1).participate(ethers.utils.parseUnits("1000", 6), ethers.utils.parseUnits("1000", 6));

            console.log("admin deposit");
            await USDCContract.approve(projectAddresses[0], ethers.utils.parseUnits("1000", 6));
            await projectContract.makeDepositProfit(ethers.utils.parseUnits("1000", 6));
            console.log("admin deposit end");

            let res0 = await projectContract.profitWalletAmountCheck(wallet0.address);
            console.log(res0);
            let res1 = await projectDetailContract.getProjectDetails(projectAddresses[0], wallet0.address);
            console.log(res1);
        })
    })
})

const delay = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}