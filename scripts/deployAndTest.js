const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying from address:", deployer.address);
    
    // Параметры токена
    const tokenParams = {
        name: "Test Token V7",
        symbol: "TEST7",
        totalSupply: hre.ethers.parseEther("1000000"),
        whitelist: [deployer.address],
        buyTax: 5,
        sellTax: 5,
        walletTax: 2,
        logoUrl: "https://example.com/logo.png",
        mintable: true,
        maxSupply: hre.ethers.parseEther("2000000")
    };

    const FACTORY_ADDRESS = "0x326ea077a10ab3edf5774a6cFbCb5A3e824cDe12";
    const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
    
    // Подключаемся к фабрике
    const factory = await hre.ethers.getContractAt("TokenFactory", FACTORY_ADDRESS);
    
    console.log("Creating token...");
    const createTx = await factory.createToken(
        tokenParams,
        { value: hre.ethers.parseEther("0.001") }
    );
    
    console.log("Waiting for token creation...");
    const receipt = await createTx.wait();
    
    // Получаем последний созданный токен для этого адреса
    const creatorTokens = await factory.getCreatorTokens(deployer.address);
    const tokenAddress = creatorTokens[creatorTokens.length - 1];
    console.log("Token created at:", tokenAddress);
    
    // Подключаемся к токену
    const token = await hre.ethers.getContractAt("Token", tokenAddress);
    
    // Проверяем баланс
    const balance = await token.balanceOf(deployer.address);
    console.log("Token balance:", hre.ethers.formatEther(balance));
    
    // Проверяем whitelist
    const isWhitelisted = await token.whitelist(deployer.address);
    console.log("Is deployer whitelisted:", isWhitelisted);
    
    // Добавляем ликвидность
    const liquidityAmount = hre.ethers.parseEther("100000");
    const ethAmount = hre.ethers.parseEther("0.01");
    
    console.log("Approving tokens for router...");
    await (await token.approve(ROUTER_ADDRESS, liquidityAmount)).wait();
    console.log("Tokens approved");
    
    console.log("Adding liquidity directly through token contract...");
    const addLiqTx = await token.addLiquidityV2(
        ROUTER_ADDRESS,
        liquidityAmount,
        ethAmount,
        { value: ethAmount }
    );
    
    console.log("Waiting for liquidity addition...");
    await addLiqTx.wait();
    console.log("Liquidity added successfully!");
    
    // Получаем адрес пары
    const pairAddress = await token.uniswapV2Pair();
    console.log("Liquidity pair address:", pairAddress);
    
    console.log("\nDeployment Summary:");
    console.log("Token Address:", tokenAddress);
    console.log("Pair Address:", pairAddress);
    console.log("Router Address:", ROUTER_ADDRESS);
    console.log("Initial Liquidity:", "100,000 tokens +", "0.01 BNB");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });