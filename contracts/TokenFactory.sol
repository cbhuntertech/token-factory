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
    }

    uint256 public fee = 0.001 ether;
    mapping(address => address[]) public creatorTokens;
    
    event TokenCreated(address indexed token, address indexed creator);
    event FeeUpdated(uint256 newFee);

    function createToken(TokenParams calldata params) external payable returns (address) {
        require(msg.value >= fee, "Insufficient fee");
        
        // Возврат излишка
        if(msg.value > fee) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fee}("");
            require(success, "Refund failed");
        }

        Token newToken = new Token(
            params.name,
            params.symbol,
            params.totalSupply,
            params.whitelist,
            msg.sender
        );

        address tokenAddress = address(newToken);
        creatorTokens[msg.sender].push(tokenAddress);
        
        emit TokenCreated(tokenAddress, msg.sender);
        return tokenAddress;
    }

    function getCreatorTokens(address creator) external view returns (address[] memory) {
        return creatorTokens[creator];
    }

    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
        emit FeeUpdated(_fee);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}