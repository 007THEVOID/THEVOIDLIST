/* ===============================
   BASIC MODALS (NO WEB3 HERE)
================================ */
const form = document.getElementById('projectForm')
const feeModal = document.getElementById('feeModal')
const walletModal = document.getElementById('walletModal')
const successModal = document.getElementById('successModal')

const open = (m) => m.classList.remove('hidden')
const close = (m) => m.classList.add('hidden')

form.addEventListener('submit', (e) => {
  e.preventDefault()
  open(feeModal)
})

document.querySelectorAll('.close').forEach(btn => {
  btn.onclick = () => {
    close(feeModal)
    close(walletModal)
    close(successModal)
  }
})

document.getElementById('payBtn').onclick = () => {
  close(feeModal)
  open(walletModal)
}

/* ===============================
   CONFIG
================================ */
const WALLETCONNECT_PROJECT_ID = '59ba0228712f04a947916abb7db06ab1'
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const RECEIVER_ADDRESS = '0xYOUR_RECEIVER_ADDRESS'
const LISTING_FEE_USDT = '50'

/* ===============================
   METAMASK
================================ */
document.getElementById('mmBtn').onclick = async () => {
  if (!window.ethereum) {
    alert('MetaMask not installed')
    return
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' })
  await payWithUSDT()
}

/* ===============================
   WALLETCONNECT (v2)
================================ */
document.getElementById('wcBtn').onclick = async () => {
  const { createWeb3Modal, defaultConfig } = await import(
    'https://unpkg.com/@web3modal/ethers@5/dist/index.js'
  )

  const metadata = {
    name: 'Token Listing',
    description: 'Submit token for listing',
    url: window.location.origin,
    icons: []
  }

  const ethersConfig = defaultConfig({ metadata })

  createWeb3Modal({
    ethersConfig,
    chains: [{
      chainId: 1,
      name: 'Ethereum',
      currency: 'ETH',
      rpcUrl: 'https://cloudflare-eth.com',
      explorerUrl: 'https://etherscan.io'
    }],
    projectId: WALLETCONNECT_PROJECT_ID
  }).open()

  await payWithUSDT()
}

/* ===============================
   USDT PAYMENT
================================ */
async function payWithUSDT() {
  const { ethers } = await import(
    'https://cdn.jsdelivr.net/npm/ethers@5/dist/ethers.esm.min.js'
  )

  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()

  const usdt = new ethers.Contract(
    USDT_ADDRESS,
    [
      'function decimals() view returns (uint8)',
      'function transfer(address to, uint256 amount) returns (bool)'
    ],
    signer
  )

  const decimals = await usdt.decimals()
  const amount = ethers.utils.parseUnits(LISTING_FEE_USDT, decimals)

  const tx = await usdt.transfer(RECEIVER_ADDRESS, amount)
  await tx.wait()

  close(walletModal)
  open(successModal)
}
