const positionMap = {};
let currentPosition = {};

let currentIndex = -1;
let portfolioShown = true;

let priceInterval = -1;

let portfolio = {
  loaded: false,
  solBalance: "1.000000000",
  initialSOL: "1.000000000",
  trades: [],
  positions: [],
};

function reset() {
  portfolio = {
    uiPositions: portfolio.uiPositions || {
      uiPositions: {
        display: {
          left: window.innerWidth - 420, // 420px width (400px content + 20px padding)
          top: 200,
        },
        buttons: {
          left: 20,
          top: 100,
        },
      },
    },
    trades: [],
    positions: [],
    solBalance: "1.000000000",
    initialSOL: "1.000000000",
  };
  currentIndex = -1;
  currentPosition = {};
  chrome.storage.local.set({ portfolio });
  injectTradeButtons();
}

chrome.storage.local.get(["portfolio", "uiEnabled"], (result) => {
  // if (result.portfolio) {
  portfolio = {
    uiPositions: {
      display: {
        left: window.innerWidth - 420, // 420px width (400px content + 20px padding)
        top: 200,
      },
      buttons: {
        left: 20,
        top: 100,
      },
    },
    trades: [],
    positions: [],
    solBalance: "1.000000000",
    initialSOL: "1.000000000",
    ...result.portfolio,
  };
  portfolio.loaded = true;

  // portfolio.initialSOL = result.portfolio?.initialSOL || "1.000000000";
  // portfolio.solBalance = result.portfolio?.solBalance || "1.000000000";

  if (!portfolio.uiPositions.buttons) {
    portfolio.uiPositions.buttons = {
      left: 20,
      top: 100,
    };
  }

  // Initialize positions if missing
  // portfolio.uiPositions = portfolio.uiPositions || {
  //   display: {
  //     left: window.innerWidth - 420,
  //     top: 200,
  //   },
  //   buttons: {
  //     left: 20,
  //     top: 100,
  //   },
  // };
  // } else {
  //   portfolio.positions = [];
  //   portfolio.trades = [];
  // }

  if (result.uiEnabled === undefined || result.uiEnabled === false) {
    disableUI();
  } else {
    injectTradeButtons();
  }
});

function getRandomTime() {
  // Generate a random time between 250ms and 1500ms
  const min = 250; // 0.25 seconds in milliseconds
  const max = 1500; // 1.5 seconds in milliseconds
  return Math.random() * (max - min) + min;
}

function injectTradeButtons() {
  console.log("Injecting trade buttons...");
  const priceSelectors = [
    '[data-cable-val="priceQuote"]', // SOL price element
    '[data-cable-val="priceUsd"]',
    "[data-price]",
    ".price",
    '[data-bn-type="price"]',
    ".PriceText",
    ".market-price",
  ];

  const symbolSelectors = [".p-show__pair__cur", "[data-symbol]", ".symbol", ".market-symbol", "h1", ".exchange-title"];

  let currentPrice = 0;
  let symbol = "BTC";
  let priceElement;
  let symbolElement;

  let isMigrating = document.querySelector(".p-show__migration") ? true : false;
  console.log(
    "Is Migratin: ",
    document.querySelector(".p-show__migration > div:first-child").classList.contains("is-hidden"),
  );

  for (const selector of priceSelectors) {
    priceElement = document.querySelector(selector);
    if (priceElement) {
      currentPrice = parseFloat(priceElement.dataset.value);
      break;
    }
  }
  let address = "";

  const test = document.querySelector(".p-show__bar__copy");
  if (test) {
    address = test.dataset.address || null;
  }
  // console.log(address);

  for (const selector of symbolSelectors) {
    symbolElement = document.querySelector(selector);
    if (symbolElement) {
      symbol = symbolElement.textContent.trim().split("/")[0].trim();
      break;
    }
  }

  for (const position of portfolio.positions) {
    if (position.address === address) {
      currentIndex = portfolio.positions.indexOf(position);
      break;
    }
  }

  if (currentIndex === -1) {
    portfolio.positions.push({
      address,
      symbol,
      invested: 0,
      sold: 0,
      tokenAmount: 0,
    });
    currentIndex = portfolio.positions.length - 1;
  }
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "paper-trade-buttons paper-trade";
  buttonContainer.style.cssText = `position: fixed; width: 300px;
    left: ${portfolio.uiPositions.buttons.left}px;
    top: ${portfolio.uiPositions.buttons.top}px;
    z-index: 9999; padding-bottom: 10px;`;
  // Create button grid container
  const buttonGrid = document.createElement("div");
  buttonGrid.style.display = "grid";
  buttonGrid.style.gridTemplateColumns = "repeat(4, 1fr)";
  buttonGrid.style.gap = ".5px";
  buttonGrid.style.marginBottom = "2.5px";

  // Buy buttons (fixed SOL amounts)
  const buyAmounts = [0.1, 0.2, 0.5, 1];
  buyAmounts.forEach((amount) => {
    const button = createTradeButton(`${amount} SOL`, "#2ecc71", async () =>
      setTimeout(() => {
        executeTrade(address, currentPrice, "buy", amount);
      }, getRandomTime()),
    );
    buttonGrid.appendChild(button);
  });

  buttonContainer.appendChild(buttonGrid);

  // Sell buttons (percentage amounts)
  const sellPercentages = [10, 25, 50, 100];
  const sellGrid = buttonGrid.cloneNode();
  sellPercentages.forEach((percent) => {
    const button = createTradeButton(`${percent}%`, "#e74c3c", async () =>
      setTimeout(() => {
        executeTrade(address, currentPrice, "sell", percent);
      }, getRandomTime()),
    );
    sellGrid.appendChild(button);
  });

  buttonContainer.appendChild(sellGrid);
  const existingDisplay = document.querySelector(".paper-trade-buttons");
  if (existingDisplay) {
    existingDisplay.remove();
  }

  document.body.appendChild(buttonContainer);

  beginInterval();
  makeDraggable(buttonContainer);
  updateDisplay();
}

function beginInterval() {
  priceInterval = setInterval(() => {
    updateStatsContainer();
  }, 1000);
}

function updateStatsContainer() {
  const currentPosition = parseFloat(portfolio.positions[currentIndex].tokenAmount) || 0;
  const solPrice = getSOLPrice();
  const symbolData = portfolio.positions[currentIndex];

  const remainingProfit = currentPosition === 0 ? symbolData.sold : currentPosition * solPrice * 1 - 0.01;

  // Add stats container
  const statsContainer = document.createElement("div");
  statsContainer.className = "paper-trade-stats-container paper-trade";
  statsContainer.style.cssText = `
   display: flex;
   justify-content: space-between;
   margin: 8px 5px 0;
   font-size: 0.85em;
   color: white;
 `;

  statsContainer.innerHTML = `
   <div>Invested: <span class="initial-sol">${symbolData.invested.toFixed(9)}</span></div>
   <div>Sold: <span class="remaining-sol">${symbolData.sold.toFixed(9)}</span></div>
  <div>PnL: <span class="pnl">${(remainingProfit - symbolData.invested).toFixed(5)}</span></div>
 `;

  const existingDisplay = document.querySelector(".paper-trade-stats-container");
  if (existingDisplay) {
    existingDisplay.remove();
  }

  const buttonContainer = document.querySelector(".paper-trade-buttons");
  buttonContainer.appendChild(statsContainer);
}

function makeDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  element.style.cursor = "move";

  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";

    if (element.classList.contains("paper-trade-display")) {
      const rect = element.getBoundingClientRect();
      portfolio.uiPositions.display.left = rect.left;
      portfolio.uiPositions.display.top = rect.top;
    } else if (element.classList.contains("paper-trade-buttons")) {
      const rect = element.getBoundingClientRect();
      portfolio.uiPositions.buttons.left = rect.left;
      portfolio.uiPositions.buttons.top = rect.top;
    }
    chrome.storage.local.set({ portfolio });
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    if (element.classList.contains("paper-trade-display")) {
      chrome.storage.local.set({ portfolio });
    }
  }
}

function createTradeButton(text, color, onClick) {
  const button = document.createElement("button");
  button.textContent = text;
  button.style.cssText = `
    width: 70px;
    padding: 4px 6px;
    background-color: ${color};
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: opacity 0.2s;
  `;
  button.addEventListener("mouseenter", () => (button.style.opacity = "0.8"));
  button.addEventListener("mouseleave", () => (button.style.opacity = "1"));
  button.addEventListener("click", onClick);
  return button;
}

function getSOLPrice() {
  const priceElement = document.querySelector('[data-cable-val="priceQuote"]');
  return priceElement ? parseFloat(priceElement.dataset.value) : 0;
}

