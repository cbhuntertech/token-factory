const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  
  // 1. Проверим текущие параметры
  const fee = await factory.fee();
  const referralPercent = await factory.referralPercent();
  console.log("Current fee:", ethers.formatEther(fee), "BNB");
  console.log("Current referral percent:", referralPercent.toString(), "%");

  // 2. Создадим тестовый токен
  const tokenParams = {
    name: "Test Token",
    symbol: "TEST",
    totalSupply: ethers.parseEther("1000000"), // 1 миллион токенов
    whitelist: [],
    buyTax: 5,
    sellTax: 5,
    walletTax: 5,
    logoUrl: "https://example.com/logo.png",
    website: "https://example.com",
    telegram: "https://t.me/example",
    salesLocked: false,
    mintable: true,
    maxSupply: ethers.parseEther("2000000")
  };

  console.log("Creating token...");
  const tx = await factory.createToken(
    tokenParams,
    ethers.ZeroHash, // без реферального кода
    { value: fee }
  );

  const receipt = await tx.wait();
  console.log("Token created! Transaction:", receipt.hash);

  // Найдем адрес созданного токена из событий
  const event = receipt.logs.find(
    log => log.eventName === 'TokenCreated'
  );
  
  if (event) {
    const tokenAddress = event.args[0];
    console.log("New token address:", tokenAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });