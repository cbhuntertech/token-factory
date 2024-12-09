const {
  loadFixture
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenFactory", function() {
  let TokenFactory;
  let factory;
  let owner;
  let user1;
  let user2;
  let addrs;

  beforeEach(async function() {
    [owner, user1, user2, ...addrs] = await ethers.getSigners();
    
    TokenFactory = await ethers.getContractFactory("TokenFactory");
    factory = await TokenFactory.deploy();
    await factory.waitForDeployment();
  });

  describe("Deployment", function() {
    it("Should set the right fee", async function() {
      const fee = await factory.fee();
      expect(fee).to.equal(ethers.parseEther("0.0001"));
    });

    it("Should set the right owner", async function() {
      expect(await factory.owner()).to.equal(await owner.getAddress());
    });

    it("Should set the right payment receiver", async function() {
      expect(await factory.PAYMENT_RECEIVER()).to.equal(owner.address);
    });
  });

  describe("Token Creation", function() {
    it("Should create a new token with correct parameters", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      const fee = await factory.fee();
      const referralCode = ethers.ZeroHash;

      await factory.connect(user1).createToken(
        tokenParams,
        referralCode,
        { value: fee }
      );
    });

    it("Should fail if fee is not paid", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      const referralCode = ethers.ZeroHash;

      await expect(
        factory.connect(user1).createToken(
          tokenParams,
          referralCode,
          { value: 0 }
        )
      ).to.be.revertedWithCustomError(factory, "InsufficientPayment");
    });
  });

  describe("Fee Management", function() {
    it("Should allow owner to change fee", async function() {
      const { factory, owner } = await loadFixture(deployTokenFactoryFixture);
      const newFee = ethers.parseEther("0.1");
      await factory.connect(owner).setFee(newFee);
      expect(await factory.fee()).to.equal(newFee);
    });

    it("Should not allow non-owner to change fee", async function() {
      const { factory, user1 } = await loadFixture(deployTokenFactoryFixture);
      const newFee = ethers.parseEther("0.1");
      await expect(
        factory.connect(user1).setFee(newFee)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Referral System", function() {
    it("Should generate referral code", async function() {
      await factory.connect(user1).generateReferralCode();
      const code = await factory.getUserReferralCode(user1.address);
      expect(code).to.not.equal(ethers.ZeroHash);
    });

    it("Should not allow generating multiple referral codes", async function() {
      await factory.connect(user1).generateReferralCode();
      await expect(
        factory.connect(user1).generateReferralCode()
      ).to.be.revertedWithCustomError(factory, "CodeAlreadyExists");
    });

    it("Should correctly process referral payment", async function() {
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(user1.address);

      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      const fee = await factory.fee();
      await factory.connect(user2).createToken(tokenParams, referralCode, { value: fee });

      const referralInfo = await factory.getReferralInfo(user1.address);
      expect(referralInfo.referralsCount).to.equal(1);
      expect(referralInfo.referredUsers).to.include(user2.address);
      expect(referralInfo.pendingEarnings).to.be.gt(0);
    });

    it("Should allow referral earnings withdrawal", async function() {
      const { factory, user1, user2 } = await loadFixture(deployTokenFactoryFixture);
      
      // Генерируем реферальный код
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(await user1.getAddress());
      
      // Устанавливаем более высокую комиссию для тестирования
      await factory.connect(owner).setFee(ethers.parseEther("0.001"));
      const fee = await factory.fee();

      // Создаем несколько токенов для накопления реферальных
      for(let i = 0; i < 5; i++) {
        await factory.connect(user2).createToken(
          {
            ...tokenParams,
            name: `Test Token ${i}`,
            symbol: `TEST${i}`
          }, 
          referralCode, 
          { value: fee }
        );
      }

      const balanceBefore = await ethers.provider.getBalance(await user1.getAddress());
      
      const withdrawTx = await factory.connect(user1).withdrawReferralEarnings();
      const receipt = await withdrawTx.wait();
      
      const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
      const balanceAfter = await ethers.provider.getBalance(await user1.getAddress());
      
      expect(balanceAfter + gasUsed).to.be.gt(balanceBefore);
      
      const referralInfoAfter = await factory.getReferralInfo(await user1.getAddress());
      expect(referralInfoAfter.pendingEarnings).to.equal(0n);
    });

    it("Should allow updating referral code", async function() {
      await factory.connect(user1).generateReferralCode();
      const oldCode = await factory.getUserReferralCode(user1.address);
      
      await factory.connect(user1).updateReferralCode();
      const newCode = await factory.getUserReferralCode(user1.address);
      
      expect(newCode).to.not.equal(oldCode);
      expect(await factory.isReferralCodeActive(oldCode)).to.be.false;
      expect(await factory.isReferralCodeActive(newCode)).to.be.true;
    });
  });

  describe("Tax Limits", function() {
    it("Should not allow tax higher than 25%", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        totalSupply: ethers.parseEther("1000000"),
        whitelist: [],
        buyTax: 26,
        sellTax: 5,
        walletTax: 5,
        logoUrl: "https://example.com/logo.png",
        website: "https://example.com",
        telegram: "https://t.me/example",
        salesLocked: false,
        mintable: true,
        maxSupply: ethers.parseEther("2000000")
      };

      const fee = await factory.fee();
      await expect(
        factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: fee })
      ).to.be.revertedWithCustomError(factory, "TaxTooHigh");
    });
  });

  describe("Referral System Advanced", function() {
    it("Should not allow withdrawal below minimum amount", async function() {
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(user1.address);

      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      // Создаем только один токен (недостаточно для минимальной суммы вывода)
      await factory.connect(user2).createToken(tokenParams, referralCode, { value: await factory.fee() });

      await expect(
        factory.connect(user1).withdrawReferralEarnings()
      ).to.be.revertedWithCustomError(factory, "AmountTooSmall");
    });

    it("Should track referral statistics correctly", async function() {
      const { factory, user1, user2 } = await loadFixture(deployTokenFactoryFixture);
      
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(await user1.getAddress());
      
      const fee = await factory.fee();
      await factory.connect(user2).createToken(tokenParams, referralCode, { value: fee });
      
      const referralInfo = await factory.getReferralInfo(await user1.getAddress());
      expect(referralInfo.referralsCount).to.equal(1n);
      expect(referralInfo.referredUsers).to.include(await user2.getAddress());
    });

    it("Should handle referral code updates correctly", async function() {
      // Генерируем первый код
      await factory.connect(user1).generateReferralCode();
      const oldCode = await factory.getUserReferralCode(user1.address);
      
      // Обновляем код
      await factory.connect(user1).updateReferralCode();
      const newCode = await factory.getUserReferralCode(user1.address);
      
      // Проверяем, что стаый код больше е активен
      expect(await factory.isReferralCodeActive(oldCode)).to.be.false;
      
      // Проверяем, что новый код активен и принадлежит правильному пользователю
      expect(await factory.isReferralCodeActive(newCode)).to.be.true;
      expect(await factory.getReferralCodeOwner(newCode)).to.equal(user1.address);
    });

    it("Should not allow referral to self", async function() {
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(user1.address);

      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      // Пытаемся использовать свой собственный реферальный код
      await factory.connect(user1).createToken(tokenParams, referralCode, { value: await factory.fee() });

      const referralInfo = await factory.getReferralInfo(user1.address);
      expect(referralInfo.referralsCount).to.equal(0);
      expect(referralInfo.pendingEarnings).to.equal(0);
    });
  });

  describe("Referral System Management", function() {
    it("Should allow owner to change referral percent", async function() {
      const newPercent = 30; // 30%
      await factory.connect(owner).setReferralPercent(newPercent);
      expect(await factory.referralPercent()).to.equal(newPercent);
    });

    it("Should not allow non-owner to change referral percent", async function() {
      const newPercent = 30;
      await expect(
        factory.connect(user1).setReferralPercent(newPercent)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should not allow referral percent above 50%", async function() {
      await expect(
        factory.connect(owner).setReferralPercent(51)
      ).to.be.revertedWithCustomError(factory, "ReferralPercentTooHigh");
    });

    it("Should handle invalid referral codes correctly", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      // Используем несуществующий реферальный код
      const invalidCode = ethers.utils.formatBytes32String("INVALID_CODE");
      await factory.connect(user2).createToken(tokenParams, invalidCode, { value: await factory.fee() });

      // Проверяем, что никто не получил реферальные
      const referralInfo = await factory.getReferralInfo(user1.address);
      expect(referralInfo.pendingEarnings).to.equal(0);
    });

    it("Should not allow updating non-existent referral code", async function() {
      await expect(
        factory.connect(user1).updateReferralCode()
      ).to.be.revertedWithCustomError(factory, "NoExistingCode");
    });

    it("Should correctly process payment distribution", async function() {
      await factory.connect(user1).generateReferralCode();
      const referralCode = await factory.getUserReferralCode(user1.address);

      const fee = await factory.fee();
      const referralPercent = await factory.referralPercent();
      const expectedReferralAmount = (fee * BigInt(referralPercent)) / 100n;

      const balanceBefore = await ethers.provider.getBalance(await factory.PAYMENT_RECEIVER());

      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      await factory.connect(user2).createToken(tokenParams, referralCode, { value: fee });

      const balanceAfter = await ethers.provider.getBalance(await factory.PAYMENT_RECEIVER());
      expect(balanceAfter - balanceBefore).to.equal(fee - expectedReferralAmount);

      const referralInfo = await factory.getReferralInfo(user1.address);
      expect(referralInfo.pendingEarnings).to.equal(expectedReferralAmount);
    });
  });

  describe("Security and Edge Cases", function() {
    it("Should not allow zero address in whitelist", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        totalSupply: ethers.parseEther("1000000"),
        whitelist: [ethers.ZeroAddress], // Нулевой адрес
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

      await expect(
        factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: await factory.fee() })
      ).to.be.revertedWithCustomError(factory, "InvalidWhitelistAddress");
    });

    it("Should not allow total supply greater than max supply", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        totalSupply: ethers.parseEther("2000001"),
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

      await expect(
        factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: await factory.fee() })
      ).to.be.revertedWithCustomError(factory, "SupplyExceedsMax");
    });

    it("Should handle empty strings in token metadata", async function() {
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
        totalSupply: ethers.parseEther("1000000"),
        whitelist: [],
        buyTax: 5,
        sellTax: 5,
        walletTax: 5,
        logoUrl: "", // Пустая строка
        website: "", // Пустая строка
        telegram: "", // Пустая строка
        salesLocked: false,
        mintable: true,
        maxSupply: ethers.parseEther("2000000")
      };

      await factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: await factory.fee() });
      // Если не ревертится, значит тест пройден
    });

    it("Should handle exact fee payment", async function() {
      const fee = await factory.fee();
      const tokenParams = {
        name: "Test Token",
        symbol: "TEST",
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

      // Отпавляем точную сумму комиссии
      await factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: fee });
      
      // Отправляем сумму больше комиссии
      await factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: fee.mul(2) });
    });

    it("Should validate token name and symbol length", async function() {
      const tokenParams = {
        name: "A".repeat(33), // Слишком длинное имя
        symbol: "SYMB1", // Нормальный символ
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

      await expect(
        factory.connect(user1).createToken(tokenParams, ethers.ZeroHash, { value: await factory.fee() })
      ).to.be.revertedWithCustomError(factory, "NameTooLong");
    });
  });
});