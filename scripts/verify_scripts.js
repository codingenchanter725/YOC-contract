const hre = require('hardhat');
const fs = require('fs');

async function main() {
    // Retrieve the contract's bytecode and ABI
    const contractName = 'YOC';
    const constructorArguments = [];
    // Deploy the contract to the network
    const MyContract = await hre.ethers.getContractFactory(contractName);
    const myContract = await MyContract.deploy(...constructorArguments);
    await myContract.deployed();

    console.log(`Contract deployed to: ${myContract.address}`);

    await myContract.deployTransaction.wait(5);

    // Verify the contract using Hardhat's built-in task
    await hre.run('verify:verify', {
        address: myContract.address,
        contract: "contracts/YOC.sol:YOC",
        constructorArguments,
        libraries: {},
    });

    console.log(`Contract verified on Etherscan!`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
