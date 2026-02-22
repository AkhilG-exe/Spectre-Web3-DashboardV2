# 👻 Spectre Web3 Dashboard

**Spectre** is a high-fidelity, "Retro-Ghost" themed Web3 workstation. It bridges the gap between the aesthetic elegance of the Phantom Wallet and the raw utility of a professional trading terminal. Spectre allows users to analyze global markets, manage decentralized assets, and track trading psychology in a single, unified interface.

---

## 🚀 Key Features

* **📈 Dynamic Charting**: Integrated TradingView’s professional-grade engine. Users can search and analyze any global asset (Crypto, Stocks, or Forex) with real-time WebSocket data feeds.
* **🤝 Web3 Handshake**: Seamless, real-world wallet connectivity. Utilizes JSON-RPC providers to fetch live Ethereum (ETH) balances and wallet metadata directly from the blockchain.
* **🎨 UI/UX (Retro-Ghost Identity)**: A high-fidelity design system featuring deep-space gradients, glassmorphism, and smooth transitions inspired by top-tier DeFi applications.
* **📓 Trade Journaling**: A basic PnL (Profit & Loss) tracker for now.

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, CSS3 (Advanced Glassmorphism & Keyframe Animations), JavaScript (ES6+).
* **Web3**: Ethers.js / Window.ethereum (MetaMask & Phantom provider integration).
* **APIs**: TradingView Lightweight Charts, CoinGecko Market API, Alchemy/Infura for blockchain queries.

---

## 🚧 Project Status: Work In Progress (WIP)

Spectre is currently in active development. While the core dashboard, market search, and wallet handshake are fully functional, we are currently architecting the advanced data visualization suite.

---

## 🔮 Future Roadmap

We are evolving Spectre to become the ultimate companion for the modern decentralized trader. Upcoming milestones include:

* **📊 Asset Allocation Pie Chart**: A dynamic visual breakdown of all tokens held in the connected wallet, showing real-time percentage distribution and total USD valuation.
    
* **⚡ Multi-Chain Aggregator**: Extending support to Solana (SPL), Polygon, and Arbitrum to provide a truly multi-chain portfolio view.
* **🛡️ Encrypted Alpha Vault**: A PIN-protected local storage module for saving private trading strategies and sensitive trade notes.
* **🔔 Real-time Volatility Alerts**: Push notifications for sudden price movements or pattern breakouts detected on the user's custom watchlist.
* **📓 Trade Journaling**:  Features a step-by-step mascot interaction flow to help traders log entries, exits, and psychological states. 
---

## 📂 Installation (For Developers)

1. Clone the repository: `git clone https://github.com/AkhilG-exe/spectre-dashboard.git`
2. Open `index.html` in any modern browser.
3. Ensure a Web3 provider (MetaMask or Phantom) is installed for the "My Wallet" features.

## 🤝 Collaboration & Contribution

I am actively looking for collaborators to help expand the **Spectre Ecosystem**. Whether you are a UI/UX designer, or a quantitative trader, your input is welcome!

* **Bug Reports**: If you find a bug, please open an issue on the GitHub repository.
* **Feature Requests**: Have an idea for a new module? Reach out to me ❤️!
* **Direct Contact**: Connect with me on GitHub [@AkhilG-exe](https://github.com/AkhilG-exe) for partnership inquiries or to discuss custom fintech integrations.

---
*Built with ❤️ for the Decentralized Community.*


## ⚙️ Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables for this dashboard backend:
- `DASHBOARD_PIN`
- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`
- `ALPACA_BASE_URL`
- `GROQ_API_KEY`
- `RENDER_API_KEY`

Run with:

```bash
python3 app.py
```
