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

// Get all tasks ordered into lists, and gather completed tasks together.
function createTaskLists(data, archiveData) {
  let taskLists = data.task_lists.map(list => (
      {
        name: list.name,
        sumEstimate: 0,
        sumTracked: 0,
        tasks: data.tasks.filter(task => task.task_list_id === list.id)
      }
    )
  );
  // Add all the completed tasks on
  const filteredTasks = data.completed_task_ids.map(taskID =>
    archiveData.find(task =>
      task && task.is_completed && !task.is_trashed && task.id === taskID
    )
  );
  let completedTaskList = (
    {
      name: 'Completed Tasks',
      sumEstimate: 0,
      sumTracked: 0,
      tasks: filteredTasks
    }
  );
  taskLists.push(completedTaskList)
  return taskLists;
}

// Sum all task estimate and tracked times in each list and store the data in the list
function getSummedEstimates(taskLists, timeRecords) {
  let newTaskLists = Object.assign([], taskLists);
  newTaskLists?.forEach(list =>
    list?.tasks?.forEach(task => {
      if (task && !task.is_trashed) list.sumEstimate += task.estimate;
      // Sum time tracked
      let timedTasks = timeRecords.filter((time) => time?.parent_id === task?.id);
      if (timedTasks?.length > 0) timedTasks.forEach((tTask) => {
        task.time_tracked = tTask.value;
        return list.sumTracked += tTask.value;
      });
    })
  );
  return newTaskLists;
}

// Clones a given child into it's parent, places the content inside, styles it, and gives it an ID
function addDisplayElement(element, content, styles, dataReference, dataID) {
  const displayParent = element?.parentNode;
  let displayElement = element.cloneNode(true);
  if (!displayElement) return;

  displayElement.setAttribute('style', styles);
  displayElement.innerHTML = content;
  displayElement.dataset[dataReference] = dataID;
  displayParent?.appendChild(displayElement);
}

// Updates a display elements inner html to the given value. Removes it if no value is present.
function updateDisplayElement(element, content) {
  const displayParent = element.parentNode;
  if (!content || content.length < 0) displayParent.removeChild(element);
  else element.innerHTML = content;
}

function getDisplayText(list) {
  return `[${list.sumEstimate || '0'} / ${list.sumTracked || '0'}]`;
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

// Display '!' on cards over their estimate, and a '?' on ones without an estimate, displayParent
function displayCardWarnings(taskLists, projectID) {
  taskLists.forEach(list =>
    list?.tasks?.forEach((task) => {
      if (task && !task.is_trashed) {
        // TODO document
        const dataID = `Task-${task.id}-${projectID}`;
        let existingFlag = document.querySelector(`[data-flag-id="${dataID}"]`);
        let targetElement = existingFlag
                          || document.querySelector(`[data-object-modal="${dataID}"]`)?.firstChild?.firstChild?.firstChild;
        let flag = '';
        if (!task.estimate || !task.estimate > 0) flag = '🤷‍♀️';
        if (task?.time_tracked > task.estimate) flag += '🔥';
        if (flag.length > 0 || existingFlag) {
          existingFlag ? updateDisplayElement(targetElement, flag)
                      : addDisplayElement(targetElement, flag, 'width: 20%; text-align: right;', 'flagId', dataID);
        }
      }
    })
  );
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
  const baseUrl = `https://app.activecollab.com/${userID}/api/v1/projects/${projectID}`;
  // TODO Clean these more
  fetch(`${baseUrl}/tasks`).then(taskListRes =>
    fetch(`${baseUrl}/time-records`).then(timeRes =>
      fetch(`${baseUrl}/tasks/archive`).then(archiveRes =>
        taskListRes.json().then(taskListData =>
          timeRes.json().then(timeData => 
            archiveRes.json().then(archiveData => {
              console.log('FETCH');
              // TODO doesn't run on adding a new task from the list approach... This may be annoying.
              let taskLists = createTaskLists(taskListData, archiveData);
              taskLists = getSummedEstimates(taskLists, timeData.time_records);
        
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

              displayCardWarnings(taskLists, projectID);
            })
          )
        )
      )
    )
  )
}