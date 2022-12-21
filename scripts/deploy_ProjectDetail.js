// import { ethers } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    // const yocTokenAddress = "0x517547C300891C0858dDC1F1694269997a4BFc89";
    const ProjectDetail = await ethers.getContractFactory("ProjectDetail");
    const ProjectDetail_addr = await ProjectDetail.deploy();
    await ProjectDetail_addr.deployed();
    console.log("ProjectDetail Address: ", ProjectDetail_addr.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });