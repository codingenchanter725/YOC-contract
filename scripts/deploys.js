// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    console.log("Account balance:", (await deployer.getBalance()).toString());


    // const ProjectManage = await ethers.getContractFactory("ProjectManage");
    // const ProjectManage_addr = await ProjectManage.deploy();
    // await ProjectManage_addr.deployed();
    // console.log("ProjectManage Address: ", ProjectManage_addr.address);

    // const USDC = await ethers.getContractFactory("USDC");
    // const USDC_addr = await USDC.deploy();
    // await USDC_addr.deployed();
    // console.log("USDC Address: ", USDC_addr.address);

    let routerAddr = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const swap = await ethers.getContractFactory("YOCSwap");
    const swap_addr = await swap.deploy(routerAddr);
    await swap_addr.deployed();
    console.log("swap Address: ", swap_addr.address);


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });