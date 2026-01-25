// ====== DOM ELEMENTS ======
const form = document.getElementById("tokenForm");
const modal = document.getElementById("feeModal");
const payBtn = document.getElementById("connectWalletBtn");
const closeBtn = document.getElementById("closeModal");

// Add status box inside modal
const statusBox = document.createElement("div");
statusBox.style.marginTop = "10px";
modal.querySelector(".modal-content").appendChild(statusBox);

// ====== MOBILE-FRIENDLY MODAL ======
function adjustModalForMobile() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    modal.style.padding = "20px";
    modal.style.fontSize = "16px";
  }
}
adjustModalForMobile();

// ====== FORM SUBMIT ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Disable submit to prevent double clicks
  const submitBtn = form.querySelector(".submit-btn");
  submitBtn.disabled = true;

  if (typeof grecaptcha === "undefined") {
    alert("CAPTCHA script not loaded!");
    submitBtn.disabled = false;
    return;
  }

  const captchaResponse = grecaptcha.getResponse();
  if (!captchaResponse) {
    alert("Please complete the CAPTCHA first.");
    submitBtn.disabled = false;
    return;
  }

  // Show modal
  modal.classList.remove("hidden");
  modal.style.display = "flex";
  statusBox.textContent = "";

  submitBtn.disabled = false;
});

// ====== MODAL CLOSE ======
closeBtn.onclick = () => {
  modal.classList.add("hidden");
  statusBox.textContent = "";
};

// ====== CONNECT WALLET BUTTON ======
payBtn.onclick = async () => {
  try {
    const walletModule = await import("./wallet.js");
    await walletModule.initWallet(statusBox, form);
  } catch (err) {
    console.error("Wallet module failed", err);
    statusBox.textContent = "Wallet connection failed ❌";
  }
};
