// If we are being called at load, the start URL is correct.
collateEstimates(window.location.href);

// Listen for update messages from background.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'urlChange') {
      collateEstimates(request.url);
    }
});

function nodesUpdated(event) {
  setTimeout(() => {
    collateEstimates(window.location.href);
  }, 1000);
};

function getSummedEstimates(data) {
  // Get all the task lists id, Split the tasks into task lists
  let taskLists = data.task_lists.map(list =>
    ({
      id: list.id,
      name: list.name,
      sumEstimate: 0,
      tasks: data.tasks.filter(task => task.task_list_id === list.id)
    })
  );
  // Sum all task estimate times in each list
  taskLists?.forEach(list =>
    list?.tasks?.forEach(task => {
      // TODO get completed list
      if (!task?.is_trashed) list.sumEstimate += task.estimate;
    })
  );
  return taskLists;
}

function displaySummedEstimates(list, listTitleDivs) {
  // Get the div which contains our list name in it's children
  let titleWrapperDiv;
  for (let div of listTitleDivs) {
    if (div?.firstChild?.firstChild?.data === list.name) {
      titleWrapperDiv = div;
      break;
    }
  };

  // TODO this feels like a cop out, and will break if your internet is slow enough.
  // TODO ideally, we should wait for the component to appear.
  setTimeout(() => {
    // TODO only add if one doesn't already exist. May need to delete old one, updates may not work.
    // TODO does not work for list view
    // Copy an element if it exists, and edit the new element to display the estimates
    const childCount = titleWrapperDiv?.children.length;
    // Add the current hours
    if (childCount === 2) {
      let hourDisplay = titleWrapperDiv.children.item(1).cloneNode(true);
      hourDisplay.innerHTML = `[${list.sumEstimate} Hours]`;
      hourDisplay.classList.add('hour_display');
      titleWrapperDiv.appendChild(hourDisplay);
    } else if (childCount === 3) {
      let hourDisplay = titleWrapperDiv.children.item(2);
      if (hourDisplay.innerHTML?.includes("Hours")) {
        hourDisplay.classList.add('hour_display');
        hourDisplay.innerHTML = `[${list.sumEstimate} Hours]`;
      }
    }
  }, 500);
}

function collateEstimates(url) {
  // Only run if the URL is valid. Pull the data from it if it is
  let urlMatch = url.match(/^https:\/\/app\.activecollab\.com\/(\d+)\/projects\/(\d+)$/);
  if (!urlMatch) {
    document.removeEventListener('drop', nodesUpdated);
    return;
  }
  document.addEventListener('drop', nodesUpdated);

  const userID = urlMatch[1], projectID = urlMatch[2];
  fetch(`https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/tasks`).then((response) =>
    response.json().then((data) => {

      let taskLists = getSummedEstimates(data);

      const listTitleDivs = document.getElementsByClassName('task_list_name_header');
      // Remove the old hour displays
      let oldDisplays = document.getElementsByClassName('hour_display');
      while (oldDisplays[0]) {
        oldDisplays[0].parentNode.removeChild(oldDisplays[0]);
      }

      taskLists.forEach(list => {
        // Only display estimates if there are more than 0 hours
        if (list?.sumEstimate && list.sumEstimate > 0) displaySummedEstimates(list, listTitleDivs);
      });
    })
  );
}