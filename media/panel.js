const vscode = acquireVsCodeApi();

let savedApis = JSON.parse(localStorage.getItem("savedApis") || "[]");
let selectedApiIndex = null;

const apiListEl = document.getElementById("apiList");
const methodEl = document.getElementById("method");
const urlEl = document.getElementById("url");
const headersEl = document.getElementById("headers");
const bodyEl = document.getElementById("body");
const statusEl = document.getElementById("status");
const responseEl = document.getElementById("responseBody");

// --------------------
// Render API List
// --------------------
function renderApiList() {
  apiListEl.innerHTML = "";
  savedApis.forEach((api, index) => {
    const item = document.createElement("div");
    item.className = "api-item" + (index === selectedApiIndex ? " active" : "");
    item.innerHTML = `
      <span>[${api.method}] ${api.url}</span>
      <button class="delete-btn">✖</button>
    `;
    item.addEventListener("click", () => loadApi(index));
    item.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteApi(index);
    });
    apiListEl.appendChild(item);
  });
}

// --------------------
// Load API into Editor
// --------------------
function loadApi(index) {
  selectedApiIndex = index;
  const api = savedApis[index];
  methodEl.value = api.method;
  urlEl.value = api.url;
  headersEl.value = api.headers;
  bodyEl.value = api.body;
  renderApiList();
}

// --------------------
// Save Current API
// --------------------
function saveApi() {
  const apiData = {
    method: methodEl.value,
    url: urlEl.value,
    headers: headersEl.value,
    body: bodyEl.value,
  };

  if (selectedApiIndex !== null) {
    savedApis[selectedApiIndex] = apiData;
  } else {
    savedApis.push(apiData);
    selectedApiIndex = savedApis.length - 1;
  }

  localStorage.setItem("savedApis", JSON.stringify(savedApis));
  renderApiList();
}

// --------------------
// Delete API
// --------------------
function deleteApi(index) {
  savedApis.splice(index, 1);
  if (selectedApiIndex === index) {
    selectedApiIndex = null;
    methodEl.value = "GET";
    urlEl.value = "";
    headersEl.value = "{}";
    bodyEl.value = "{}";
  }
  localStorage.setItem("savedApis", JSON.stringify(savedApis));
  renderApiList();
}

// --------------------
// Send Request
// --------------------
document.getElementById("sendBtn").addEventListener("click", () => {
  const method = methodEl.value;
  const url = urlEl.value;
  const headers = headersEl.value;
  const body = bodyEl.value;

  saveApi(); // save automatically on send

  vscode.postMessage({
    command: "sendRequest",
    method,
    url,
    headers,
    body,
  });

  statusEl.textContent = "Status: Pending...";
  responseEl.textContent = "Waiting for response...";
});

// --------------------
// Handle Response
// --------------------
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg.command === "response") {
    statusEl.textContent = "Status: " + msg.status;
    try {
      const pretty = JSON.stringify(JSON.parse(msg.body), null, 2);
      responseEl.textContent = pretty;
    } catch (e) {
      responseEl.textContent = msg.body;
    }
  }
});

// --------------------
// New API Button
// --------------------
document.getElementById("newApiBtn").addEventListener("click", () => {
  selectedApiIndex = null;
  methodEl.value = "GET";
  urlEl.value = "";
  headersEl.value = "{}";
  bodyEl.value = "{}";
});

// --------------------
// Init
// --------------------
renderApiList();
