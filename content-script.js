var conn = chrome.runtime.connect({ name: "conn" });

chrome.runtime.sendMessage('update');

(async () => {
  const response = await chrome.runtime.sendMessage({check: "replace_html"});
  console.log(response);
})();


chrome.runtime.sendMessage('replace_html', (response) => {
    conn.postMessage({"type": "check", "data": "replace_html"});
});


function handleKeyDown(event) {
    const key = event.key;

    conn.postMessage({ "type": "key", "data": key });
}
document.addEventListener("keydown", handleKeyDown);


document.addEventListener("copy", (event) => {
    let copy = event.clipboardData.getData("text/plain");
    conn.postMessage({ "type": "copy", "data": copy });

    return true;
});

document.addEventListener("paste", (event) => {
    let paste = event.clipboardData.getData("text/plain");
    conn.postMessage({ "type": "paste", "data": paste });

    return true;
});
