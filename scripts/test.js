const hre = require("hardhat");

async function main() {
    const FACTORY_ADDRESS = "0x326ea077a10ab3edf5774a6cFbCb5A3e824cDe12";
    
    // Подключаемся к фабрике
    const factory = await hre.ethers.getContractAt("TokenFactory", FACTORY_ADDRESS);
    
    // Параметры для создания токена
    const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        totalSupply: hre.ethers.parseEther("1000000"), // 1 миллион токенов
        whitelist: [], // пустой whitelist
        buyTax: 5, // 5%
        sellTax: 5, // 5%
        walletTax: 2, // 2%
        logoUrl: "https://example.com/logo.png",
        mintable: true,
        maxSupply: hre.ethers.parseEther("2000000") // 2 миллиона максимум
    };

    console.log("Creating token...");
    
    // Создаем токен
    const tx = await factory.createToken(
        tokenParams,
        { value: hre.ethers.parseEther("0.001") } // оплата за создание
    );
    
    console.log("Waiting for transaction...");
    const receipt = await tx.wait();
    
    // Получаем адрес созданного токена из события
    const event = receipt.logs.find(log => 
        log.eventName === 'TokenCreated'
    );
    
    const tokenAddress = event.args[0];
    console.log("Token created at:", tokenAddress);
    
    // Подключаемся к созданному токену
    const token = await hre.ethers.getContractAt("Token", tokenAddress);
    
    // Проверяем базовую информацию
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    
    console.log("Token info:");
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });