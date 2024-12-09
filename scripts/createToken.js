import React, { useState } from 'react';
import { Contract, ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { FACTORY_ADDRESS, FACTORY_ABI } from '../constants/contracts';

const CreateToken: React.FC = () => {
  const { library, account } = useWeb3React();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState('');
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistInput, setWhitelistInput] = useState('');
  const [error, setError] = useState('');

  const validateAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleWhitelistAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && whitelistInput) {
      e.preventDefault();
      if (!validateAddress(whitelistInput)) {
        setError('Invalid address format');
        return;
      }
      if (!whitelist.includes(whitelistInput)) {
        setWhitelist([...whitelist, whitelistInput]);
        setWhitelistInput('');
        setError('');
      }
    }
  };

  const handleWhitelistRemove = (addressToRemove: string) => {
    setWhitelist(whitelist.filter(address => address !== addressToRemove));
  };

  const createToken = async () => {
    try {
      setError('');
      if (!library || !account) {
        setError('Please connect your wallet first');
        return;
      }

      if (!tokenName.trim() || !tokenSymbol.trim() || !totalSupply || whitelist.length === 0) {
        setError('All fields are required');
        return;
      }

      setIsLoading(true);
      const signer = library.getSigner();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      const params = {
        name: tokenName.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        totalSupply: ethers.utils.parseEther(totalSupply.toString()),
        whitelist: whitelist.filter(addr => ethers.utils.isAddress(addr))
      };

      console.log('Creating token with TokenParams:', params);

      const tx = await factory.createToken(
        params,
        {
          value: ethers.utils.parseEther("0.001"),
          gasLimit: 3000000
        }
      );

      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      if (receipt.status === 1) {
        alert(`Token created successfully!\nTransaction: ${tx.hash}`);
        setTokenName('');
        setTokenSymbol('');
        setTotalSupply('');
        setWhitelist([]);
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error: any) {
      console.error('Error details:', error);
      let errorMessage = 'Failed to create token: ';
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += 'Insufficient BNB balance';
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += 'Error calculating gas limit. Check your input parameters';
      } else if (error.message.includes('user rejected')) {
        errorMessage += 'Transaction was rejected by user';
      } else if (error.message.includes('execution reverted')) {
        errorMessage += 'Contract execution failed. Check your input parameters';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create Your Token</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block mb-2">Token Name</label>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="My Token"
          />
        </div>

        <div>
          <label className="block mb-2">Token Symbol</label>
          <input
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="MTK"
          />
        </div>

        <div>
          <label className="block mb-2">Total Supply</label>
          <input
            type="text"
            value={totalSupply}
            onChange={(e) => setTotalSupply(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="1000000"
          />
        </div>

        <div>
          <label className="block mb-2">Whitelist Addresses (press Enter to add)</label>
          <input
            type="text"
            value={whitelistInput}
            onChange={(e) => setWhitelistInput(e.target.value)}
            onKeyPress={handleWhitelistAdd}
            className="w-full p-2 border rounded"
            placeholder="Enter address and press Enter"
          />
          <div className="mt-2">
            {whitelist.map((address, index) => (
              <div key={index} className="bg-gray-100 p-2 rounded mb-2 flex justify-between items-center">
                <span>{address}</span>
                <button 
                  type="button"
                  onClick={() => handleWhitelistRemove(address)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={createToken}
          disabled={isLoading}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : `Create Token (0.0001 BNB)`}
        </button>
      </div>
    </div>
  );
};

export default CreateToken;