const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  
  // Создаем новый кошелек для теста
  const testWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const [mainSigner] = await ethers.getSigners();
  
  // Отправляем больше BNB на тестовый кошелек
  console.log("Sending BNB to test wallet...");
  const sendTx = await mainSigner.sendTransaction({
    to: testWallet.address,
    value: ethers.parseEther("0.05") // Увеличили до 0.05 BNB
  });
  await sendTx.wait();
  
  // Проверяем баланс тестового кошелька
  const balance = await ethers.provider.getBalance(testWallet.address);
  console.log("Test wallet balance:", ethers.formatEther(balance), "BNB");
  
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  
  console.log("\nTesting referral system with different accounts...");
  console.log("Main address (referrer):", await mainSigner.getAddress());
  console.log("Test wallet (creator):", testWallet.address);

  // 1. Получаем реферальный код основного аккаунта
  const referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
  console.log("\nReferral code from main account:", referralCode);

  // 2. Создаем токен с тестового кошелька
  const tokenParams = {
    name: "Other Referral Token",
    symbol: "ORT",
    totalSupply: ethers.parseEther("1000000"),
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

  console.log("\nCreating token from test wallet with referral code...");
  const fee = await factory.fee();
  console.log("Fee required:", ethers.formatEther(fee), "BNB");
  
  // Оцениваем газ перед отправкой
  const gasEstimate = await factory.connect(testWallet).createToken.estimateGas(
    tokenParams,
    referralCode,
    { value: fee }
  );
  console.log("Estimated gas:", gasEstimate.toString());
  
  const createTx = await factory.connect(testWallet).createToken(
    tokenParams,
    referralCode,
    { 
      value: fee,
      gasLimit: gasEstimate * 12n / 10n // добавляем 20% к оценке газа
    }
  );
  const receipt = await createTx.wait();
  console.log("Token created! Transaction:", receipt.hash);

  // 3. Проверяем начисления на основном аккаунте
  const referralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nReferral info for main account:");
  console.log("Referrals count:", referralInfo.referralsCount.toString());
  console.log("Pending earnings:", ethers.formatEther(referralInfo.pendingEarnings), "BNB");

  // 4. Пробуем вывести реферальные если есть
  if (referralInfo.pendingEarnings > 0) {
    console.log("\nWithdrawing referral earnings...");
    const withdrawTx = await factory.connect(mainSigner).withdrawReferralEarnings();
    const withdrawReceipt = await withdrawTx.wait();
    console.log("Withdrawal successful! Transaction:", withdrawReceipt.hash);
    
    const finalReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
    console.log("\nFinal pending earnings:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");
  } else {
    console.log("\nNo earnings to withdraw");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });