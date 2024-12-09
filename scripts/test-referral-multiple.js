const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  
  const testWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const [mainSigner] = await ethers.getSigners();
  
  console.log("Main wallet balance:", ethers.formatEther(await mainSigner.provider.getBalance(mainSigner.address)), "BNB");
  
  // Отправляем BNB на тестовый кошелек
  console.log("\nSending BNB to test wallet...");
  const sendTx = await mainSigner.sendTransaction({
    to: testWallet.address,
    value: ethers.parseEther("0.1"),
    gasLimit: 21000
  });
  await sendTx.wait();
  
  console.log("Test wallet balance:", ethers.formatEther(await testWallet.provider.getBalance(testWallet.address)), "BNB");
  
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
  
  console.log("\nReferral code:", referralCode);
  
  // Создаем только 3 токена для теста
  for(let i = 0; i < 3; i++) {
    const tokenParams = {
      name: `Referral Test Token ${i}`,
      symbol: `RTT${i}`,
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

    console.log(`\nCreating token ${i + 1}/3...`);
    const fee = await factory.fee();
    console.log("Fee required:", ethers.formatEther(fee), "BNB");
    
    try {
      // Проверяем баланс перед созданием
      const balanceBefore = await testWallet.provider.getBalance(testWallet.address);
      console.log("Balance before:", ethers.formatEther(balanceBefore), "BNB");
      
      // Оцениваем газ
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
          gasLimit: gasEstimate * 12n / 10n // +20% к газу
        }
      );
      console.log("Transaction sent:", createTx.hash);
      
      const receipt = await createTx.wait();
      console.log(`Token ${i + 1} created! Status:`, receipt.status);

      // Проверяем реферальные
      const referralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
      console.log("Current pending earnings:", ethers.formatEther(referralInfo.pendingEarnings), "BNB");
      
    } catch (error) {
      console.error("Error details:", {
        reason: error.reason,
        code: error.code,
        data: error.data,
        transaction: error.transaction
      });
      break;
    }
  }

  // Проверяем финальную информацию
  const finalReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nFinal referral info:");
  console.log("Total referrals:", finalReferralInfo.referralsCount.toString());
  console.log("Total pending earnings:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });