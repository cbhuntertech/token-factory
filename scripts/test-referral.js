const hre = require("hardhat");

async function main() {
  const factoryAddress = "0x5F88e53C04e227B04C68AE07a62ecE576aAc596a";
  const [signer] = await ethers.getSigners();
  const factory = await ethers.getContractAt("TokenFactory", factoryAddress);
  
  console.log("Testing referral system...");
  console.log("Using address:", await signer.getAddress());

  // 1. Получаем реферальный код напрямую
  const referralCode = await factory.getUserReferralCode(await signer.getAddress());
  console.log("\nCurrent referral code:", referralCode);
  
  // Получаем полную информацию
  const referralInfo = await factory.getReferralInfo(await signer.getAddress());
  console.log("\nReferral info:");
  console.log("Referrals count:", referralInfo.referralsCount.toString());
  console.log("Pending earnings:", ethers.formatEther(referralInfo.pendingEarnings), "BNB");

  // 2. Создаем токен с реферальным кодом
  const tokenParams = {
    name: "Referral Test Token",
    symbol: "RTT",
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

  console.log("\nCreating token with referral code...");
  const fee = await factory.fee();
  console.log("Fee required:", ethers.formatEther(fee), "BNB");
  
  const createTx = await factory.connect(signer).createToken(
    tokenParams,
    referralCode,
    { value: fee }
  );
  const receipt = await createTx.wait();
  console.log("Token created! Transaction:", receipt.hash);

  // 3. Проверяем обновленные начисления
  const updatedReferralInfo = await factory.getReferralInfo(await signer.getAddress());
  console.log("\nUpdated referral info:");
  console.log("Referrals count:", updatedReferralInfo.referralsCount.toString());
  console.log("Pending earnings:", ethers.formatEther(updatedReferralInfo.pendingEarnings), "BNB");

  // 4. Пробуем вывести реферальные
  if (updatedReferralInfo.pendingEarnings > 0) {
    console.log("\nWithdrawing referral earnings...");
    const withdrawTx = await factory.connect(signer).withdrawReferralEarnings();
    const withdrawReceipt = await withdrawTx.wait();
    console.log("Withdrawal successful! Transaction:", withdrawReceipt.hash);
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