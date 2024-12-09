const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Параметры токена в формате структуры TokenParams
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

    const FACTORY_ADDRESS = "0x4E476Aae0763dC0511BFD0d98688525c53601c07";
    
    console.log("\n1. Creating token...");
    const factory = await hre.ethers.getContractAt("contracts/TokenFactory.sol:TokenFactory", FACTORY_ADDRESS);
    
    // Получаем fee из контракта
    const fee = await factory.fee();
    console.log("Creation fee:", hre.ethers.formatEther(fee), "BNB");
    
    // Создаем токен, передавая структуру TokenParams
    const createTx = await factory.createToken(
        tokenParams,
        { value: fee }
    );
    
    console.log("Waiting for token creation...");
    const receipt = await createTx.wait();
    
    const creatorTokens = await factory.getCreatorTokens(deployer.address);
    const tokenAddress = creatorTokens[creatorTokens.length - 1];
    console.log("\nToken created at:", tokenAddress);
    
    console.log("\nPlease verify the contract on BSCScan using this command:");
    console.log(`npx hardhat verify --network bscTestnet ${tokenAddress} "${tokenParams.name}" "${tokenParams.symbol}" "${tokenParams.totalSupply}" [${tokenParams.whitelist}] ${tokenParams.buyTax} ${tokenParams.sellTax} ${tokenParams.walletTax} "${tokenParams.logoUrl}" ${tokenParams.mintable} "${tokenParams.maxSupply}" "${deployer.address}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });