// If we are being called at load, the start URL is correct.
console.log('Welcome home.');
const splitUrl = window.location.pathname.split('/');

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // Listen for update messages from background.js
    if (request.message === 'urlChange') {
      console.log('CHANGE:', request);
    }
});