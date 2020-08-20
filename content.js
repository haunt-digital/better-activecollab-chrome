// If we are being called at load, the start URL is correct.
collateEstimates(window.location.href);

// Listen for update messages from background.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'urlChange') {
      collateEstimates(request.url);
    }
});

// Track additions to the DOM, trigger events if a card is added.
var observer = new MutationObserver(function (e) {
  let newTask = e.find(mu =>
    Array.from(mu.addedNodes).find(n =>
      n && n.classList?.contains('column-card-task') && n?.children.item(0)
      && n?.children.item(0)?.getAttribute("href") !== ""
    )
  );
  if (newTask) collateEstimates(window.location.href);
});

// Enable and disable the DOM addition observer.
function setObserver(active) {
  active ? observer?.observe(document.getElementsByClassName('columns_wrapper')[0], { childList: true, subtree: true })
        : observer?.disconnect();
}

// Disable the observer on drag start so that drag add events are not counted.
function dragStart(){
  setObserver(false);
}

// Try and wait for the screen to actually exist
setTimeout(() => {
  setObserver(true);
}, 1000);

// User has finished a drag movement
// TODO timeout needed?
function dropPerformed() {
  setTimeout(() => {
    collateEstimates(window.location.href);
    setObserver(true);
  }, 1000);
};

// Get all tasks ordered into lists, and gather completed tasks together.
function createTaskLists(data, archiveData) {
  let taskLists = data.task_lists.map(list => (
      {
        id: list.id,
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
      id: -1,
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
  // TODO breaks sometimes, do we need a timeout?
  let displayElement = element?.cloneNode(true);
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
  if (!list.sumEstimate && !list.sumTracked) return '';
  return `[${list.sumEstimate || '0'} / ${list.sumTracked || '0'}]`;
}

function displaySummedEstimates(list, listTitleDivs, projectID) {
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
    const dataID = `List-${list.id}-${projectID}`;
    const existingHours = document.querySelector(`[data-hours-id="${dataID}"]`);
    const targetElement = existingHours
                      || titleWrapperDiv.children.item(1);
    const hoursText = getDisplayText(list);
    if (targetElement && hoursText.length > 0 || existingHours) {
      existingHours ? updateDisplayElement(targetElement, hoursText)
                  : addDisplayElement(targetElement, hoursText, '', 'hoursId', dataID);
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
    document.removeEventListener('drop', dropPerformed);
    document.removeEventListener('dragstart', dragStart);
    return;
  }
  document.addEventListener('drop', dropPerformed);
  document.addEventListener('dragstart', dragStart);

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

              const listTitleDivs = document.getElementsByClassName('task_list_name_header');
              taskLists.forEach(list => {
                displaySummedEstimates(list, listTitleDivs, projectID);
              });

              displayCardWarnings(taskLists, projectID);
            })
          )
        )
      )
    )
  )
}