console.log("Initializing API Tester...");

if (typeof vscode === "undefined") {
  console.error(
    "VS Code API is not available! Make sure acquireVsCodeApi() was called."
  );
} else {
  console.log("VS Code API is available");
}

const requiredElements = [
  "newRequestBtn",
  "requestTabs",
  "requestNameInput",
  "methodSelect",
  "urlInput",
  "sendBtn",
  "requestBody",
  "requestHeaders",
  "responseOutput",
  "responseHeadersOutput",
  "responseCookiesOutput",
  "statusCode",
  "responseTime",
  "responseSize",
  "clearResponseBtn",
  "paramsContainer",
  "addParamBtn",
  "authTypeSelect",
  "environmentVariables",
  "preRequestScript",
  "testsScript",
];

requiredElements.forEach((id) => {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Required element not found: ${id}`);
  } else {
    console.log(`Found element: ${id}`);
  }
});

const appContainer = document.querySelector(".app-container");
const newRequestBtn = document.getElementById("newRequestBtn");
const requestTabs = document.getElementById("requestTabs");

const requestNameInput = document.getElementById("requestNameInput");
const methodSelectEl = document.getElementById("methodSelect");
const urlInputEl = document.getElementById("urlInput");
const sendBtnEl = document.getElementById("sendBtn");

const requestBodyEl = document.getElementById("requestBody");
const requestHeadersEl = document.getElementById("requestHeaders");
const responseOutputEl = document.getElementById("responseOutput");
const responseHeadersOutputEl = document.getElementById(
  "responseHeadersOutput"
);
const responseCookiesOutputEl = document.getElementById(
  "responseCookiesOutput"
);

const statusCodeEl = document.getElementById("statusCode");
const responseTimeEl = document.getElementById("responseTime");
const responseSizeEl = document.getElementById("responseSize");
const clearResponseBtn = document.getElementById("clearResponseBtn");

const requestTabButtons = document.querySelectorAll(
  ".tab-controls .tab-button"
);
const requestTabPanels = document.querySelectorAll(".tab-panel");
const responseTabButtons = document.querySelectorAll(
  ".response-tab-controls .tab-button"
);
const responseTabPanels = document.querySelectorAll(".response-panel");

const paramsContainer = document.getElementById("paramsContainer");
const addParamBtn = document.getElementById("addParamBtn");

const authTypeSelect = document.getElementById("authTypeSelect");
const bearerTokenInputGroup = document.getElementById("bearerTokenInputGroup");
const bearerTokenInput = document.getElementById("bearerTokenInput");
const basicAuthInputGroup = document.getElementById("basicAuthInputGroup");
const basicUsernameInput = document.getElementById("basicUsernameInput");
const basicPasswordInput = document.getElementById("basicPasswordInput");
const apiKeyInputGroup = document.getElementById("apiKeyInputGroup");
const apiKeyInput = document.getElementById("apiKeyInput");
const apiKeyHeaderInput = document.getElementById("apiKeyHeaderInput");

const environmentVariablesEl = document.getElementById("environmentVariables");
const preRequestScriptEl = document.getElementById("preRequestScript");
const testsScriptEl = document.getElementById("testsScript");

const formatHeadersBtn = document.getElementById("formatHeadersBtn");
const formatBodyBtn = document.getElementById("formatBodyBtn");

const copyUrlBtn = document.getElementById("copyUrlBtn");
const copyHeadersBtn = document.getElementById("copyHeadersBtn");
const copyBodyBtn = document.getElementById("copyBodyBtn");
const copyPreRequestBtn = document.getElementById("copyPreRequestBtn");
const copyTestsBtn = document.getElementById("copyTestsBtn");
const copyResponseBodyBtn = document.getElementById("copyResponseBodyBtn");
const copyResponseCookiesBtn = document.getElementById(
  "copyResponseCookiesBtn"
);
const copyResponseHeadersBtn = document.getElementById(
  "copyResponseHeadersBtn"
);

let savedRequests = JSON.parse(
  localStorage.getItem("apiTesterRequests") || "[]"
);
let activeRequestIndex = null;
let environmentVars = {};

function saveStateToVsCode() {
  vscode.setState({
    requests: savedRequests,
    activeIndex: activeRequestIndex,
    environmentVars: environmentVariablesEl.value,
  });
}

function parseEnvironmentVariables() {
  console.log("Parsing environment variables");
  try {
    environmentVars = JSON.parse(environmentVariablesEl.value || "{}");
  } catch (e) {
    console.error("Error parsing environment variables JSON:", e);
    environmentVars = {};
    vscode.postMessage({
      command: "showError",
      message: "Invalid JSON in Environment Variables. Please correct it.",
    });
  }
  saveStateToVsCode();
}

/**
 * Replaces `{{variableName}}` placeholders in a string with their corresponding values
 * from `environmentVars`.
 * @param {string} str
 * @returns {string}
 */
function substituteVariables(str) {
  if (!str) {
    return "";
  }
  return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return environmentVars[varName] !== undefined
      ? environmentVars[varName]
      : match;
  });
}

function renderRequestList() {
  console.log("Rendering request list, requests:", savedRequests.length);
  requestTabs.innerHTML = "";
  savedRequests.forEach((req, index) => {
    const tab = document.createElement("div");
    tab.className =
      "request-tab" + (index === activeRequestIndex ? " active" : "");
    const displayName =
      req.name && req.name.trim() !== ""
        ? req.name
        : `[${req.method}] ${req.url || "New Request"}`;
    tab.innerHTML = `
      <span>${displayName}</span>
      <button class="close-tab-btn" title="Close Tab">×</button>
    `;
    tab.addEventListener("click", (e) => {
      if (!e.target.classList.contains("close-tab-btn")) {
        console.log("Request tab clicked:", index);
        loadRequest(index);
      }
    });
    tab.querySelector(".close-tab-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      console.log("Close tab clicked:", index);
      deleteRequest(index);
    });
    requestTabs.appendChild(tab);
  });
}

/**
 * Loads a request from history into the main editor.
 * @param {number} index
 */
function loadRequest(index) {
  console.log("Loading request:", index);
  if (activeRequestIndex !== null && activeRequestIndex !== index) {
    saveCurrentRequest();
  } else if (activeRequestIndex === null && urlInputEl.value.trim() !== "") {
    saveCurrentRequest();
  }

  activeRequestIndex = index;
  const request = savedRequests[index];

  requestNameInput.value = request.name || "";
  methodSelectEl.value = request.method;
  urlInputEl.value = request.url;
  requestHeadersEl.value = request.headers;
  requestBodyEl.value = request.body;
  preRequestScriptEl.value = request.preRequestScript || "";
  testsScriptEl.value = request.testsScript || "";

  renderParams(request.params || []);

  authTypeSelect.value =
    request.auth && request.auth.type ? request.auth.type : "none";
  updateAuthUI();
  bearerTokenInput.value =
    request.auth && request.auth.bearerToken ? request.auth.bearerToken : "";
  basicUsernameInput.value =
    request.auth && request.auth.basicUsername
      ? request.auth.basicUsername
      : "";
  basicPasswordInput.value = request.auth.basicPassword
    ? request.auth.basicPassword
    : "";
  apiKeyInput.value =
    request.auth && request.auth.apiKey ? request.auth.apiKey : "";
  apiKeyHeaderInput.value =
    request.auth && request.auth.apiKeyHeader
      ? request.auth.apiKeyHeader
      : "X-API-Key";

  resetResponseDisplay();
  renderRequestList();
  saveStateToVsCode();
}

function saveCurrentRequest() {
  console.log("Saving current request");
  const currentRequest = {
    name: requestNameInput.value.trim(),
    method: methodSelectEl.value,
    url: urlInputEl.value,
    headers: requestHeadersEl.value || "{}",
    body: requestBodyEl.value || "{}",
    params: getParamsFromUI(),
    auth: {
      type: authTypeSelect.value,
      bearerToken: bearerTokenInput.value,
      basicUsername: basicUsernameInput.value,
      basicPassword: basicPasswordInput.value,
      apiKey: apiKeyInput.value,
      apiKeyHeader: apiKeyHeaderInput.value,
    },
    preRequestScript: preRequestScriptEl.value || "",
    testsScript: testsScriptEl.value || "",
  };

  if (activeRequestIndex !== null && savedRequests[activeRequestIndex]) {
    savedRequests[activeRequestIndex] = currentRequest;
  } else {
    savedRequests.unshift(currentRequest);
    activeRequestIndex = 0;
  }
  localStorage.setItem("apiTesterRequests", JSON.stringify(savedRequests));
  renderRequestList();
}

/**
 * Deletes a request from history.
 * @param {number} indexToDelete
 */
function deleteRequest(indexToDelete) {
  savedRequests.splice(indexToDelete, 1);

  if (activeRequestIndex === indexToDelete) {
    activeRequestIndex = null;
    resetRequestEditor();
  } else if (activeRequestIndex > indexToDelete) {
    activeRequestIndex--;
  }

  localStorage.setItem("apiTesterRequests", JSON.stringify(savedRequests));
  renderRequestList();
  saveStateToVsCode();
}

function resetRequestEditor() {
  console.log("Resetting request editor");
  requestNameInput.value = "";
  methodSelectEl.value = "GET";
  urlInputEl.value = "";
  requestHeadersEl.value = "{}";
  requestBodyEl.value = "{}";
  preRequestScriptEl.value = "";
  testsScriptEl.value = "";
  renderParams([]);
  authTypeSelect.value = "none";
  bearerTokenInput.value = "";
  basicUsernameInput.value = "";
  basicPasswordInput.value = "";
  apiKeyInput.value = "";
  apiKeyHeaderInput.value = "X-API-Key";
  updateAuthUI();
  resetResponseDisplay();
  activeRequestIndex = null;
  renderRequestList();
  saveStateToVsCode();
}

function resetResponseDisplay() {
  statusCodeEl.textContent = "Status: -";
  responseTimeEl.textContent = "Time: -";
  responseSizeEl.textContent = "Size: -";
  responseOutputEl.textContent = "Response body will appear here...";
  responseHeadersOutputEl.textContent = "Response headers will appear here...";
  responseCookiesOutputEl.textContent = "Response cookies will appear here...";
  statusCodeEl.classList.remove("status-code-success", "status-code-error");
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels);
}

/**
 * Adds a new empty parameter row to the UI.
 * @param {object} [param={}]
 */
function addParamRow(param = {}) {
  console.log("Adding parameter row:", param);
  const row = document.createElement("div");
  row.className = "key-value-row";
  row.innerHTML = `
        <input type="checkbox" class="param-enabled" ${
          param.enabled !== false ? "checked" : ""
        }>
        <input type="text" class="param-key" placeholder="Key" value="${
          param.key || ""
        }">
        <input type="text" class="param-value" placeholder="Value" value="${
          param.value || ""
        }">
        <button class="delete-key-value-btn" title="Delete Parameter">✖</button>
    `;
  paramsContainer.appendChild(row);

  row.querySelector(".delete-key-value-btn").addEventListener("click", () => {
    console.log("Delete parameter clicked");
    row.remove();
    saveCurrentRequest();
  });

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", saveCurrentRequest);
  });
}

/**
 * Renders parameter rows based on an array of parameter objects.
 * @param {Array<object>} params
 */
function renderParams(params) {
  console.log("Rendering parameters:", params);
  paramsContainer.innerHTML = "";
  if (params.length === 0) {
    addParamRow();
  } else {
    params.forEach((param) => addParamRow(param));
  }
}

/**
 * Extracts parameters from the UI and returns them as an array of objects.
 * @returns {Array<object>}
 */
function getParamsFromUI() {
  const params = [];
  const paramRows = paramsContainer.querySelectorAll(".key-value-row");
  paramRows.forEach((row) => {
    const enabled = row.querySelector(".param-enabled")?.checked || false;
    const key = row.querySelector(".param-key")?.value?.trim() || "";
    const value = row.querySelector(".param-value")?.value?.trim() || "";
    if (key || value) {
      params.push({ key, value, enabled });
    }
  });
  return params;
}

/**
 * Builds the URL with query parameters.
 * @param {string} baseUrl
 * @param {Array<object>} params
 * @returns {string}
 */
function buildUrlWithParams(baseUrl, params) {
  let url = baseUrl;
  const queryString = params
    .filter((p) => p.enabled && p.key)
    .map(
      (p) =>
        `${encodeURIComponent(p.key)}=${encodeURIComponent(
          substituteVariables(p.value)
        )}`
    )
    .join("&");

  if (queryString) {
    url += (url.includes("?") ? "&" : "?") + queryString;
  }
  return url;
}

function updateAuthUI() {
  console.log("Updating auth UI:", authTypeSelect.value);
  const selectedType = authTypeSelect.value;
  bearerTokenInputGroup.classList.add("hidden");
  basicAuthInputGroup.classList.add("hidden");
  apiKeyInputGroup.classList.add("hidden");
  if (selectedType === "bearer") {
    bearerTokenInputGroup.classList.remove("hidden");
  } else if (selectedType === "basic") {
    basicAuthInputGroup.classList.remove("hidden");
  } else if (selectedType === "apikey") {
    apiKeyInputGroup.classList.remove("hidden");
  }
  saveCurrentRequest();
}

/**
 * Formats a textarea's content as pretty-printed JSON.
 * @param {HTMLTextAreaElement} textareaEl
 */
function formatJsonInput(textareaEl) {
  try {
    const parsed = JSON.parse(textareaEl.value);
    textareaEl.value = JSON.stringify(parsed, null, 2);
    vscode.postMessage({
      command: "showInfo",
      message: "JSON formatted successfully!",
    });
  } catch (e) {
    vscode.postMessage({
      command: "showError",
      message: "Invalid JSON. Cannot format.",
    });
  }
}

/**
 * Auto-formats JSON content when pasted or when content changes
 * @param {HTMLTextAreaElement} textareaEl
 */
function autoFormatJson(textareaEl) {
  if (!textareaEl.value.trim()) {
    return;
  }

  try {
    const parsed = JSON.parse(textareaEl.value);
    const formatted = JSON.stringify(parsed, null, 2);
    if (formatted !== textareaEl.value) {
      textareaEl.value = formatted;
    }
  } catch (e) {
    // Silently ignore invalid JSON - don't format if it's not valid JSON
  }
}

/**
 * Copies text to the clipboard and provides user feedback with icon animation.
 * @param {string} text
 * @param {HTMLElement} buttonElement
 * @param {string} successMessage
 */
function copyToClipboard(
  text,
  buttonElement,
  successMessage = "Copied to clipboard!"
) {
  if (!navigator.clipboard) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      vscode.postMessage({ command: "showInfo", message: successMessage });
    } catch (err) {
      vscode.postMessage({
        command: "showError",
        message: "Failed to copy text. Please copy manually.",
      });
    }
    document.body.removeChild(textarea);
    return;
  }

  const copyIcon = buttonElement.querySelector(".copy-icon");
  const checkIcon = buttonElement.querySelector(".check-icon");

  navigator.clipboard
    .writeText(text)
    .then(() => {
      vscode.postMessage({ command: "showInfo", message: successMessage });

      if (copyIcon && checkIcon) {
        copyIcon.classList.add("hidden");
        checkIcon.classList.remove("hidden");
        buttonElement.classList.add("copied-active");
      }

      setTimeout(() => {
        if (copyIcon && checkIcon) {
          copyIcon.classList.remove("hidden");
          checkIcon.classList.add("hidden");
          buttonElement.classList.remove("copied-active");
        }
      }, 1200);
    })
    .catch((err) => {
      vscode.postMessage({
        command: "showError",
        message: "Failed to copy text: " + err,
      });
    });
}

/**
 * @param {HTMLElement} clickedButton
 * @param {NodeListOf<HTMLElement>} allButtons
 * @param {NodeListOf<HTMLElement>} allPanels
 */
function switchTab(clickedButton, allButtons, allPanels) {
  console.log("Switching tab:", clickedButton.dataset.target);

  allButtons.forEach((btn) => btn.classList.remove("active"));
  allPanels.forEach((panel) => panel.classList.add("hidden"));

  clickedButton.classList.add("active");
  const targetPanelId = clickedButton.dataset.target;
  const targetPanel = document.getElementById(targetPanelId);

  if (targetPanel) {
    targetPanel.classList.remove("hidden");
    console.log("Switched to panel:", targetPanelId);
  } else {
    console.error("Panel not found:", targetPanelId);
  }
}

sendBtnEl.addEventListener("click", () => {
  console.log("Send button clicked");
  saveCurrentRequest();

  let url = substituteVariables(urlInputEl.value);
  const method = methodSelectEl.value;
  let headers = substituteVariables(requestHeadersEl.value);
  let body = substituteVariables(requestBodyEl.value);

  url = buildUrlWithParams(url, getParamsFromUI());

  if (
    authTypeSelect.value === "bearer" &&
    bearerTokenInput.value.trim() !== ""
  ) {
    try {
      const headersObj = JSON.parse(headers || "{}");
      headersObj["Authorization"] = `Bearer ${substituteVariables(
        bearerTokenInput.value
      )}`;
      headers = JSON.stringify(headersObj);
    } catch (e) {
      console.error("Error parsing headers JSON for auth:", e);
      vscode.postMessage({
        command: "showError",
        message:
          "Invalid JSON in Request Headers. Bearer token might not be applied correctly.",
      });
    }
  } else if (
    authTypeSelect.value === "basic" &&
    basicUsernameInput.value.trim() !== "" &&
    basicPasswordInput.value.trim() !== ""
  ) {
    try {
      const headersObj = JSON.parse(headers || "{}");
      const credentials = btoa(
        `${substituteVariables(basicUsernameInput.value)}:${substituteVariables(
          basicPasswordInput.value
        )}`
      );
      headersObj["Authorization"] = `Basic ${credentials}`;
      headers = JSON.stringify(headersObj);
    } catch (e) {
      console.error("Error parsing headers JSON for basic auth:", e);
      vscode.postMessage({
        command: "showError",
        message:
          "Invalid JSON in Request Headers. Basic auth might not be applied correctly.",
      });
    }
  } else if (
    authTypeSelect.value === "apikey" &&
    apiKeyInput.value.trim() !== ""
  ) {
    try {
      const headersObj = JSON.parse(headers || "{}");
      const headerName =
        substituteVariables(apiKeyHeaderInput.value) || "X-API-Key";
      headersObj[headerName] = substituteVariables(apiKeyInput.value);
      headers = JSON.stringify(headersObj);
    } catch (e) {
      console.error("Error parsing headers JSON for API key:", e);
      vscode.postMessage({
        command: "showError",
        message:
          "Invalid JSON in Request Headers. API key might not be applied correctly.",
      });
    }
  }

  statusCodeEl.textContent = "Status: Sending...";
  responseTimeEl.textContent = "Time: -";
  responseSizeEl.textContent = "Size: -";
  responseOutputEl.textContent = "Waiting for response...";
  responseHeadersOutputEl.textContent = "Waiting for response...";
  statusCodeEl.classList.remove("status-code-success", "status-code-error");
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels);

  console.log("Sending request message to extension:", {
    command: "sendRequest",
    method,
    url,
    headers,
    body,
  });
  vscode.postMessage({
    command: "sendRequest",
    method,
    url,
    headers,
    body,
  });
});

window.addEventListener("message", (event) => {
  console.log("Webview received message:", event.data);
  const message = event.data;
  if (message.command === "response") {
    console.log("Processing response message:", message);
    statusCodeEl.textContent = `Status: ${message.status} ${message.statusText}`;
    if (message.ok && message.status >= 200 && message.status < 300) {
      statusCodeEl.classList.add("status-code-success");
      statusCodeEl.classList.remove("status-code-error");
    } else {
      statusCodeEl.classList.add("status-code-error");
      statusCodeEl.classList.remove("status-code-success");
    }

    responseTimeEl.textContent = `Time: ${message.time}ms`;

    const sizeInBytes = new TextEncoder().encode(message.body).length;
    let sizeDisplay;
    if (sizeInBytes < 1024) {
      sizeDisplay = `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      sizeDisplay = `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
      sizeDisplay = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    responseSizeEl.textContent = `Size: ${sizeDisplay}`;

    let displayBody = message.body;
    const contentType =
      message.headers && message.headers["content-type"]
        ? message.headers["content-type"]
        : "";

    if (contentType.includes("application/json")) {
      try {
        displayBody = JSON.stringify(JSON.parse(message.body), null, 2);
      } catch (e) {
        console.warn("Could not pretty print JSON response body:", e);
      }
    }
    responseOutputEl.textContent = displayBody;

    let displayHeaders = "";
    if (message.headers) {
      for (const key in message.headers) {
        if (Object.hasOwnProperty.call(message.headers, key)) {
          displayHeaders += `${key}: ${message.headers[key]}\n`;
        }
      }
    } else {
      displayHeaders = "No response headers received.";
    }
    responseHeadersOutputEl.textContent = displayHeaders;
  } else if (message.command === "error") {
    console.error("Error received from extension:", message);
    statusCodeEl.textContent = `Status: Error`;
    statusCodeEl.classList.add("status-code-error");
    responseOutputEl.textContent =
      message.body ||
      "An error occurred. Please check the console for details.";
    responseHeadersOutputEl.textContent = "No response headers received.";
  }
});

requestTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Request tab clicked:", button.dataset.target);
    switchTab(button, requestTabButtons, requestTabPanels);
  });
});

responseTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Response tab clicked:", button.dataset.target);
    switchTab(button, responseTabButtons, responseTabPanels);
  });
});

newRequestBtn.addEventListener("click", () => {
  console.log("New request button clicked");
  saveCurrentRequest();
  resetRequestEditor();
});

clearResponseBtn.addEventListener("click", () => {
  console.log("Clear response button clicked");
  resetResponseDisplay();
});

addParamBtn.addEventListener("click", () => {
  console.log("Add parameter button clicked");
  addParamRow();
  saveCurrentRequest();
});

authTypeSelect.addEventListener("change", () => {
  console.log("Auth type changed");
  updateAuthUI();
});
bearerTokenInput.addEventListener("input", () => {
  console.log("Bearer token input changed");
  saveCurrentRequest();
});
basicUsernameInput.addEventListener("input", () => {
  console.log("Basic username input changed");
  saveCurrentRequest();
});
basicPasswordInput.addEventListener("input", () => {
  console.log("Basic password input changed");
  saveCurrentRequest();
});
apiKeyInput.addEventListener("input", () => {
  console.log("API key input changed");
  saveCurrentRequest();
});
apiKeyHeaderInput.addEventListener("input", () => {
  console.log("API key header input changed");
  saveCurrentRequest();
});

requestNameInput.addEventListener("input", () => {
  console.log("Request name input changed");
  saveCurrentRequest();
});
methodSelectEl.addEventListener("change", () => {
  console.log("Method select changed");
  saveCurrentRequest();
});
urlInputEl.addEventListener("input", () => {
  console.log("URL input changed");
  saveCurrentRequest();
});
requestHeadersEl.addEventListener("input", () => {
  console.log("Request headers input changed");
  saveCurrentRequest();
});
requestBodyEl.addEventListener("input", () => {
  console.log("Request body input changed");
  saveCurrentRequest();
});
preRequestScriptEl.addEventListener("input", () => {
  console.log("Pre-request script input changed");
  saveCurrentRequest();
});
testsScriptEl.addEventListener("input", () => {
  console.log("Tests script input changed");
  saveCurrentRequest();
});

environmentVariablesEl.addEventListener("input", () => {
  console.log("Environment variables input changed");
  parseEnvironmentVariables();
});

// Auto-format JSON in request body on paste and blur
requestBodyEl.addEventListener("paste", (e) => {
  console.log("Paste event in request body");
  setTimeout(() => autoFormatJson(requestBodyEl), 10);
});
requestBodyEl.addEventListener("blur", () => {
  console.log("Blur event in request body");
  autoFormatJson(requestBodyEl);
});

formatHeadersBtn.addEventListener("click", () => {
  console.log("Format headers button clicked");
  formatJsonInput(requestHeadersEl);
});
formatBodyBtn.addEventListener("click", () => {
  console.log("Format body button clicked");
  formatJsonInput(requestBodyEl);
});

copyUrlBtn.addEventListener("click", (e) => {
  console.log("Copy URL button clicked");
  copyToClipboard(urlInputEl.value, e.currentTarget, "URL copied!");
});
copyHeadersBtn.addEventListener("click", (e) =>
  copyToClipboard(
    requestHeadersEl.value,
    e.currentTarget,
    "Request Headers copied!"
  )
);
copyBodyBtn.addEventListener("click", (e) =>
  copyToClipboard(requestBodyEl.value, e.currentTarget, "Request Body copied!")
);
copyPreRequestBtn.addEventListener("click", (e) =>
  copyToClipboard(
    preRequestScriptEl.value,
    e.currentTarget,
    "Pre-request Script copied!"
  )
);
copyTestsBtn.addEventListener("click", (e) =>
  copyToClipboard(testsScriptEl.value, e.currentTarget, "Tests copied!")
);
copyResponseBodyBtn.addEventListener("click", (e) =>
  copyToClipboard(
    responseOutputEl.textContent,
    e.currentTarget,
    "Response Body copied!"
  )
);
copyResponseCookiesBtn.addEventListener("click", (e) =>
  copyToClipboard(
    responseCookiesOutputEl.textContent,
    e.currentTarget,
    "Response Cookies copied!"
  )
);
copyResponseHeadersBtn.addEventListener("click", (e) =>
  copyToClipboard(
    responseHeadersOutputEl.textContent,
    e.currentTarget,
    "Response Headers copied!"
  )
);

const restoredState = vscode.getState();
console.log("Restored state:", restoredState);
if (restoredState) {
  if (restoredState.requests && restoredState.requests.length > 0) {
    savedRequests = restoredState.requests;
    activeRequestIndex = restoredState.activeIndex;
    if (activeRequestIndex !== null && savedRequests[activeRequestIndex]) {
      loadRequest(activeRequestIndex);
    } else if (savedRequests.length > 0) {
      activeRequestIndex = 0;
      loadRequest(0);
    } else {
      resetRequestEditor();
    }
  } else {
    resetRequestEditor();
  }

  environmentVariablesEl.value = restoredState.environmentVars || "{}";
  parseEnvironmentVariables();

  // No sidebar state to restore in new layout
} else {
  console.log("No restored state found, initializing fresh");
  resetRequestEditor();
  environmentVariablesEl.value = "{}";
  parseEnvironmentVariables();
}

if (paramsContainer.children.length === 0) {
  console.log("No parameters found, adding default row");
  addParamRow();
}

console.log("Calling renderRequestList");
renderRequestList();