function executeTrade(address, _, type, amountOrPercent) {
  const solPrice = getSOLPrice();
  const withoutPumpFee = amountOrPercent * 0.99;
  const coinAmount = withoutPumpFee / solPrice;
  let sellAmount = 0;
  let solAmount = 0;
  let tokenAmount = coinAmount;

  if (type === "buy") {
    const currentSOL = parseFloat(portfolio.solBalance);

    if (amountOrPercent > currentSOL) {
      alert(`Insufficient SOL! ${currentSOL}`);
      return;
    }

    // Update SOL balance and positions
    portfolio.solBalance = (currentSOL - amountOrPercent).toFixed(9);

    solAmount = amountOrPercent;
    portfolio.positions[currentIndex].invested += amountOrPercent;
    portfolio.positions[currentIndex].tokenAmount += tokenAmount;
  } else {
    const currentPosition = parseFloat(portfolio.positions[currentIndex].tokenAmount) || 0;

    if (currentPosition === 0) {
      return;
    }
    sellAmount = currentPosition * (amountOrPercent / 100);

    if (sellAmount > currentPosition) {
      alert("Insufficient position!");
      return;
    }

    solAmount = sellAmount * solPrice * 0.99;
    tokenAmount = sellAmount;
    // Update SOL balance and positions
    portfolio.solBalance = (parseFloat(portfolio.solBalance) + solAmount).toFixed(9);
    portfolio.positions[currentIndex].tokenAmount -= sellAmount;
    portfolio.positions[currentIndex].sold += solAmount;
  }

  portfolio.trades.push({
    type,
    symbol: portfolio.positions[currentIndex].symbol,
    address,
    sol: solAmount,
    tokenAmount,
    timestamp: new Date().toISOString(),
  });

  if (parseFloat(portfolio.positions[currentIndex].tokenAmount) === 0) {
    clearInterval(priceInterval);
    priceInterval = -1;
  }

  if (priceInterval === -1) {
    beginInterval();
  }

  // console.log(portfolio.positions);
  chrome.storage.local.set({ portfolio });
  updateDisplay();
  // updateStatsContainer(address);
}

function updateDisplay() {
  const displayElement = document.createElement("div");
  displayElement.className = "paper-trade-display paper-trade";
  displayElement.style.cssText = `
    position: fixed;
    left: ${portfolio.uiPositions.display.left}px;
    top: ${portfolio.uiPositions.display.top}px;
    background: gray;
    opacity: 65%;
    color: black;
    padding: 8px;
    border-radius: 2px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 9999;
    width: 400px;
  `;

  let html = `
    <h5>Paper Trading Portfolio</h5>
    <p>SOL Balance: ${portfolio.solBalance}</p>
    <h6>Positions:</h6>
  `;

  for (const [address, position] of Object.entries(portfolio.positions)) {
    if (position.tokenAmount > 0) {
      html += `<p>${position.symbol}: ${position.tokenAmount}</p>`;
    }
  }

  displayElement.innerHTML = html;

  const existingDisplay = document.querySelector(".paper-trade-display");
  if (existingDisplay) {
    existingDisplay.remove();
  }

  document.body.appendChild(displayElement);
  makeDraggable(displayElement);
}

function enableUI() {
  const existingDisplay = document.querySelectorAll(".paper-trade");
  if (existingDisplay.length > 0) {
    existingDisplay.forEach((display) => (display.style.visibility = "visible"));
  } else {
    injectTradeButtons();
  }
}

function disableUI() {
  const existingDisplay = document.querySelectorAll(".paper-trade");
  if (existingDisplay.length > 0) existingDisplay.forEach((display) => (display.style.visibility = "hidden"));
}

function hidePort() {
  const existingDisplay = document.querySelectorAll(".paper-trade-display");
  if (existingDisplay.length > 0) {
    existingDisplay.forEach((display) => (display.style.display = portfolioShown ? "none" : ""));
  }
  portfolioShown = !portfolioShown;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "disableUI") {
    disableUI();
  } else if (message.action === "enableUI") {
    enableUI();
  } else if (message.action === "addSol") {
    let currentSolBal = parseFloat(portfolio.solBalance);
    currentSolBal += 1.0;
    portfolio.solBalance = currentSolBal.toFixed(9);
    // portfolio.solBalance += "1.000000000";
    injectTradeButtons();
  } else if (message.action === "reset") {
    reset();
  } else if (message.action === "hidePort") {
    hidePort();
  }
});

// Initialize
// injectTradeButtons();
