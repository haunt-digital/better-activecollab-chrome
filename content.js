// If we are being called at load, the start URL is correct.
console.log('Welcome home.');
collateEstimates(window.location.href);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // Listen for update messages from background.js
    if (request.message === 'urlChange') {
      collateEstimates(request.url);
    }
});

function collateEstimates(url) {
  // Only run if the URL is valid. Pull the data from it if it is
  let urlMatch = url.match(/^https:\/\/app\.activecollab\.com\/(\d+)\/projects\/(\d+)$/);
  if (!urlMatch) return;
  const userID = urlMatch[1], projectID = urlMatch[2]
  console.log('Estimation:', projectID, userID, `https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/tasks`);
  fetch(`https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/tasks`).then((r) =>
    r.json().then((b) => {
      // Get all the task lists id
      // Split the tasks into task lists
      // Map the task lists to overall estimate times
      // Loop through each task list
        // Loop through each task in the list
          // If this is a closed ticket
            // Add on the estimated time

      // Loop through the lists that have time estimates
        // Get the list by ID or name in the DOM
        // Display the estimated time by the list
      console.log(b)
    })
  );
}
