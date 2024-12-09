const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Тестнет адрес
    const FACTORY_ADDRESS = "0x4E476Aae0763dC0511BFD0d98688525c53601c07";
    
    const factory = await hre.ethers.getContractAt("contracts/TokenFactory.sol:TokenFactory", FACTORY_ADDRESS);
    
    const tokenParams = {
        name: "Test Token V11",
        symbol: "TEST11",
        totalSupply: hre.ethers.parseEther("1000000"),
        whitelist: [deployer.address],
        buyTax: 5,
        sellTax: 99,
        walletTax: 2,
        logoUrl: "https://example.com/logo.png",
        mintable: true,
        maxSupply: hre.ethers.parseEther("2000000")
    };

    const fee = await factory.fee();
    console.log("Fee:", hre.ethers.formatEther(fee), "BNB");

    const tx = await factory.createToken(tokenParams, { value: fee });
    console.log("Tx hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("\nTransaction data:", tx.data);
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Gas price:", receipt.gasPrice.toString());
}

main()
    .then(() => process.exit(0))
    .catch(console.error);