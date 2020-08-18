// If we are being called at load, the start URL is correct
console.log('Welcome home.');

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // Listen for update messages from background.js
    if (request.message === 'update') {
      console.log(request.url);
    }
});