const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  
  const testWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  const [mainSigner] = await ethers.getSigners();
  
  console.log("Main wallet balance:", ethers.formatEther(await mainSigner.provider.getBalance(mainSigner.address)), "BNB");
  
  // Отправляем больше BNB для создания большего количества токенов
  console.log("\nSending BNB to test wallet...");
  const sendTx = await mainSigner.sendTransaction({
    to: testWallet.address,
    value: ethers.parseEther("0.5"), // Увеличили до 0.5 BNB
    gasLimit: 21000
  });
  await sendTx.wait();
  
  console.log("Test wallet balance:", ethers.formatEther(await testWallet.provider.getBalance(testWallet.address)), "BNB");
  
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
  
  // Создаем 50 токенов (должно дать 0.001 BNB реферальных)
  const tokensToCreate = 50;
  
  for(let i = 0; i < tokensToCreate; i++) {
    const tokenParams = {
      name: `Referral Token ${i}`,
      symbol: `RT${i}`,
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
      const createTx = await factory.connect(testWallet).createToken(
        tokenParams,
        referralCode,
        { 
          value: fee,
          gasLimit: 3500000
        }
      );
      const receipt = await createTx.wait();
      
      if ((i + 1) % 5 === 0) { // Проверяем каждые 5 токенов
        const referralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
        console.log(`Accumulated earnings after ${i + 1} tokens:`, ethers.formatEther(referralInfo.pendingEarnings), "BNB");
      }
      
    } catch (error) {
      console.error("Error at token", i + 1, error);
      break;
    }
  }

  // Проверяем финальную сумму
  const finalReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nFinal referral info:");
  console.log("Total referrals:", finalReferralInfo.referralsCount.toString());
  console.log("Total pending earnings:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");

  // Пробуем вывести, если достаточно средств
  if (finalReferralInfo.pendingEarnings >= ethers.parseEther("0.001")) {
    console.log("\nAttempting to withdraw earnings...");
    const withdrawTx = await factory.connect(mainSigner).withdrawReferralEarnings();
    const withdrawReceipt = await withdrawTx.wait();
    console.log("Withdrawal successful! Transaction:", withdrawReceipt.hash);
    
    // Проверяем баланс после вывода
    const afterWithdrawInfo = await factory.getReferralInfo(await mainSigner.getAddress());
    console.log("Remaining earnings:", ethers.formatEther(afterWithdrawInfo.pendingEarnings), "BNB");
  } else {
    console.log("\nNot enough for withdrawal yet. Need:", ethers.formatEther(ethers.parseEther("0.001")), "BNB");
    console.log("Current balance:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");
    console.log("Missing:", ethers.formatEther(ethers.parseEther("0.001") - finalReferralInfo.pendingEarnings), "BNB");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });