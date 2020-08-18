// Add event listeners the extension needs
chrome.runtime.onInstalled.addListener(function() {
  // Declarative content API lets us use the poup we defined
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: {hostEquals: 'app.activecollab.com'},
      })
      ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});

// Listen for changes from the ActiveCollab website
chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo, tab) {
    // The URL has changed. Send the info to the tab / extension.
    if (changeInfo.url) {
      chrome.tabs.sendMessage( tabId, {
        message: 'urlChange',
        url: changeInfo.url
      })
    }
  }
);
