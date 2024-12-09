const hre = require("hardhat");

async function main() {
    const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
    
    const [signer] = await hre.ethers.getSigners();
    const walletAddress = await signer.getAddress();
    console.log("Deploying from address:", walletAddress);

    // Создаем токен
    const tokenParams = {
        name: "Test Token V4",
        symbol: "TEST4",
        totalSupply: hre.ethers.parseEther("1000000"),
        whitelist: [walletAddress],
        buyTax: 5,
        sellTax: 5,
        walletTax: 2,
        logoUrl: "https://example.com/logo.png",
        mintable: true,
        maxSupply: hre.ethers.parseEther("2000000")
    };

    const factory = await hre.ethers.getContractAt("TokenFactory", "0x326ea077a10ab3edf5774a6cFbCb5A3e824cDe12");
    
    console.log("Creating token...");
    const createTx = await factory.createToken(
        tokenParams,
        { value: hre.ethers.parseEther("0.001") }
    );
    
    console.log("Waiting for token creation...");
    const receipt = await createTx.wait();
    
    const event = receipt.logs.find(log => 
        log.fragment && log.fragment.name === 'TokenCreated'
    );
    const tokenAddress = event.args[0];
    console.log("Token created at:", tokenAddress);
    
    const token = await hre.ethers.getContractAt("Token", tokenAddress);
    
    // Проверяем баланс
    const balance = await token.balanceOf(walletAddress);
    console.log("Token balance:", hre.ethers.formatEther(balance));

    const liquidityAmount = hre.ethers.parseEther("100000");
    const ethAmount = hre.ethers.parseEther("0.1");

    console.log("Adding liquidity...");
    const addLiqTx = await token.addLiquidityV2(
        ROUTER_ADDRESS,
        liquidityAmount,
        ethAmount,
        { 
            value: ethAmount,
            gasLimit: 3000000
        }
    );

    console.log("Waiting for liquidity addition...");
    const liqReceipt = await addLiqTx.wait();
    console.log("Liquidity added successfully!");

    const pairAddress = await token.uniswapV2Pair();
    console.log("Liquidity pair address:", pairAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });