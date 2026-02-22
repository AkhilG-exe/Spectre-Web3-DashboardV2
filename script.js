const SCRIPT_CONFIG = {
  ACCESS_PIN: "052809",
  API_KEYS: {
    ALPACA: "allpaca_key = \"placeholder\"",
    GROQ: "groq_key = \"placeholder\"",
    RENDER: "render_key = \"placeholder\"",
  },
  BOT_TEMPLATES: [
    {
      name: "Momentum Hunter",
      renderUrl: "https://api.render.com/deploy/svc-placeholder-1",
      script:
        "# bot1.py\n# Add your strategy logic\n# Example: run momentum scan and push alerts\nprint('Bot 1 running')",
      deployed: false,
    },
    {
      name: "Mean Reversion Scout",
      renderUrl: "https://api.render.com/deploy/svc-placeholder-2",
      script:
        "# bot2.py\n# Add your mean reversion logic\n# Example: detect z-score extremes\nprint('Bot 2 running')",
      deployed: false,
    },
    {
      name: "Breakout Sentinel",
      renderUrl: "https://api.render.com/deploy/svc-placeholder-3",
      script:
        "# bot3.py\n# Add your breakout logic\n# Example: alert on range expansion\nprint('Bot 3 running')",
      deployed: false,
    },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const pinGate = document.getElementById("pinGate");
  const dashboardApp = document.getElementById("dashboardApp");
  const globalPinInput = document.getElementById("globalPinInput");
  const globalUnlockBtn = document.getElementById("globalUnlockBtn");
  const globalPinStatus = document.getElementById("globalPinStatus");

  const themeToggle = document.getElementById("themeToggle");
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");
  const walletButtons = document.querySelectorAll("[data-wallet]");
  const walletStatus = document.getElementById("walletStatus");

  const refreshAlpaca = document.getElementById("refreshAlpaca");
  const alpacaStatus = document.getElementById("alpacaStatus");
  const portfolioValue = document.getElementById("portfolioValue");
  const equityDelta = document.getElementById("equityDelta");
  const todayPl = document.getElementById("todayPl");
  const todayPlPct = document.getElementById("todayPlPct");

  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatWindow = document.getElementById("chatWindow");
  const botTemplateList = document.getElementById("botTemplateList");

  if (!pinGate || !dashboardApp || !globalPinInput || !globalUnlockBtn || !globalPinStatus) {
    console.error("Critical PIN gate elements missing.");
    return;
  }

  let chart;
  let isUnlocked = false;
  let alpacaPoll;

  renderBotTemplates();

  globalUnlockBtn.addEventListener("click", unlockDashboard);
  globalPinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      unlockDashboard();
    }
  });

  function unlockDashboard() {
    const entered = globalPinInput.value.trim();

    if (!entered) {
      globalPinStatus.textContent = "Enter PIN first";
      globalPinStatus.className = "status-chip bad";
      return;
    }

    if (entered === SCRIPT_CONFIG.ACCESS_PIN) {
      isUnlocked = true;
      pinGate.classList.add("hidden");
      dashboardApp.classList.remove("hidden-until-unlocked");
      dashboardApp.setAttribute("aria-hidden", "false");
      globalPinStatus.textContent = "Unlocked";
      globalPinStatus.className = "status-chip good";
      fetchAlpacaProfit();
      startAlpacaPolling();
      return;
    }

    globalPinStatus.textContent = "Invalid PIN";
    globalPinStatus.className = "status-chip bad";
  }

  function startAlpacaPolling() {
    if (alpacaPoll) {
      clearInterval(alpacaPoll);
    }

    alpacaPoll = setInterval(() => {
      if (isUnlocked) {
        fetchAlpacaProfit();
      }
    }, 30000);
  }

  themeToggle?.addEventListener("click", () => {
    if (!isUnlocked) return;
    body.classList.toggle("theme-light");
    body.classList.toggle("theme-dark");
  });

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!isUnlocked) return;

      tabs.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      tab.classList.add("active");
      const panel = document.getElementById(tab.dataset.tab);
      panel?.classList.add("active");

      if (tab.dataset.tab === "charts" && !chart) {
        renderChart();
      }
    });
  });

  walletButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!isUnlocked || !walletStatus) return;

      const walletName = button.dataset.wallet;
      const short = `${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

      Array.from(walletStatus.children).forEach((li) => {
        if (li.textContent.includes(walletName)) {
          li.innerHTML = `${walletName}: <span class="up">Connected (${short})</span>`;
        }
      });
    });
  });

  refreshAlpaca?.addEventListener("click", () => {
    if (!isUnlocked) return;
    fetchAlpacaProfit();
  });

  chatForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isUnlocked || !chatInput || !chatWindow) return;

    const prompt = chatInput.value.trim();
    if (!prompt) return;

    addMessage("user", `You: ${prompt}`);
    chatInput.value = "";

    const keyConfig = SCRIPT_CONFIG.API_KEYS.GROQ;
    const key = extractApiValue(keyConfig);

    if (!key || key === "placeholder") {
      addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
      return;
    }

    addMessage("bot", "AI: Running Groq analysis...");

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "You are a concise trading analyst. Provide entry, invalidation, and risk guidance in <= 5 bullets.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || "No analysis returned.";
      replaceLastBotMessage(`AI: ${content}`);
    } catch (error) {
      replaceLastBotMessage("AI: Groq request failed. Falling back to local analysis.");
      addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
    }
  });

  async function fetchAlpacaProfit() {
    if (!alpacaStatus || !portfolioValue || !equityDelta || !todayPl || !todayPlPct) {
      return;
    }

    alpacaStatus.textContent = "Refreshing live P/L...";
    alpacaStatus.className = "status-chip neutral";

    try {
      const response = await fetch("/api/alpaca/profit");
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Alpaca fetch failed");
      }

      portfolioValue.textContent = formatCurrency(data.portfolio_value);
      equityDelta.textContent = formatSignedPercent(data.equity_change_pct);
      equityDelta.className = data.equity_change_pct >= 0 ? "up" : "down";

      todayPl.textContent = formatSignedCurrency(data.today_pl);
      todayPl.className = data.today_pl >= 0 ? "up" : "down";

      todayPlPct.textContent = formatSignedPercent(data.today_pl_pct);
      todayPlPct.className = data.today_pl_pct >= 0 ? "up" : "down";

      alpacaStatus.textContent = data.mode === "live" ? "Live Alpaca connected" : "Paper Alpaca connected";
      alpacaStatus.className = "status-chip good";
    } catch (error) {
      alpacaStatus.textContent = `Alpaca error: ${error.message}`;
      alpacaStatus.className = "status-chip bad";
    }
  }

  function renderBotTemplates() {
    if (!botTemplateList) return;

    botTemplateList.innerHTML = "";

    SCRIPT_CONFIG.BOT_TEMPLATES.forEach((bot, index) => {
      const card = document.createElement("section");
      card.className = "bot-item";

      const deployedClass = bot.deployed ? "deploy-btn deployed" : "deploy-btn";
      const deployedText = bot.deployed ? "Deployed" : "Deploy";

      card.innerHTML = `
        <h3>Bot ${index + 1}</h3>
        <label for="bot-name-${index}">Bot Name</label>
        <input id="bot-name-${index}" data-field="name" data-index="${index}" type="text" value="${escapeHtml(bot.name)}" />
        <label for="bot-url-${index}">Render URL</label>
        <input id="bot-url-${index}" data-field="renderUrl" data-index="${index}" type="text" value="${escapeHtml(bot.renderUrl)}" />
        <label for="bot-script-${index}">Python Script Template</label>
        <textarea id="bot-script-${index}" data-field="script" data-index="${index}" rows="6">${escapeHtml(bot.script)}</textarea>
        <button class="btn ${deployedClass}" data-index="${index}">${deployedText}</button>
        <p class="hint">Render key source: SCRIPT_CONFIG.API_KEYS.RENDER</p>
      `;

      botTemplateList.appendChild(card);
    });

    botTemplateList.querySelectorAll("input[data-field], textarea[data-field]").forEach((field) => {
      field.addEventListener("input", (event) => {
        const idx = Number(event.target.dataset.index);
        const prop = event.target.dataset.field;
        SCRIPT_CONFIG.BOT_TEMPLATES[idx][prop] = event.target.value;
      });
    });

    botTemplateList.querySelectorAll(".deploy-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const idx = Number(event.target.dataset.index);
        const bot = SCRIPT_CONFIG.BOT_TEMPLATES[idx];
        bot.deployed = !bot.deployed;

        if (bot.deployed) {
          await fakeRenderDeploy(bot);
        }

        renderBotTemplates();
      });
    });
  }

  async function fakeRenderDeploy(bot) {
    const apiKey = extractApiValue(SCRIPT_CONFIG.API_KEYS.RENDER);
    console.log("Render deploy payload", {
      apiKey,
      botName: bot.name,
      renderUrl: bot.renderUrl,
      script: bot.script,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  function addMessage(role, text) {
    if (!chatWindow) return;

    const p = document.createElement("p");
    p.className = role;
    p.textContent = text;
    chatWindow.appendChild(p);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function replaceLastBotMessage(text) {
    if (!chatWindow) return;

    const bots = chatWindow.querySelectorAll(".bot");
    const last = bots[bots.length - 1];
    if (last) {
      last.textContent = text;
    }
  }

  function renderChart() {
    const ctx = document.getElementById("tradingChart");
    if (!ctx || typeof Chart === "undefined") return;

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
        datasets: [
          {
            label: "BTC Perp",
            data: [63780, 63910, 63820, 64060, 64150, 64010, 64240, 64390],
            borderColor: "#5b8cff",
            backgroundColor: "rgba(91, 140, 255, 0.2)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        plugins: { legend: { labels: { color: "#9fb2d9" } } },
        scales: {
          x: { ticks: { color: "#9fb2d9" }, grid: { color: "rgba(159,178,217,0.15)" } },
          y: { ticks: { color: "#9fb2d9" }, grid: { color: "rgba(159,178,217,0.15)" } },
        },
      },
    });
  }
});

function extractApiValue(line) {
  const match = line.match(/=\s*"([^"]+)"/);
  return match ? match[1] : "";
}

function formatCurrency(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function formatSignedCurrency(v) {
  const abs = formatCurrency(Math.abs(v));
  return v >= 0 ? `+${abs}` : `-${abs}`;
}

function formatSignedPercent(v) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const body = document.body;
const pinGate = document.getElementById("pinGate");
const dashboardApp = document.getElementById("dashboardApp");
const globalPinInput = document.getElementById("globalPinInput");
const globalUnlockBtn = document.getElementById("globalUnlockBtn");
const globalPinStatus = document.getElementById("globalPinStatus");

const themeToggle = document.getElementById("themeToggle");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const walletButtons = document.querySelectorAll("[data-wallet]");
const walletStatus = document.getElementById("walletStatus");

const refreshAlpaca = document.getElementById("refreshAlpaca");
const alpacaStatus = document.getElementById("alpacaStatus");
const portfolioValue = document.getElementById("portfolioValue");
const equityDelta = document.getElementById("equityDelta");
const todayPl = document.getElementById("todayPl");
const todayPlPct = document.getElementById("todayPlPct");

const alpacaConnect = document.getElementById("alpacaConnect");
const alpacaStatus = document.getElementById("alpacaStatus");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatWindow = document.getElementById("chatWindow");
const botTemplateList = document.getElementById("botTemplateList");

let chart;
let isUnlocked = false;
let alpacaPoll;

renderBotTemplates();

globalUnlockBtn.addEventListener("click", unlockDashboard);
globalPinInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    unlockDashboard();
  }
});

function unlockDashboard() {
  if (globalPinInput.value.trim() === SCRIPT_CONFIG.ACCESS_PIN) {
    isUnlocked = true;
    pinGate.classList.add("hidden");
    dashboardApp.classList.remove("hidden-until-unlocked");
    dashboardApp.setAttribute("aria-hidden", "false");
    globalPinStatus.textContent = "Unlocked";
    globalPinStatus.className = "status-chip good";
    fetchAlpacaProfit();
    startAlpacaPolling();
    return;
  }

  globalPinStatus.textContent = "Invalid PIN";
  globalPinStatus.className = "status-chip bad";
}

function startAlpacaPolling() {
  if (alpacaPoll) {
    clearInterval(alpacaPoll);
  }

  alpacaPoll = setInterval(() => {
    if (isUnlocked) {
      fetchAlpacaProfit();
    }
  }, 30000);
}

themeToggle.addEventListener("click", () => {
  if (!isUnlocked) return;
  body.classList.toggle("theme-light");
  body.classList.toggle("theme-dark");
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (!isUnlocked) return;

    tabs.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));

    tab.classList.add("active");
    const panel = document.getElementById(tab.dataset.tab);
    panel.classList.add("active");

    if (tab.dataset.tab === "charts" && !chart) {
      renderChart();
    }
  });
});

walletButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!isUnlocked) return;

    const walletName = button.dataset.wallet;
    const short = `${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`;

    Array.from(walletStatus.children).forEach((li) => {
      if (li.textContent.includes(walletName)) {
        li.innerHTML = `${walletName}: <span class="up">Connected (${short})</span>`;
      }
    });
  });
});

refreshAlpaca.addEventListener("click", () => {
  if (!isUnlocked) return;
  fetchAlpacaProfit();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isUnlocked) return;

  const prompt = chatInput.value.trim();
  if (!prompt) return;

  addMessage("user", `You: ${prompt}`);
  chatInput.value = "";

  const keyConfig = SCRIPT_CONFIG.API_KEYS.GROQ;
  const key = extractApiValue(keyConfig);

  if (!key || key === "placeholder") {
    addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
    return;
  }

  addMessage("bot", "AI: Running Groq analysis...");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a concise trading analyst. Provide entry, invalidation, and risk guidance in <= 5 bullets.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "No analysis returned.";
    replaceLastBotMessage(`AI: ${content}`);
  } catch (error) {
    replaceLastBotMessage("AI: Groq request failed. Falling back to local analysis.");
    addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
  }
});

async function fetchAlpacaProfit() {
  alpacaStatus.textContent = "Refreshing live P/L...";
  alpacaStatus.className = "status-chip neutral";

  try {
    const response = await fetch("/api/alpaca/profit");
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Alpaca fetch failed");
    }

    portfolioValue.textContent = formatCurrency(data.portfolio_value);
    equityDelta.textContent = formatSignedPercent(data.equity_change_pct);
    equityDelta.className = data.equity_change_pct >= 0 ? "up" : "down";

    todayPl.textContent = formatSignedCurrency(data.today_pl);
    todayPl.className = data.today_pl >= 0 ? "up" : "down";

    todayPlPct.textContent = formatSignedPercent(data.today_pl_pct);
    todayPlPct.className = data.today_pl_pct >= 0 ? "up" : "down";

    alpacaStatus.textContent = data.mode === "live" ? "Live Alpaca connected" : "Paper Alpaca connected";
    alpacaStatus.className = "status-chip good";
  } catch (error) {
    alpacaStatus.textContent = `Alpaca error: ${error.message}`;
    alpacaStatus.className = "status-chip bad";
  }
}

function renderBotTemplates() {
  botTemplateList.innerHTML = "";

  SCRIPT_CONFIG.BOT_TEMPLATES.forEach((bot, index) => {
    const card = document.createElement("section");
    card.className = "bot-item";

    const deployedClass = bot.deployed ? "deploy-btn deployed" : "deploy-btn";
    const deployedText = bot.deployed ? "Deployed" : "Deploy";

    card.innerHTML = `
      <h3>Bot ${index + 1}</h3>
      <label for="bot-name-${index}">Bot Name</label>
      <input id="bot-name-${index}" data-field="name" data-index="${index}" type="text" value="${escapeHtml(bot.name)}" />
      <label for="bot-url-${index}">Render URL</label>
      <input id="bot-url-${index}" data-field="renderUrl" data-index="${index}" type="text" value="${escapeHtml(bot.renderUrl)}" />
      <label for="bot-script-${index}">Python Script Template</label>
      <textarea id="bot-script-${index}" data-field="script" data-index="${index}" rows="6">${escapeHtml(bot.script)}</textarea>
      <button class="btn ${deployedClass}" data-index="${index}">${deployedText}</button>
      <p class="hint">Render key source: SCRIPT_CONFIG.API_KEYS.RENDER</p>
    `;

    botTemplateList.appendChild(card);
  });

  botTemplateList.querySelectorAll("input[data-field], textarea[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const idx = Number(event.target.dataset.index);
      const prop = event.target.dataset.field;
      SCRIPT_CONFIG.BOT_TEMPLATES[idx][prop] = event.target.value;
    });
  });

  botTemplateList.querySelectorAll(".deploy-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const idx = Number(event.target.dataset.index);
      const bot = SCRIPT_CONFIG.BOT_TEMPLATES[idx];
      bot.deployed = !bot.deployed;

      if (bot.deployed) {
        await fakeRenderDeploy(bot);
      }

      renderBotTemplates();
    });
  });
}

    });
  });
});

alpacaConnect.addEventListener("click", () => {
  if (!isUnlocked) return;

  const key = document.getElementById("alpacaKey").value.trim();
  const secret = document.getElementById("alpacaSecret").value.trim();

  if (!key || !secret) {
    alpacaStatus.textContent = "Missing credentials";
    alpacaStatus.className = "status-chip neutral";
    return;
  }

  alpacaStatus.textContent = "Attached and ready for paper/live routing";
  alpacaStatus.className = "status-chip good";
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isUnlocked) return;

  const prompt = chatInput.value.trim();
  if (!prompt) return;

  addMessage("user", `You: ${prompt}`);
  chatInput.value = "";

  const keyConfig = SCRIPT_CONFIG.API_KEYS.GROQ;
  const key = extractApiValue(keyConfig);

  if (!key || key === "placeholder") {
    addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
    return;
  }

  addMessage("bot", "AI: Running Groq analysis...");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a concise trading analyst. Provide entry, invalidation, and risk guidance in <= 5 bullets.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "No analysis returned.";
    replaceLastBotMessage(`AI: ${content}`);
  } catch (error) {
    replaceLastBotMessage("AI: Groq request failed. Falling back to local analysis.");
    addMessage("bot", `AI: ${ruleBasedAnalysis(prompt)}`);
  }
});

function renderBotTemplates() {
  botTemplateList.innerHTML = "";

  SCRIPT_CONFIG.BOT_TEMPLATES.forEach((bot, index) => {
    const card = document.createElement("section");
    card.className = "bot-item";

    const deployedClass = bot.deployed ? "deploy-btn deployed" : "deploy-btn";
    const deployedText = bot.deployed ? "Deployed" : "Deploy";

    card.innerHTML = `
      <h3>Bot ${index + 1}</h3>
      <label for="bot-name-${index}">Bot Name</label>
      <input id="bot-name-${index}" data-field="name" data-index="${index}" type="text" value="${escapeHtml(bot.name)}" />
      <label for="bot-url-${index}">Render URL</label>
      <input id="bot-url-${index}" data-field="renderUrl" data-index="${index}" type="text" value="${escapeHtml(bot.renderUrl)}" />
      <label for="bot-script-${index}">Python Script Template</label>
      <textarea id="bot-script-${index}" data-field="script" data-index="${index}" rows="6">${escapeHtml(bot.script)}</textarea>
      <button class="btn ${deployedClass}" data-index="${index}">${deployedText}</button>
      <p class="hint">Render key source: SCRIPT_CONFIG.API_KEYS.RENDER</p>
    `;

    botTemplateList.appendChild(card);
  });

  botTemplateList.querySelectorAll("input[data-field], textarea[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const idx = Number(event.target.dataset.index);
      const prop = event.target.dataset.field;
      SCRIPT_CONFIG.BOT_TEMPLATES[idx][prop] = event.target.value;
    });
  });

  botTemplateList.querySelectorAll(".deploy-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const idx = Number(event.target.dataset.index);
      const bot = SCRIPT_CONFIG.BOT_TEMPLATES[idx];
      bot.deployed = !bot.deployed;

      if (bot.deployed) {
        await fakeRenderDeploy(bot);
      }

      renderBotTemplates();
    });
  });
}

async function fakeRenderDeploy(bot) {
  const apiKey = extractApiValue(SCRIPT_CONFIG.API_KEYS.RENDER);
  console.log("Render deploy payload", {
    apiKey,
    botName: bot.name,
    renderUrl: bot.renderUrl,
    script: bot.script,
  });

  await new Promise((resolve) => setTimeout(resolve, 500));
}

function addMessage(role, text) {
  const p = document.createElement("p");
  p.className = role;
  p.textContent = text;
  chatWindow.appendChild(p);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function replaceLastBotMessage(text) {
  const bots = chatWindow.querySelectorAll(".bot");
  const last = bots[bots.length - 1];
  if (last) {
    last.textContent = text;
  }
}

function ruleBasedAnalysis(prompt) {
  const lower = prompt.toLowerCase();

  if (lower.includes("btc") || lower.includes("bitcoin")) {
    return "BTC setup: wait for 15m close above resistance, size at 0.75R due to volatility, invalidate below prior swing low.";
  }

  if (lower.includes("spy") || lower.includes("qqq")) {
    return "Index setup: trade with trend only; enter on pullback to VWAP reclaim, stop below session low, target 1.8R.";
  }

  return "Build plan: identify trend + liquidity level, confirm momentum divergence, risk <=1% and move stop to break-even at 1R.";
}

function renderChart() {
  const ctx = document.getElementById("tradingChart");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00"],
      datasets: [
        {
          label: "BTC Perp",
          data: [63780, 63910, 63820, 64060, 64150, 64010, 64240, 64390],
          borderColor: "#5b8cff",
          backgroundColor: "rgba(91, 140, 255, 0.2)",
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: "#9fb2d9" } } },
      scales: {
        x: { ticks: { color: "#9fb2d9" }, grid: { color: "rgba(159,178,217,0.15)" } },
        y: { ticks: { color: "#9fb2d9" }, grid: { color: "rgba(159,178,217,0.15)" } },
      },
    },
  });
}

function extractApiValue(line) {
  const match = line.match(/=\s*"([^"]+)"/);
  return match ? match[1] : "";
}

function formatCurrency(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);
}

function formatSignedCurrency(v) {
  const abs = formatCurrency(Math.abs(v));
  return v >= 0 ? `+${abs}` : `-${abs}`;
}

function formatSignedPercent(v) {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
