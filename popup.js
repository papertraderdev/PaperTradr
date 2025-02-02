let portfolio = {};
document.addEventListener("DOMContentLoaded", () => {
  const uiToggle = document.getElementById("uiToggle");
  const solButton = document.getElementById("addSol");
  const resetButton = document.getElementById("reset");
  const hidePortButton = document.getElementById("hidePort");
  const statsToggle = document.getElementById("statsToggle");

  chrome.storage.local.get(["portfolio", "uiEnabled"], (result) => {
    // Set initial toggle state
    uiToggle.checked = result.uiEnabled;
    statsToggle.checked = result.portfolio.uiConfig.display === "integrated";
    portfolio = result.portfolio;

    const trades = portfolio?.trades || [];
    const tradesHtml = trades.length > 0
      ? trades
        .map(
          (trade) => `
          <tr>
            <td style="white-space: nowrap; padding: 6px 12px; color: ${trade.type.toUpperCase() === "BUY" ? "green" : "red"
            }">${trade.type.toUpperCase()}</td>
            <td style="white-space: nowrap; padding: 6px 12px;">${trade.symbol}</td>
            <td style="white-space: nowrap; padding: 6px 12px;">${trade.sol.toFixed(3)}</td>
            <td style="white-space: nowrap; padding: 6px 12px;">${trade.tokenAmount.toFixed(4)}</td>
            <td style="white-space: nowrap; padding: 6px 12px; max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${trade.address}</td>
            <td style="white-space: nowrap; padding: 6px 12px;">${new Date(trade.timestamp).toDateString()}</td>
          </tr>
        `
        ).join("")
      : `<tr><td colspan="6" style="text-align: center; padding: 12px;">No trades found</td></tr>`;

    document.getElementById("trades").innerHTML = `
     <table>
        <tr>
          <th style="padding: 8px 12px; white-space: nowrap;">Type</th>
          <th style="padding: 8px 12px; white-space: nowrap;">Symbol</th>
          <th style="padding: 8px 12px; white-space: nowrap;">SOL</th>
          <th style="padding: 8px 12px; white-space: nowrap;">Token Amount</th>
          <th style="padding: 8px 12px; white-space: nowrap;">Address</th>
          <th style="padding: 8px 12px; white-space: nowrap;">Time</th>
        </tr>
        ${tradesHtml}
      </table>
    `;

  });

  // Handle toggle changes
  uiToggle.addEventListener("change", () => {
    chrome.storage.local.set({ uiEnabled: uiToggle.checked });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (uiToggle.checked) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "enableUI" });
      } else {
        chrome.tabs.sendMessage(tabs[0].id, { action: "disableUI" });
      }
    });
  });

  statsToggle.addEventListener("change", () => {
    portfolio.uiConfig.display = statsToggle.checked ? "integrated" : "stand-alone";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.storage.local.set({ portfolio });
      chrome.tabs.sendMessage(tabs[0].id, { action: "updateStatsContainer", integrated: statsToggle.checked });
    });
  });

  solButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "addSol" });
    });
  });

  resetButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "reset" });
      location.reload();
    });
  });

  hidePortButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "hidePort" });
    });
  });
});
