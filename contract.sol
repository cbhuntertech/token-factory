// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenFactory is Ownable {
    struct TokenParams {
        string name;
        string symbol;
        uint256 totalSupply;
        address[] whitelist;
        uint256 buyTax;
        uint256 sellTax;
        uint256 walletTax;
        string logoUrl;
        string website;
        string telegram;
        bool salesLocked;
        bool mintable;
        uint256 maxSupply;
    }

    // Структура для хранения информации о реферале
    struct ReferralInfo {
        uint256 totalEarnings;     // Общий заработок
        uint256 pendingEarnings;   // Доступно для вывода
        uint256 withdrawnEarnings; // Уже выведено
        uint256 referralsCount;    // Количество рефералов
        address[] referredUsers;   // Список привлеченных пользователей
    }

    uint256 public fee = 0.001 ether;
    uint256 public referralPercent = 20; // 20% от fee идет реферу
    uint256 public minWithdrawAmount;
    
    // Маппинги для реферальной системы
    mapping(bytes32 => address) public referralCodes;
    mapping(address => bytes32) public userReferralCodes;
    mapping(address => ReferralInfo) public referralInfo;
    
    // События
    event TokenCreated(address token, address creator, address referrer);
    event ReferralPaid(address referrer, address referred, uint256 amount);
    event ReferralWithdrawn(address referrer, uint256 amount);
    event ReferralCodeGenerated(address user, bytes32 code);
    event FeeUpdated(uint256 newFee);
    event ReferralPercentUpdated(uint256 newPercent);

    uint256 public constant MIN_WITHDRAWAL = 0.0001 ether;

    address public immutable PAYMENT_RECEIVER;

    constructor() Ownable() {
        PAYMENT_RECEIVER = _msgSender();
        fee = 0.001 ether;
        referralPercent = 20; // 20%
        minWithdrawAmount = 0.0001 ether;
    }

    // Функция для генерации реферального кода
    function generateReferralCode() external returns (bytes32) {
        require(userReferralCodes[msg.sender] == bytes32(0), "Code already exists");
        
        bytes32 code = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        referralCodes[code] = msg.sender;
        userReferralCodes[msg.sender] = code;
        
        emit ReferralCodeGenerated(msg.sender, code);
        return code;
    }

    function createToken(
        TokenParams memory params,
        bytes32 referralCode
    ) external payable returns (address) {
        require(msg.value >= fee, "Insufficient fee");
        require(params.totalSupply <= params.maxSupply, "Supply > Max Supply");
        require(bytes(params.name).length <= 32, "Name too long");
        require(bytes(params.symbol).length <= 8, "Symbol too long");
        
        // Проверка whitelist адресов
        for(uint i = 0; i < params.whitelist.length; i++) {
            require(params.whitelist[i] != address(0), "Invalid whitelist address");
        }
        
        uint256 referralAmount = 0;
        address referrer;
        
        if(referralCode != bytes32(0)) {
            referrer = referralCodes[referralCode];
            
            if(referrer != address(0) && referrer != msg.sender) {
                referralAmount = (fee * referralPercent) / 100;
                
                ReferralInfo storage refInfo = referralInfo[referrer];
                refInfo.totalEarnings += referralAmount;
                refInfo.pendingEarnings += referralAmount;
                refInfo.referralsCount++;
                refInfo.referredUsers.push(msg.sender);
                
                emit ReferralPaid(referrer, msg.sender, referralAmount);
            }
        }
        
        // Отправляем основную оплату получателю
        uint256 paymentAmount = fee - referralAmount;
        (bool success, ) = payable(PAYMENT_RECEIVER).call{value: paymentAmount}("");
        require(success, "Payment transfer failed");
        
        Token newToken = new Token(
            params.name,
            params.symbol,
            params.totalSupply,
            params.whitelist,
            params.buyTax,
            params.sellTax,
            params.walletTax,
            params.logoUrl,
            params.website,
            params.telegram,
            params.salesLocked,
            params.mintable,
            params.maxSupply,
            msg.sender
        );

        emit TokenCreated(address(newToken), msg.sender, referrer);
        return address(newToken);
    }

    // Функция для вывода реферальных
    function withdrawReferralEarnings() external {
        ReferralInfo storage refInfo = referralInfo[msg.sender];
        uint256 amount = refInfo.pendingEarnings;
        require(amount >= MIN_WITHDRAWAL, "Amount too small");
        require(amount > 0, "No earnings to withdraw");
        
        refInfo.pendingEarnings = 0;
        refInfo.withdrawnEarnings += amount;
        
        payable(msg.sender).transfer(amount);
        emit ReferralWithdrawn(msg.sender, amount);
    }

    // Функция для получения информации о реферале
    function getReferralInfo(address referrer) external view returns (
        uint256 totalEarnings,
        uint256 pendingEarnings,
        uint256 withdrawnEarnings,
        uint256 referralsCount,
        address[] memory referredUsers
    ) {
        ReferralInfo storage refInfo = referralInfo[referrer];
        return (
            refInfo.totalEarnings,
            refInfo.pendingEarnings,
            refInfo.withdrawnEarnings,
            refInfo.referralsCount,
            refInfo.referredUsers
        );
    }

    function getUserReferralCode(address user) external view returns (bytes32) {
        return userReferralCodes[user];
    }

    function getReferralCodeOwner(bytes32 code) external view returns (address) {
        return referralCodes[code];
    }

    function setFee(uint256 _fee) external onlyOwner {
        if (block.chainid == 56) { // Mainnet
            require(_fee >= 100000000000000000, "Fee too low for mainnet"); // Минимум 0.1 BNB
        }
        fee = _fee;
        emit FeeUpdated(_fee);
    }

    function setReferralPercent(uint256 _percent) external onlyOwner {
        require(_percent <= 50, "Referral percent too high"); // Максимум 50%
        referralPercent = _percent;
        emit ReferralPercentUpdated(_percent);
    }

    function isReferralCodeActive(bytes32 code) external view returns (bool) {
        address referrer = referralCodes[code];
        return referrer != address(0);
    }

    function getReferralStats(address referrer, address referredUser) external view returns (bool) {
        ReferralInfo storage refInfo = referralInfo[referrer];
        for(uint i = 0; i < refInfo.referredUsers.length; i++) {
            if(refInfo.referredUsers[i] == referredUser) {
                return true;
            }
        }
        return false;
    }

    function updateReferralCode() external returns (bytes32) {
        bytes32 oldCode = userReferralCodes[msg.sender];
        require(oldCode != bytes32(0), "No existing code");
        
        // Удаляем старый код
        delete referralCodes[oldCode];
        
        // Генерируем новый код
        bytes32 newCode = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        referralCodes[newCode] = msg.sender;
        userReferralCodes[msg.sender] = newCode;
        
        emit ReferralCodeGenerated(msg.sender, newCode);
        return newCode;
    }
}