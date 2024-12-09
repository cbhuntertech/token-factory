const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x3850f79Ab831a5A45881C1845796a10458F2b062";
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  const [mainSigner] = await ethers.getSigners();
  
  // Проверяем, есть ли уже реферальный код
  let referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
  console.log("Current referral code:", referralCode);
  
  // Если код нулевой, генерируем новый
  if (referralCode === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.log("Generating new referral code...");
    const generateTx = await factory.connect(mainSigner).generateReferralCode();
    await generateTx.wait();
    
    referralCode = await factory.getUserReferralCode(await mainSigner.getAddress());
    console.log("New referral code:", referralCode);
  }
  
  const testWallet = ethers.Wallet.createRandom().connect(ethers.provider);
  console.log("\nMain wallet balance:", ethers.formatEther(await mainSigner.provider.getBalance(mainSigner.address)), "BNB");
  
  // Отправляем BNB на тестовый кошелек
  const transferAmount = ethers.parseEther("0.1");
  console.log("\nSending", ethers.formatEther(transferAmount), "BNB to test wallet...");
  
  const sendTx = await mainSigner.sendTransaction({
    to: testWallet.address,
    value: transferAmount,
    gasLimit: 21000
  });
  await sendTx.wait();
  
  console.log("Test wallet balance:", ethers.formatEther(await testWallet.provider.getBalance(testWallet.address)), "BNB");
  
  // Создаем 5 токенов
  const tokensToCreate = 5;
  
  for(let i = 0; i < tokensToCreate; i++) {
    const tokenParams = {
      name: `High Fee Token ${i}`,
      symbol: `HFT${i}`,
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
    console.log("Fee per token:", ethers.formatEther(fee), "BNB");
    
    const testBalance = await testWallet.provider.getBalance(testWallet.address);
    console.log("Current test wallet balance:", ethers.formatEther(testBalance), "BNB");
    
    const estimatedGas = await factory.connect(testWallet).createToken.estimateGas(
      tokenParams,
      referralCode,
      { value: fee }
    );
    const gasPrice = await ethers.provider.getFeeData();
    const estimatedCost = (estimatedGas * gasPrice.gasPrice) + fee;
    
    console.log("Estimated cost:", ethers.formatEther(estimatedCost), "BNB");
    
    if (testBalance < estimatedCost) {
      console.log("Not enough BNB for next token, stopping...");
      break;
    }
    
    try {
      const createTx = await factory.connect(testWallet).createToken(
        tokenParams,
        referralCode,
        { 
          value: fee,
          gasLimit: estimatedGas * 12n / 10n
        }
      );
      console.log("Transaction sent:", createTx.hash);
      const receipt = await createTx.wait();
      console.log("Transaction confirmed!");
      
      // Проверяем реферальные после каждого токена
      const referralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
      console.log("Current earnings:", ethers.formatEther(referralInfo.pendingEarnings), "BNB");
      
      if (referralInfo.pendingEarnings >= ethers.parseEther("0.001")) {
        console.log("\nReached minimum withdrawal amount!");
        console.log("Attempting to withdraw earnings...");
        const withdrawTx = await factory.connect(mainSigner).withdrawReferralEarnings();
        const withdrawReceipt = await withdrawTx.wait();
        console.log("Withdrawal successful! Transaction:", withdrawReceipt.hash);
        break;
      }
      
    } catch (error) {
      console.error("Error creating token:", error.message);
      break;
    }
  }

  // Показываем финальную статистику
  const finalReferralInfo = await factory.getReferralInfo(await mainSigner.getAddress());
  console.log("\nFinal referral info:");
  console.log("Total referrals:", finalReferralInfo.referralsCount.toString());
  console.log("Total earnings:", ethers.formatEther(finalReferralInfo.pendingEarnings), "BNB");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });