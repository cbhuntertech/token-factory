const hre = require("hardhat");

async function main() {
    // Адреса контрактов
    const TOKEN_ADDRESS = "0x4D1f084B858163193A23F365925C02B8dA70F40f";
    const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"; // PancakeSwap Router Testnet

    // Подключаемся к токену
    const token = await hre.ethers.getContractAt("Token", TOKEN_ADDRESS);
    
    // Получаем адрес кошелька
    const [signer] = await hre.ethers.getSigners();
    const walletAddress = await signer.getAddress();
    
    // Проверяем баланс
    const balance = await token.balanceOf(walletAddress);
    console.log("Token balance:", hre.ethers.formatEther(balance));
    
    // Используем меньшее количество токенов для ликвидности
    const liquidityAmount = hre.ethers.parseEther("10000"); // 10k tokens
    
    if (balance < liquidityAmount) {
        console.log("Insufficient token balance");
        return;
    }

    console.log("Approving tokens...");
    const approveTx = await token.approve(ROUTER_ADDRESS, liquidityAmount);
    await approveTx.wait();
    console.log("Tokens approved");

    console.log("Adding liquidity...");
    const tx = await token.addLiquidityV2(
        ROUTER_ADDRESS,
        liquidityAmount,
        hre.ethers.parseEther("0.01"), // 0.01 BNB
        { value: hre.ethers.parseEther("0.01") }
    );

    console.log("Waiting for transaction...");
    const receipt = await tx.wait();
    console.log("Liquidity added successfully!");

    // Получаем адрес пары
    const pairAddress = await token.uniswapV2Pair();
    console.log("Liquidity pair address:", pairAddress);

    // Проверяем баланс LP токенов
    const pair = await hre.ethers.getContractAt("IERC20", pairAddress);
    const lpBalance = await pair.balanceOf(walletAddress);
    console.log("LP Token balance:", hre.ethers.formatEther(lpBalance));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });