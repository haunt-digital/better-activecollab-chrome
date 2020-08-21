# Better ActiveCollab Chrome Extension
This is a simple chrome extension to add some extra data to the ActiveCollab tasks column view. This does not work on the list view.

The extension will add the total estimates and tracked time for every task in a list. This will be displayed next to the number of tasks in a list in the format "[Estimate / Tracked Time], e.g: [8 / 9].

Each card in a list must also have an estimate added to it. If it does not have an estimate, a '🤷‍♀️' will be added to the right side of the card to remind you. How helpful.

Cards ideally should not have tracked time that is greater than their estimate, this also applies to cards that have no estimates. If this has happened (which, you know, it does), then a '🔥' will be added to the right side of the card.

If these icons aren't appearing for you, or you'd rather not be reminded that everything is on fire, let us know and we can make them configurable. Or slightly less aggressive, either one.

# Installation Instructions
To enable this extension, follow the steps below:
1. Download this Git repo somewhere easy to find.
2. Unzip the repo file, if you downloaded it as a zip.
3. Navigate to "[chrome://extensions/](chrome://extensions/)" in your Chrome browser.
4. Enable "Developer mode" via the toggle in the top right of the page.
5. Click "Load unpacked" and find the downloaded file from before. Select the unzipped repo file from earlier to upload.
6. Visit an Active Collab project's task page and see if it's worked.

Depending on the contents of the project, you may only see some parts of the extension working. For example, if all your cards have estimates and are under time, you won't see the warning flags from earlier, but you should see the time estimates at the top of lists. If you have no tasks, nothing will appear.

If nothing is appearing, make sure you refresh your page, otherwise report an error to us.

# Updating Instructions
If we ever need to update the plugin, doing so is nice and straight forward. If you DID download the repo as a zip, you're going to need to repeat the installation instructions, but the updated version you load should override the existing plugin.

If you downloaded the repo by cloning it somewhere, follow these steps.
1. Git pull to update.
2. Navigate to "[chrome://extensions/](chrome://extensions/)" in your Chrome browser.
3. Make sure Developer mode is still enabled. Turn it on if not.
4. Click "Update" at the top of the page, or the refresh arrow underneath this extension in the list.

Done. It should all work, so long as you haven't moved the repo on your machine. If you have, just repeat the installation steps from earlier.
