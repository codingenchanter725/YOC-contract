const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    for (let index = 1; index <= 5; index++) {
        const _ERC20YocToken = await hre.ethers.getContractFactory("contracts/test/ERC20.sol:ERC20");
        const constructorArguments = [
            "YOC-FoundersCoin for Liquidity", `YOC${index}`
        ]
        console.log(`${index}: start deploy`);
        const ERC20YocToken = await _ERC20YocToken.deploy(...constructorArguments);
        console.log(`${index}: processing deploy`);
        await ERC20YocToken.deployed();
        console.log(`${index}: end deploy`);
        console.log(`ERC20YocToken${index} Address: `, ERC20YocToken.address);
        await ERC20YocToken.deployTransaction.wait(5);

        try {
            await hre.run('verify:verify', {
                address: ERC20YocToken.address,
                contract: `contracts/Token.sol:TOKEN`,
                constructorArguments: constructorArguments
            })
        } catch (e) {
            console.log(e);
        }
        console.log(`ERC20YocToken${index} Complete!\n\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });