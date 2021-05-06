let currLocationValid = urlValidation(window.location.href).valid;
// Check if we are on the correct page. Apply / remove relevant event listeners
function urlValidation(url) {
  let matchData = url.match(/^https:\/\/app\.activecollab\.com\/(\d+)\/projects\/(\d+)$/);
  if (!matchData) {
    document.removeEventListener('drop', dropPerformed);
    document.removeEventListener('dragstart', dragStart);
    return { matchData: {}, valid: false };
  }
  document.addEventListener('drop', dropPerformed);
  document.addEventListener('dragstart', dragStart);

  return { matchData, valid: true };
}

// Listen for update messages from background.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === 'urlChange') {
      currLocationValid = urlValidation(request.url).valid;
      if (currLocationValid) {
        let columnChecker = setInterval(() => {
          if (checkColumnsExist()) clearInterval(columnChecker);
        }, 200);
      }
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

// Wait until the columns have fully loaded before starting
function checkColumnsExist() {
  if (!currLocationValid) return;
  const colWrapper = document.getElementsByClassName('columns_wrapper')[0];
  if (colWrapper && colWrapper?.getElementsByClassName('column-card-loader').length === 0) {
    setObserver(true);
    collateEstimates(window.location.href);
    return true;
  }
  return false;
};
if (currLocationValid) {
  let columnChecker = setInterval(() => {
    if (checkColumnsExist()) clearInterval(columnChecker);
  }, 50);
}

// User has finished a drag movement. Wait a second for data update.
function dropPerformed() {
  setTimeout(() => {
    collateEstimates(window.location.href);
    setObserver(true);
  }, 100);
};

// Create a new list, with a specific style for the 'completed' list
function createList(list, isCompletedList = false) {
  return newList = {
    id: isCompletedList ? -1 : list.id,
    name: isCompletedList ? 'Completed Tasks' : list.name,
    sumEstimate: 0,
    sumTracked: 0,
    tasks: []
  };
}

// Find target list in array. Create if none exists.
// Return the index of the found / new list, and the updated lists.
function findOrCreateList(lists, task, isCompletedList = false) {
  const foundIndex = lists.findIndex(list =>
    list.name === (isCompletedList ? 'Completed Tasks' : task.task_list)
    && list.id === (isCompletedList ? -1 : task.task_list_id)
  );
  if (foundIndex >= 0) return { lists, index: foundIndex };

  let returnLists = Object.assign([], lists);
  returnList = returnLists.push(createList({ name: task.task_list, id: task.task_list_id }, isCompletedList));
  return {
    lists: returnLists,
    index: returnLists.length - 1
  };
}

// Track changes to list globally, in case all tasks get removed from a list.
let globalLists = [];

// Seperate all tasks into list, and sum the data from all tasks in these lists.
function createEstimatedLists(taskData) {
  // Clear all past data from lists
  globalLists = globalLists.map(list => ({
    id: list.id,
    name: list.name,
    sumEstimate: 0,
    sumTracked: 0,
    tasks: []
  }));
  // Add new task data & sums to list
  taskData.forEach((task) => {
    if (task) {
      let listPair = findOrCreateList(globalLists, task, (task.completed_by || task.completed_on));
      const i = listPair.index;
      globalLists = listPair.lists;
      globalLists[i].tasks.push(task);
      globalLists[i].sumEstimate += task.estimated_time ? parseFloat(task.estimated_time) : 0;
      globalLists[i].sumTracked += task.tracked_time ? parseFloat(task.tracked_time) : 0;
    }
  });
  return globalLists;
}

// Clones a given child into it's parent, places the content inside, styles it, and gives it an ID
function addHeaderElement(element, content, dataReference, dataID) {
  const displayParent = element?.parentNode;
  let displayElement = element?.cloneNode(true);
  if (!displayElement) return;

  displayElement.innerHTML = content;
  displayElement.dataset[dataReference] = dataID;
  displayParent?.appendChild(displayElement);
}


function addCardElement(element, content, styles, classes, dataReference, dataID) {
  const displayParent = element?.parentNode;
  let displayElement = element?.cloneNode(true);
  if (!displayElement) return;
  // Adjust AC card and wrapper settings to allow our additions to fit
  element?.classList?.add('tw-flex', 'tw-w-full');
  displayParent?.classList?.add('tw-flex');

  styles?.length > 0 && displayElement.setAttribute('style', styles);
  classes?.length > 0 && displayElement.setAttribute('class', classes);
  displayElement.innerHTML = content;
  displayElement.dataset[dataReference] = dataID;
  displayParent?.prepend(displayElement);
}

// Updates a display elements inner html to the given value. Removes it if no value is present.
function updateDisplayElement(element, content, styles, classes, isCard) {
  const displayParent = element.parentNode;
  if (!content || content.length < 0) displayParent.removeChild(element);
  else {
    element.innerHTML = content;
    styles?.length > 0 && element.setAttribute('style', styles);
    // Cards also update their parent and sibling styles
    if (isCard) {
      element?.nextElementSibling?.classList?.add('tw-flex', 'tw-w-full');
      displayParent?.classList?.add('tw-flex');
    }
  }
}

function getDisplayText(list) {
  if (list.tasks?.length === 0 || (list.sumEstimate === undefined && !list.sumTracked === undefined)) {
    return '';
  }
  return `[${
    Math.round((list.sumTracked + Number.EPSILON) * 100) / 100 || "0"
  } / ${Math.round((list.sumEstimate + Number.EPSILON) * 100) / 100 || "0"}]`;
}

// Displays estimate and tracked time info for each list.
function displaySummedEstimates(list, listTitleDivs, projectID) {
  // Get the div which contains our list name in it's children
  let titleWrapperDiv;
  for (let div of listTitleDivs) {
    if (div?.firstChild?.firstChild?.data === list.name) {
      titleWrapperDiv = div;
      break;
    }
  };
  const dataID = `List-${list.id}-${projectID}`;
  const existingHours = document.querySelector(`[data-hours-id="${dataID}"]`);
  const targetElement = existingHours || titleWrapperDiv?.children.item(1);
  const hoursText = getDisplayText(list);
  if (targetElement && hoursText.length > 0 || existingHours) {
    existingHours ? updateDisplayElement(targetElement, hoursText)
                : addHeaderElement(targetElement, hoursText, 'hoursId', dataID);
  }
}

// Display '🔥' on cards over their estimate, and a '🤷‍♀️' on ones without an estimate.
function displayCardWarnings(taskLists, projectID) {
  taskLists.forEach(list =>
    list?.tasks?.forEach((task) => {
      if (task) {
        // Check if we have an existing display, or need to make a new one deep inside the task card
        const dataID = `Task-${task.id}-${projectID}`;
        let existingFlag = document.querySelector(`[data-flag-id="${dataID}"]`);
        let targetElement = existingFlag
                          || document.querySelector(`[data-object-modal="${dataID}"]`)?.firstChild;
        let flag = '';
        const taskEstimate = task?.estimated_time ? parseFloat(task.estimated_time) : 0;

        if (!taskEstimate > 0) flag = '🤷‍♀️';
        if (task?.tracked_time > taskEstimate) flag += '🔥';

        if (flag.length > 0 || existingFlag) {
          // Decide styles based on how many flags there are. '🤷‍♀️' is 5 chars long, any more than that means more than 1 flag
          styles = `${
            flag.length > 5 ? 'line-height: .8;' : ''
          } width: 13.4%; padding: 0.5rem; justify-content: center; align-content: center; overflow: visible; z-index: 1; margin-right: 3px;`;
          classes = `c-card column_card tw-flex ${list.id === -1 ? 'completed_task' : ''}`;

          existingFlag ? updateDisplayElement(targetElement, flag, styles, classes, true)
                      : addCardElement(targetElement, flag, styles, classes, 'flagId', dataID);
        }
      }
    })
  );
}

// Sums all estimates for lists, finds overtime / no estimates for cards, and displays this data for the user.
function collateEstimates(url) {
  if (!currLocationValid) return;
  let urlMatch = urlValidation(url).matchData;

  const userID = urlMatch[1], projectID = urlMatch[2];
  const baseApiE = `https://app.activecollab.com/${userID}/api/v1/reports/run?`;
  const apiFilters = 'include_subtasks=0&include_tracking_data=1&group_by=task&type=AssignmentFilter&include_all_projects=true';
  const apiProjectFilter = `&project_filter=selected_${projectID}`;

  fetch(`${baseApiE}${apiFilters}${apiProjectFilter}`).then((reportResponse) =>
    reportResponse.json().then((report) => {
      if (!report?.all?.assignments) return; // Avoid crash on projects with no tickets
      const tasks = Object.values(report.all.assignments);
      const taskLists = createEstimatedLists(tasks);

      const listTitleDivs = document.getElementsByClassName('task_list_name_header');
      taskLists.forEach(list => displaySummedEstimates(list, listTitleDivs, projectID));
      displayCardWarnings(taskLists, projectID);
    })
  );
}