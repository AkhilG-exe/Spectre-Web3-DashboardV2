// 1. Auth Logic
function unlockDashboard() {
    const pin = document.getElementById('pin-input').value;
    if(pin === "0000") { // Set your own PIN
        document.getElementById('login-modal').style.display = 'none';
        searchCrypto('BTC'); // Initial load
    } else {
        alert("Invalid PIN");
    }
}

// 2. Search & Chart Logic (TradingView)
function searchCrypto(symbol = '') {
    const query = symbol || document.getElementById('crypto-search').value.toUpperCase();
    if(!query) return;

    new TradingView.widget({
        "autosize": true,
        "symbol": `BINANCE:${query}USDT`,
        "interval": "D",
        "theme": "dark",
        "style": "1",
        "container_id": "chart-box",
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "details": true
    });
}

// 3. Tab Management
function showTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById('btn-' + tabId).classList.add('active');
}

// 4. REAL Wallet Connection
async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const address = accounts[0];
            
            // Get Real Balance
            const balanceWei = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
            });
            
            const balanceEth = (parseInt(balanceWei, 16) / 1e18).toFixed(4);
            
            // Update UI
            document.getElementById('eth-balance').innerText = `${balanceEth} ETH`;
            document.getElementById('wallet-status').innerText = `Connected: ${address.substring(0,6)}...${address.substring(38)}`;
            document.getElementById('mainConnectBtn').innerText = "Wallet Linked";
        } catch (err) {
            console.error(err);
        }
    } else {
        alert("Please install MetaMask or Phantom!");
    }
}
