import React, { createContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import FundChainXABI from '../contracts/FundChainX.json';

export const Web3Context = createContext();

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x74F80bE31FD2736d27f79B485f694583681bCd46";
const NETWORK_RPC_URL = process.env.REACT_APP_RPC_URL || "https://sepolia.infura.io/v3/173a86041e634007924433b2cc66a6da";

export const Web3Provider = ({ children }) => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [address, setAddress] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWalletInstalled, setIsWalletInstalled] = useState(!!window.ethereum);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask');
      setIsWalletInstalled(false);
      return false;
    }

    try {
      setIsConnecting(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);

      if (!accounts || accounts.length === 0) {
        setError('No accounts found. Please ensure MetaMask is unlocked and try again.');
        return false;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, FundChainXABI.abi, signer);

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setContract(contract);
      setError(null);
      
      return address;
    } catch (error) {
      setError(`Failed to connect wallet: ${error.message}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  useEffect(() => {
    const initProvider = async () => {
      const networkProvider = new ethers.JsonRpcProvider(NETWORK_RPC_URL);
      setProvider(networkProvider);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, FundChainXABI.abi, networkProvider));
    };
    initProvider();

    if (window.ethereum) {
      const tryReconnect = async () => {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            await connectWallet();
          }
        } catch (error) {
          // Silently handle reconnection failure
        }
      };
      tryReconnect();

      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          setAddress(null);
          setSigner(null);
        } else {
          await connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, [connectWallet]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        contract,
        address,
        connectWallet,
        error,
        isConnecting,
        isWalletInstalled,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};