let currentIndex = -1;
let portfolioShown = true;
let priceInterval = -1;
let statsUIEnabled = false;

let portfolio = {
  loaded: false,
  solBalance: 1.0,
  initialSOL: 1.0,
  trades: [],
  positions: [],
};

function returnInvestmentTemplate(symbolData) {
  const it = `
  <div class="paper-trade-stats-container paper-trade p-show__bar__pf l-col-xxxl u-pl-0-xxxl u-mt-xs u-mt-0-xxxl js-show__portfolio" style="padding: 5px;">
    <div class="l-row p-show__bar__row js-show__portfolio__avg l-row-gap--xs l-row-gap-lg--m u-flex-xl-nowrap">
      <div class="l-col-auto p-show__bar__stat">
        <div class="p-show__bar__label u-font-size-zh-xxs">Invested</div>
        <div class="p-show__bar__value js-invested-eth paper-trade-invested" data-key="investedEth">0.000000000</div>
      </div>
      <div class="l-col-auto p-show__bar__stat">
        <div class="p-show__bar__label u-font-size-zh-xxs u-d-flex u-align-items-center u-flex-gap-3xs">
          <div class="c-icon c-icon--4xs c-icon--info c-bg-info-icon"
            data-tippy-content="Does not include price impact and fees"></div>
          Remaining
        </div>
        <div class="p-show__bar__value">
          <span class="p-show__mpools__yellow js-remaininig-eth paper-trade-remaining" data-key="remainingEth"
            data-tippy-content="This is the total amount of $SGL you hold across all pools. Make sure to select the right pool when selling.">0.000000000</span>
          <span class="p-show__mpools__star">
            *
          </span>
        </div>
      </div>
      <div class="l-col-auto p-show__bar__stat">
        <div class="p-show__bar__label u-font-size-zh-xxs">Sold</div>
        <div class="p-show__bar__value js-sold-eth paper-trade-sold" data-key="soldEth">0.000000000</div>
      </div>
      <div class="l-col-auto p-show__bar__stat">
        <div class="p-show__bar__label u-d-flex u-align-items-center u-font-size-zh-xxs">
          Change in P&amp;L
        </div>
        <div class="p-show__bar__value paper-trade-pnl" data-key="plHtml">
          <span class="paper-tradr-pnl">
            N/A
          </span>
        </div>
        <div class="c-icon c-icon--mpools u-color-yellow c-icon--12 u-z-index-2 p-show__mpools__icon u-ml-3xs"
          data-tippy-content="If you purchase tokens across multiple pools, it's advised that you sell into the pool with the highest pooled SOL/liquidity">
        </div>
      </div>
    </div>`

  return it;
}

const currentToken = {
  symbol: '',
  address: '',
}

function reset() {
  portfolio = {
    ...getDefaultPortfolio(),
    ...portfolio,
  }
  currentIndex = -1;
  currentPosition = {};
  chrome.storage.local.set({ portfolio });
  injectTradeButtons();
}

function getRandomTime() {
  // Generate a random time between 250ms and 1500ms
  const min = 250; // 0.25 seconds in milliseconds
  const max = 1500; // 1.5 seconds in milliseconds
  return Math.random() * (max - min) + min;
}

function showUIBalance() {
  const originalBalance = document.querySelector('span.js-generated-balance');
  if (!originalBalance) return;

  // Hide the original balance
  originalBalance.style.display = 'none';

  // Create duplicate balance element
  const duplicateBalance = originalBalance.cloneNode(true);
  duplicateBalance.style.display = 'inline';
  duplicateBalance.textContent = portfolio.solBalance.toFixed(4);
  duplicateBalance.classList.add('js-generated-balance-paper-trade');
  // Insert duplicate after the original
  originalBalance.parentNode.insertBefore(duplicateBalance, originalBalance.nextSibling);
}

function updateUIBalance() {
  document.querySelector('span.js-generated-balance-paper-trade').textContent = portfolio.solBalance.toFixed(4);
}

function enableStatsUI() {
  statsUIEnabled = true;
  const symbolData = portfolio.positions[currentIndex];
  const template = returnInvestmentTemplate(symbolData);

  const firstChild = document.querySelector(".js-show__portfolio");
  firstChild.insertAdjacentHTML('beforebegin', template);
}

function determineMigrated() {
  let isMigrating = document.querySelector(".p-show__migration") ? true : false;
  console.log(
    "Is Migratin: ",
    document.querySelector(".p-show__migration > div:first-child").classList.contains("is-hidden"),
  );

  return isMigrating;
}

function injectTradeButtons() {
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
  const buyAmounts = portfolio.buttonConfig.buy;
  buyAmounts.forEach((amount) => {
    const button = createTradeButton(`${amount} SOL`, "#2ecc71", async () =>
      setTimeout(() => {
        executeTrade(currentToken.address, "buy", amount);
      }, getRandomTime()),
    );
    buttonGrid.appendChild(button);
  });

  buttonContainer.appendChild(buttonGrid);

  // Sell buttons (percentage amounts)
  const sellPercentages = portfolio.buttonConfig.sell;
  const sellGrid = buttonGrid.cloneNode();
  sellPercentages.forEach((percent) => {
    const button = createTradeButton(`${percent}%`, "#e74c3c", async () =>
      setTimeout(() => {
        executeTrade(currentToken.address, "sell", percent);
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

  // beginInterval();
  makeDraggable(buttonContainer);
}


function beginInterval() {
  priceInterval = setInterval(() => {
    updateStatsContainer();
  }, 1000);
}

function displayIntegratedUI() {
  const symbolData = portfolio.positions[currentIndex];
  const template = returnInvestmentTemplate(symbolData);

  const firstChild = document.querySelector(".js-show__portfolio");
  firstChild.insertAdjacentHTML('beforebegin', template);
}

function displayTradingUI() {
  // Add stats container
  const symbolData = portfolio.positions[currentIndex];
  const currentPosition = parseFloat(portfolio.positions[currentIndex].tokenAmount) || 0;
  const solPrice = getSOLPrice();
  const statsContainer = document.createElement("div");
  statsContainer.className = "paper-trade-stats-container paper-trade";
  statsContainer.style.cssText = `
     display: flex;
     justify-content: space-between;
     margin: 8px 5px 0;
     font-size: 0.85em;
     color: white;
     width: 400px;
   `;

  statsContainer.innerHTML = `
     <div>Invested: <span class="initial-sol paper-trade-invested">${symbolData.invested.toFixed(6)}</span></div>
     <div>Remaining: <span class="remaining-sol paper-trade-remaining">${(currentPosition * solPrice * 0.99).toFixed(6)}</span></div>
     <div>Sold: <span class="remaining-sol paper-trade-sold">${symbolData.sold.toFixed(6)}</span></div>
     <div>PnL: <span class="pnl paper-trade-pnl">0.000000000</span></div>
   `;

  const existingDisplay = document.querySelector(".paper-trade-stats-container");
  if (existingDisplay) {
    existingDisplay.remove();
  }

  const buttonContainer = document.querySelector(".paper-trade-buttons");
  buttonContainer.appendChild(statsContainer);
}

function updateStandAloneStatsContainer() {
  const currentPosition = parseFloat(portfolio.positions[currentIndex].tokenAmount) || 0;
  const solPrice = getSOLPrice();
  const symbolData = portfolio.positions[currentIndex];

  const remainingSolAmount = currentPosition * solPrice * 0.99;
  const pnlSol = (((remainingSolAmount + symbolData.sold) - symbolData.invested) / symbolData.invested) * 100;
  const r = ((remainingSolAmount + symbolData.sold) - symbolData.invested);

  document.querySelector('.paper-trade-invested').textContent = `${symbolData.invested.toFixed(6)}`;
  document.querySelector('.paper-trade-pnl').textContent = `${r.toFixed(4)}`;
  const pnlElement = document.querySelector('.paper-trade-pnl');
  pnlElement.className = 'paper-trade-pnl';
  pnlElement.classList.add(r < 0 ? 'u-color-red' : 'u-color-green');

  document.querySelector('.paper-trade-sold').textContent = `${symbolData.sold.toFixed(6)}`;
  document.querySelector('.paper-trade-remaining').textContent = `${remainingSolAmount.toFixed(6)}`;

}

function updateIntegratedStatsContainer() {
  // photon
  const currentPosition = parseFloat(portfolio.positions[currentIndex].tokenAmount) || 0;
  const solPrice = getSOLPrice();
  const symbolData = portfolio.positions[currentIndex];

  const remainingSolAmount = currentPosition * solPrice * 0.99;
  const pnlSol = (((remainingSolAmount + symbolData.sold) - symbolData.invested) / symbolData.invested) * 100;

  // const template = returnInvestmentTemplate(symbolData);

  // document.querySelector('.p-show__bar__pf').classList.remove('is-hidden');
  // p-show__bar__pf
  document.querySelector('.paper-trade-invested').textContent = `${symbolData.invested.toFixed(9)}`;
  document.querySelector('.paper-trade-remaining').textContent = `${(currentPosition * solPrice * 0.99).toFixed(9)}`;
  document.querySelector('.paper-trade-sold').textContent = `${symbolData.sold.toFixed(9)}`;

  // const pnlSol = ((symbolData.sold + remainingSolAmount) - symbolData.invested) * 100;
  const r = ((remainingSolAmount + symbolData.sold) - symbolData.invested);
  // document.querySelector('[data-key-val="plHtml"]').textContent = `${r.toFixed(2)}% (${pnlSol.toFixed(9)})`;

  const spanElement = document.querySelector('.paper-trade-pnl span');
  spanElement.classList.remove('u-color-red', 'u-color-green');
  spanElement.classList.add(r < 0 ? 'u-color-red' : 'u-color-green');
  spanElement.textContent = `${pnlSol.toFixed(2)}% (${r.toFixed(9)})`;

  // const remainingProfit = currentPosition === 0 ? symbolData.sold : currentPosition * solPrice * 1 - 0.01;
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

function executeTrade(address, type, amountOrPercent) {
  // Check if we need to create a new position
  if (currentIndex === -1) {
    portfolio.positions.push({
      address,
      symbol: currentToken.symbol,
      invested: 0.0,
      sold: 0.0,
      tokenAmount: 0.0,
    });
    currentIndex = portfolio.positions.length - 1;
  }

  const solPrice = getSOLPrice();
  const withoutPumpFee = amountOrPercent * 0.99;
  const coinAmount = withoutPumpFee / solPrice;
  let sellAmount = 0;
  let solAmount = 0;
  let tokenAmount = coinAmount;

  if (type === "buy") {
    // const currentSOL = parseFloat(portfolio.solBalance);

    if (amountOrPercent > portfolio.solBalance) {
      alert(`Insufficient SOL! ${currentSOL}`);
      return;
    }

    // Update SOL balance and positions
    // portfolio.solBalance = (currentSOL - amountOrPercent).toFixed(9);
    portfolio.solBalance -= amountOrPercent;

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
    portfolio.solBalance += solAmount;
    // portfolio.solBalance = (parseFloat(portfolio.solBalance) + solAmount).toFixed(9);
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

  if (portfolio.positions[currentIndex].tokenAmount === 0) {
    clearInterval(priceInterval);
    priceInterval = -1;
  } else {
    if (!statsUIEnabled) {
      displayUI();
    }
    if (priceInterval === -1) {
      beginInterval();
    }
  }

  chrome.storage.local.set({ portfolio });
  enablePortfolioUI();
  updateUIBalance();
  updateStatsContainer();
}

function enablePortfolioUI() {
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
    <p>SOL Balance: ${portfolio.solBalance.toFixed(6)}</p>
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
  showUIBalance();
}

function disableUI() {
  const existingDisplay = document.querySelectorAll(".paper-trade");
  if (existingDisplay.length > 0) existingDisplay.forEach((display) => (display.style.visibility = "hidden"));

  revertUIBalance();
}

function hidePort() {
  const existingDisplay = document.querySelectorAll(".paper-trade-display");
  if (existingDisplay.length > 0) {
    existingDisplay.forEach((display) => (display.style.display = portfolioShown ? "none" : ""));
  }
  portfolioShown = !portfolioShown;
}
function displayUI() {
  if (portfolio.uiConfig.display === "integrated") {
    displayIntegratedUI();
  } else {
    displayTradingUI();
  }
  updateStatsContainer();
  statsUIEnabled = true;
}

function setupApp() {
  const symbolSelectors = [".p-show__pair__cur", "[data-symbol]", ".symbol", ".market-symbol", "h1", ".exchange-title"];

  let symbol = "";
  let symbolElement;
  const address = document.querySelector(".p-show__bar__copy")?.dataset.address;

  for (const selector of symbolSelectors) {
    symbolElement = document.querySelector(selector);
    if (symbolElement) {
      symbol = symbolElement.textContent.trim().split("/")[0].trim();
      break;
    }
  }
  currentToken.symbol = symbol;
  currentToken.address = address;

  injectTradeButtons();

  // Find existing position for this address
  for (const position of portfolio.positions) {
    if (position.address === address) {
      currentIndex = portfolio.positions.indexOf(position);
      // If we have a position and it has tokens, setup the appropriate UI
      if (position.invested > 0) {
        // Start price updates if we have tokens
        displayUI();
        if (position.tokenAmount > 0) {
          beginInterval();
        }
      }
      break;
    }
  }

  setTimeout(() => {
    showUIBalance();
  }, 1000);
}

function getDefaultPortfolio() {
  return {
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
    solBalance: 1.0,
    initialSOL: 1.0,
    buttonConfig: {
      buy: [.1, .2, .5, 1.0],
      sell: [10, 25, 50, 100]
    },
    uiConfig: {
      display: "integrated",
    },
  };
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "disableUI") {
    disableUI();
  } else if (message.action === "enableUI") {
    enableUI();
  } else if (message.action === "addSol") {
    let currentSolBal = parseFloat(portfolio.solBalance);
    currentSolBal += 1.0;
    portfolio.solBalance = currentSolBal;
    updateUIBalance();
  } else if (message.action === "reset") {
    reset();
  } else if (message.action === "hidePort") {
    hidePort();
  } else if (message.action === "updateStatsContainer") {
    if (statsUIEnabled) {

      if (message.integrated) {
        portfolio.uiConfig.display = "integrated";
      } else {
        portfolio.uiConfig.display = "stand-alone";
      }

      const paperTradeContainer = document.querySelector(".paper-trade-stats-container");
      if (paperTradeContainer) {
        paperTradeContainer.remove();
      }
      if (portfolio.uiConfig.display === "integrated") {
        displayIntegratedUI();
      } else {
        displayTradingUI();
      }
      updateStatsContainer();
    }
  }
});

chrome.storage.local.get(["portfolio", "uiEnabled"], (result) => {
  portfolio = {
    ...getDefaultPortfolio(),
    ...result.portfolio,
  }
  portfolio.loaded = true;

  if (!portfolio.uiPositions.buttons) {
    portfolio.uiPositions.buttons = {
      left: 20,
      top: 100,
    };
  }

  if (result.uiEnabled === undefined || result.uiEnabled === false) {
    disableUI();
  } else {
    setupApp();
  }
});

function updateStatsContainer() {
  if (portfolio.uiConfig.display === "integrated") {
    updateIntegratedStatsContainer();
  } else {
    updateStandAloneStatsContainer();
  }
}

function revertUIBalance() {
  const originalBalance = document.querySelector('span.js-generated-balance');
  if (!originalBalance) return;

  // Show the original balance
  originalBalance.style.display = 'inline';

  // Remove the duplicate if it exists (it would be the next sibling)
  const duplicateBalance = originalBalance.nextSibling;
  if (duplicateBalance && duplicateBalance.classList?.contains('js-generated-balance')) {
    duplicateBalance.remove();
  }
}