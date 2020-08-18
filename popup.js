let countColumns = document.getElementById('countColumns');

// On click, set the background colour
countColumns.onclick = function(event) {
  let value = event.target.value;
  var bkg = chrome.extension.getBackgroundPage();
  bkg.console.log('foo');
  alert(`Test: ${bkg}`);
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    let url = tabs[0].url;
    // use `url` here inside the callback because it's asynchronous!
    var bkg = chrome.extension.getBackgroundPage();
    console.warning('Wassup: ' + url);
  });
};