const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  
  const testWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const [mainSigner] = await ethers.getSigners();
  
  const mainBalance = await mainSigner.provider.getBalance(mainSigner.address);
  console.log("Main wallet balance:", ethers.formatEther(mainBalance), "BNB");
  
  // Рассчитываем безопасную сумму для перевода (80% от баланса)
  const safeAmount = mainBalance * 80n / 100n;
  console.log("Safe amount to transfer:", ethers.formatEther(safeAmount), "BNB");
  
  // Отправляем BNB на тестовый кошелек
  console.log("\nSending BNB to test wallet...");
  const sendTx = await mainSigner.sendTransaction({
    to: testWallet.address,
    value: safeAmount,
    gasLimit: 21000
  });
  await sendTx.wait();
  
  console.log("Test wallet balance:", ethers.formatEther(await testWallet.provider.getBalance(testWallet.address)), "BNB");
  
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
  
  // Текущие реферальные
  const currentReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nCurrent referral earnings:", ethers.formatEther(currentReferralInfo.pendingEarnings), "BNB");
  
  // Создаем еще 10 токенов
  const tokensToCreate = 10;
  
  for(let i = 0; i < tokensToCreate; i++) {
    const tokenParams = {
      name: `Referral Token Cont ${i}`,
      symbol: `RTC${i}`,
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

    console.log(`\nCreating token ${i + 1}/${tokensToCreate}...`);
    const fee = await factory.fee();
    
    try {
      const testBalance = await testWallet.provider.getBalance(testWallet.address);
      console.log("Current test wallet balance:", ethers.formatEther(testBalance), "BNB");
      
      const createTx = await factory.connect(testWallet).createToken(
        tokenParams,
        referralCode,
        { 
          value: fee,
          gasLimit: 3500000
        }
      );
      const receipt = await createTx.wait();
      
      // Проверяем реферальные после каждого токена
      const referralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
      console.log("Current total earnings:", ethers.formatEther(referralInfo.pendingEarnings), "BNB");
      
    } catch (error) {
      console.error("Error at token", i + 1);
      console.error("Balance:", ethers.formatEther(await testWallet.provider.getBalance(testWallet.address)), "BNB");
      break;
    }
  }

  // Проверяем финальную сумму
  const finalReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nFinal referral info:");
  console.log("Total referrals:", finalReferralInfo.referralsCount.toString());
  console.log("Total pending earnings:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");

  // Пробуем вывести если достаточно
  if (finalReferralInfo.pendingEarnings >= ethers.parseEther("0.001")) {
    console.log("\nAttempting to withdraw earnings...");
    const withdrawTx = await factory.connect(mainSigner).withdrawReferralEarnings();
    const withdrawReceipt = await withdrawTx.wait();
    console.log("Withdrawal successful! Transaction:", withdrawReceipt.hash);
  } else {
    const missing = ethers.parseEther("0.001") - finalReferralInfo.pendingEarnings;
    console.log("\nStill not enough for withdrawal");
    console.log("Missing:", ethers.formatEther(missing), "BNB");
    console.log("Need approximately", Math.ceil(Number(missing) / Number(ethers.parseEther("0.00002"))), "more tokens");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });