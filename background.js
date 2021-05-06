// Add event listeners the extension needs
chrome.runtime.onInstalled.addListener(function () {
  // Declarative content API lets us use the poup we defined
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url.match("https://app.activecollab.com/*")) {
      chrome.pageAction?.show(tabId);
    } else {
      chrome.pageAction?.hide(tabId);
    }
  });
});

// Listen for changes from the ActiveCollab website
chrome.tabs.onUpdated.addListener(
  function (tabId, changeInfo, tab) {
    // The URL has changed. Send the info to the tab / extension.
    if (changeInfo.url) {
      chrome.tabs.sendMessage(tabId, {
        message: 'urlChange',
        url: changeInfo.url
      })
    }
  }
);
