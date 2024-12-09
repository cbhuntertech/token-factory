const hre = require("hardhat");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    const walletAddress = await signer.getAddress();
    console.log("Deploying from address:", walletAddress);
    
    // Параметры токена
    const tokenParams = {
        name: "Test Token V6",
        symbol: "TEST6",
        totalSupply: hre.ethers.parseEther("1000000"), // 1M tokens
        whitelist: [walletAddress], // только владелец в whitelist
        buyTax: 5,
        sellTax: 5,
        walletTax: 2,
        logoUrl: "https://example.com/logo.png",
        mintable: true,
        maxSupply: hre.ethers.parseEther("2000000") // 2M max supply
    };

    // Деплоим через фабрику
    const factory = await hre.ethers.getContractAt(
        "TokenFactory",
        "0x326ea077a10ab3edf5774a6cFbCb5A3e824cDe12"
    );
    
    console.log("Creating new token...");
    const createTx = await factory.createToken(
        tokenParams,
        { value: hre.ethers.parseEther("0.001") }
    );
    
    console.log("Waiting for token creation...");
    const receipt = await createTx.wait();
    
    // Получаем адрес нового токена
    const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'TokenCreated'
    );
    const tokenAddress = event.args[0];
    console.log("New token created at:", tokenAddress);
    
    // Подключаемся к токену для проверки
    const token = await hre.ethers.getContractAt("Token", tokenAddress);
    
    // Проверяем основные параметры
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const balance = await token.balanceOf(walletAddress);
    const isWhitelisted = await token.whitelist(walletAddress);
    
    console.log("\nToken details:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply));
    console.log("Your Balance:", hre.ethers.formatEther(balance));
    console.log("Whitelisted:", isWhitelisted);
    
    // Проверяем налоги
    const buyTax = await token.buyTax();
    const sellTax = await token.sellTax();
    const walletTax = await token.walletTax();
    
    console.log("\nTax configuration:");
    console.log("Buy Tax:", buyTax.toString(), "%");
    console.log("Sell Tax:", sellTax.toString(), "%");
    console.log("Wallet Tax:", walletTax.toString(), "%");
    
    console.log("\nVerification data for PancakeSwap:");
    console.log("Token Address:", tokenAddress);
    console.log("Decimals: 18");
    console.log("Token Symbol:", symbol);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });