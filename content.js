// If we are being called at load, the start URL is correct.
console.log('Welcome home.');
const splitUrl = window.location.pathname.split('/');
collateEstimates(splitUrl[1], splitUrl[3]);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // Listen for update messages from background.js
    if (request.message === 'urlChange') {
      console.log('CHANGE:', request);
      collateEstimates(request.userID, request.projectID);
    }
});

function collateEstimates(userID, projectID) {
  console.log('Estimation:', projectID, userID);
  fetch(`https://app.activecollab.com/${userID}/projects/${projectID}`).then((r) =>
    r.json().then((b) =>
      console.log(b.tracked_time)
    )
  );
}
