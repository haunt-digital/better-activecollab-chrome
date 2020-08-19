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

// Sums the tracked hours for tasks in a list and appends the data to the list
function appendActualHours(taskLists, data) {
  taskLists = taskLists.map(list => {
    list = { ...list, sumTracked: 0 };
    list?.tasks?.forEach(task => {
      let timedTasks = data.filter((time) => time.parent_id === task.id);
      if (timedTasks?.length > 0) timedTasks.forEach((tTask) => list.sumTracked += tTask.value);
    });
    return list;
  });
  return taskLists;
}

function getDisplayText(list) {
  let str = list?.sumEstimate > 0 ? `[${list.sumEstimate}h Est.]` : '';
  return `${str}${list?.sumTracked > 0 ? ` [${list.sumTracked}h Done]` : ''}`;
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
  // TODO This is a copout, but it works. Try clean the times up a bit.
  setTimeout(() => {
    // Copy an element if it exists, and edit the new element to display the estimates
    const childCount = titleWrapperDiv?.children.length;
    // Add the current hours
    // TODO update this to just select the old element by class, and update using that
    if (childCount === 2) {
      let hourDisplay = titleWrapperDiv.children.item(1).cloneNode(true);
      hourDisplay.innerHTML = getDisplayText(list);
      hourDisplay.classList.add('hour_display');
      titleWrapperDiv.appendChild(hourDisplay);
    } else if (childCount === 3) {
      let hourDisplay = titleWrapperDiv.children.item(2);
      if (hourDisplay.innerHTML?.includes("Hours")) {
        hourDisplay.classList.add('hour_display');
        hourDisplay.innerHTML = getDisplayText(list);
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
  fetch(`https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/tasks`).then((taskListRes) =>
    fetch(`https://app.activecollab.com/${userID}/api/v1/projects/${projectID}/time-records`).then((timeRes) =>
      taskListRes.json().then((taskListData) =>
        timeRes.json().then((timeData) => {
    
          let taskLists = getSummedEstimates(taskListData);
          taskLists = appendActualHours(taskLists, timeData.time_records);
    
          // Remove the old hour displays
          let oldDisplays = document.getElementsByClassName('hour_display');
          while (oldDisplays[0]) {
            oldDisplays[0].parentNode.removeChild(oldDisplays[0]);
          }

          const listTitleDivs = document.getElementsByClassName('task_list_name_header');
          taskLists.forEach(list => {
            // Only display estimates if there are more than 0 hours
            if ((list?.sumEstimate && list.sumEstimate > 0)
                || list?.sumTracked && list.sumTracked > 0) {
              displaySummedEstimates(list, listTitleDivs);
            }
          });
        })
      )
    )
  );
}