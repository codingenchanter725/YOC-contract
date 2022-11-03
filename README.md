# Basic Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```


## 1. Installation
```shell
npm install
```

## 2. Hardhat config
Input the private key for your wallet account in hardhat.config.js file
![image](https://user-images.githubusercontent.com/86672166/178158057-5d074268-45ee-46f5-b4a2-063089fdcac0.png)


## 3. Hardhat project compile
```shell
npx hardhat compile
```

## 4. Deploy smart contract

### -Deploy All Smart Contract
```shell
npx hardhat run --network testnet scripts/deploys.js
```
  Parameter description: <br>
    First Parameter: USDC contract address(0xe11a86849d99f524cac3e7a0ec1241828e332c62)
    <br>
    Second Parameter: Deployed FNDR contract address
    <br>
    Third Parameter: Deployed ProfileManage contract address
    <br>
    Fourth Parameter: Deployed ProjectManage contract address
    
- Run the follow command

```shell
npx hardhat run --network testnet scripts/task.js
```

## 5. Integrate with frontend code

- Copy all files in `` src / artifacts / contracts `` and paste to `` src / contracts / abi `` folder in frontend project
- Copy the deployed ``ProfileManage``, ``ProjectManage``, ``Task`` contract addresses and paste to ``src / contracts / contracts.ts`` in frontend project

goerli network:
ProjectManage Address:  0x0Bb28a8B486Eb89a11a1655a9DD7B66541A07cbf
USDC Address:  0x060dcdf67cdD70d17a877c402675323D19b4EaFe
ProjectDetail Address:  0x6e21D5b02708F9566E81EB87fb047D5A1bEE02A5

0x517547C300891C0858dDC1F1694269997a4BFc89 