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

  const userID = urlMatch[1], projectID = urlMatch[2];
  fetch(`https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/tasks`).then((response) =>
    response.json().then((data) => {
      // Get all the task lists id, Split the tasks into task lists
      let taskLists = data.task_lists.map(list =>
        ({
          id: list.id,
          sumEstimate: 0,
          tasks: data.tasks.filter(task => task.task_list_id === list.id)
        })
      );
      // Sum all task estimate times in each list
      taskLists?.forEach(list =>
        list?.tasks?.forEach(task => {
          if (!task?.is_completed && !task?.is_trashed) list.sumEstimate += task.estimate;
        })
      );
      console.log('TASKS POST SORT:', taskLists);
      // Loop through the lists that have time estimates
        // Get the list by ID or name in the DOM
        // Display the estimated time by the list
    })
  );
}
