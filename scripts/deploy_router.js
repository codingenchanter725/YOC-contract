const hre = require("hardhat");

async function main() {
  const factory = "0xF83152A0F464b1723E2c45755A5571cDeA096EC9";
  const WBNB = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";
  
  const YocswapRouter = await hre.ethers.getContractFactory("YocswapRouter");
  const yocswapRouter = await YocswapRouter.deploy(factory, WBNB);
  await yocswapRouter.deployed();

  console.log("YocswapRouter deployed to:", yocswapRouter.address);

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
