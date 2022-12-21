const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  const YocswapFactory = await hre.ethers.getContractFactory("YocswapFactory");
  const yocswapFactory = await YocswapFactory.deploy(owner.address);
  await yocswapFactory.deployed();

  console.log("Owner address :", owner.address);
  console.log("YocswapFactory deployed to:", yocswapFactory.address);

  // const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
  // const YocswapRouter = await hre.ethers.getContractFactory("YocswapRouter");
  // const yocswapRouter = await YocswapRouter.deploy(yocswapFactory.address, WBNB);
  // await yocswapRouter.deployed();

  // console.log("YocswapRouter deployed to:", yocswapRouter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
