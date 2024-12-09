async function main() {
  console.log("Начинаем деплой TokenFactory...");

  // Получаем аккаунт деплоера
  const [deployer] = await ethers.getSigners();
  console.log("Деплоим с аккаунта:", deployer.address);

  // Проверяем баланс
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Баланс аккаунта:", ethers.formatEther(balance), "BNB");

  // Деплоим фабрику
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const factory = await TokenFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log("TokenFactory развернута по адресу:", factoryAddress);

  // Ждем немного для уверенности
  console.log("Ждем 30 секунд перед верификацией...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Верифицируем контракт
  console.log("Начинаем верификацию...");
  try {
    await run("verify:verify", {
      address: factoryAddress,
      constructorArguments: []
    });
    console.log("Верификация успешна!");
  } catch (error) {
    console.log("Ошибка верификации:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });