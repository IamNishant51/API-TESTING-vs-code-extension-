const vscode = acquireVsCodeApi();

const mainContainer = document.getElementById("mainContainer");
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const newRequestBtn = document.getElementById("newRequestBtn");
const requestListEl = document.getElementById("requestList");

const requestNameInput = document.getElementById("requestNameInput");
const methodSelectEl = document.getElementById("methodSelect");
const urlInputEl = document.getElementById("urlInput");
const sendBtnEl = document.getElementById("sendBtn");

const requestBodyEl = document.getElementById("requestBody");
const requestHeadersEl = document.getElementById("requestHeaders");
const responseOutputEl = document.getElementById("responseOutput"); 
const responseHeadersOutputEl = document.getElementById("responseHeadersOutput"); 

const statusCodeEl = document.getElementById("statusCode");
const responseTimeEl = document.getElementById("responseTime");
const responseSizeEl = document.getElementById("responseSize");
const clearResponseBtn = document.getElementById("clearResponseBtn");

const requestTabButtons = document.querySelectorAll(".request-section .tab-button"); 
const requestTabPanels = document.querySelectorAll(".request-section .tab-panel"); 
const responseTabButtons = document.querySelectorAll(".response-section .tab-button"); 
const responseTabPanels = document.querySelectorAll(".response-section .tab-panel");

const paramsContainer = document.getElementById("paramsContainer");
const addParamBtn = document.getElementById("addParamBtn");

const authTypeSelect = document.getElementById("authTypeSelect");
const bearerTokenInputGroup = document.getElementById("bearerTokenInputGroup");
const bearerTokenInput = document.getElementById("bearerTokenInput");

const environmentVariablesEl = document.getElementById("environmentVariables");

const formatHeadersBtn = document.getElementById("formatHeadersBtn");
const formatBodyBtn = document.getElementById("formatBodyBtn");

const copyUrlBtn = document.getElementById("copyUrlBtn");
const copyHeadersBtn = document.getElementById("copyHeadersBtn");
const copyBodyBtn = document.getElementById("copyBodyBtn");
const copyResponseBodyBtn = document.getElementById("copyResponseBodyBtn");
const copyResponseHeadersBtn = document.getElementById("copyResponseHeadersBtn");


let savedRequests = JSON.parse(localStorage.getItem("apiTesterRequests") || "[]");
let activeRequestIndex = null;
let isSidebarCollapsed = false;
let environmentVars = {};

function saveStateToVsCode() {
  vscode.setState({
    requests: savedRequests,
    activeIndex: activeRequestIndex,
    isSidebarCollapsed: isSidebarCollapsed,
    environmentVars: environmentVariablesEl.value 
  });
}

function parseEnvironmentVariables() {
    try {
        environmentVars = JSON.parse(environmentVariablesEl.value || "{}");
    } catch (e) {
        console.error("Error parsing environment variables JSON:", e);
        environmentVars = {}; 
        vscode.postMessage({
            command: "showError",
            message: "Invalid JSON in Environment Variables. Please correct it."
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
    if (!str) return '';
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return environmentVars[varName] !== undefined ? environmentVars[varName] : match;
    });
}

function renderRequestList() {
  requestListEl.innerHTML = "";
  savedRequests.forEach((req, index) => {
    const item = document.createElement("div");
    item.className = "request-item" + (index === activeRequestIndex ? " active" : "");
    const displayName = req.name && req.name.trim() !== "" 
                        ? req.name 
                        : `[${req.method}] ${req.url.length > 30 ? req.url.substring(0, 27) + "..." : req.url || 'New Request'}`;
    item.innerHTML = `
      <span>${displayName}</span>
      <button class="delete-btn" title="Delete Request">✖</button>
    `;
    item.addEventListener("click", () => loadRequest(index));
    item.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteRequest(index);
    });
    requestListEl.prepend(item);
  });
}

/**
 * Loads a request from history into the main editor.
 * @param {number} index 
 */
function loadRequest(index) {
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

  renderParams(request.params || []);

  authTypeSelect.value = request.auth && request.auth.type ? request.auth.type : "none";
  updateAuthUI(); 
  bearerTokenInput.value = request.auth && request.auth.value ? request.auth.value : "";

  resetResponseDisplay();
  renderRequestList();
  saveStateToVsCode();
}

function saveCurrentRequest() {
  const currentRequest = {
    name: requestNameInput.value.trim(), 
    method: methodSelectEl.value,
    url: urlInputEl.value,
    headers: requestHeadersEl.value || "{}",
    body: requestBodyEl.value || "{}",
    params: getParamsFromUI(), 
    auth: { 
        type: authTypeSelect.value,
        value: bearerTokenInput.value
    }
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
  requestNameInput.value = "";
  methodSelectEl.value = "GET";
  urlInputEl.value = "";
  requestHeadersEl.value = "{}";
  requestBodyEl.value = "{}";
  renderParams([]); 
  authTypeSelect.value = "none";
  bearerTokenInput.value = "";
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
  statusCodeEl.classList.remove('status-code-success', 'status-code-error');
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels);
}

/**
 * Adds a new empty parameter row to the UI.
 * @param {object} [param={}] 
 */
function addParamRow(param = {}) {
    const row = document.createElement('div');
    row.className = 'key-value-row';
    row.innerHTML = `
        <input type="checkbox" class="param-enabled" ${param.enabled !== false ? 'checked' : ''}>
        <input type="text" class="param-key" placeholder="Key" value="${param.key || ''}">
        <input type="text" class="param-value" placeholder="Value" value="${param.value || ''}">
        <button class="delete-key-value-btn" title="Delete Parameter">✖</button>
    `;
    paramsContainer.appendChild(row);

    row.querySelector('.delete-key-value-btn').addEventListener('click', () => {
        row.remove();
        saveCurrentRequest(); 
    });

    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveCurrentRequest);
    });
}

/**
 * Renders parameter rows based on an array of parameter objects.
 * @param {Array<object>} params 
 */
function renderParams(params) {
    paramsContainer.innerHTML = ''; 
    if (params.length === 0) {
        addParamRow();
    } else {
        params.forEach(param => addParamRow(param));
    }
}

/**
 * Extracts parameters from the UI and returns them as an array of objects.
 * @returns {Array<object>}
 */
function getParamsFromUI() {
    const params = [];
    paramsContainer.querySelectorAll('.key-value-row').forEach(row => {
        const enabled = row.querySelector('.param-enabled').checked;
        const key = row.querySelector('.param-key').value.trim();
        const value = row.querySelector('.param-value').value.trim();
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
        .filter(p => p.enabled && p.key) 
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(substituteVariables(p.value))}`) 
        .join('&');

    if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return url;
}


function updateAuthUI() {
    const selectedType = authTypeSelect.value;
    if (selectedType === "bearer") {
        bearerTokenInputGroup.classList.remove("hidden");
    } else {
        bearerTokenInputGroup.classList.add("hidden");
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
        vscode.postMessage({ command: "showInfo", message: "JSON formatted successfully!" });
    } catch (e) {
        vscode.postMessage({ command: "showError", message: "Invalid JSON. Cannot format." });
    }
}

/**
 * Copies text to the clipboard and provides user feedback with icon animation.
 * @param {string} text 
 * @param {HTMLElement} buttonElement 
 * @param {string} successMessage 
 */
function copyToClipboard(text, buttonElement, successMessage = "Copied to clipboard!") {
    if (!navigator.clipboard) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; 
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0'; 
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            vscode.postMessage({ command: "showInfo", message: successMessage });
        } catch (err) {
            vscode.postMessage({ command: "showError", message: "Failed to copy text. Please copy manually." });
        }
        document.body.removeChild(textarea);
        return;
    }

    const copyIcon = buttonElement.querySelector('.copy-icon');
    const checkIcon = buttonElement.querySelector('.check-icon');

    navigator.clipboard.writeText(text).then(() => {
        vscode.postMessage({ command: "showInfo", message: successMessage });

        if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            buttonElement.classList.add('copied-active'); 
        }

        setTimeout(() => {
            if (copyIcon && checkIcon) {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
                buttonElement.classList.remove('copied-active');
            }
        }, 1200); 
    }).catch(err => {
        vscode.postMessage({ command: "showError", message: "Failed to copy text: " + err });
    });
}

/**
 * @param {HTMLElement} clickedButton 
 * @param {NodeListOf<HTMLElement>} allButtons 
 * @param {NodeListOf<HTMLElement>} allPanels 
 */
function switchTab(clickedButton, allButtons, allPanels) {
    allButtons.forEach(btn => btn.classList.remove("active"));
    allPanels.forEach(panel => panel.classList.add("hidden"));

    clickedButton.classList.add("active");
    const targetPanelId = clickedButton.dataset.target;
    document.getElementById(targetPanelId).classList.remove("hidden");
}

sendBtnEl.addEventListener("click", () => {
  saveCurrentRequest(); 

  let url = substituteVariables(urlInputEl.value);
  const method = methodSelectEl.value;
  let headers = substituteVariables(requestHeadersEl.value);
  let body = substituteVariables(requestBodyEl.value);

  url = buildUrlWithParams(url, getParamsFromUI());

  if (authTypeSelect.value === "bearer" && bearerTokenInput.value.trim() !== "") {
      try {
          const headersObj = JSON.parse(headers || "{}");
          headersObj["Authorization"] = `Bearer ${substituteVariables(bearerTokenInput.value)}`;
          headers = JSON.stringify(headersObj);
      } catch (e) {
          console.error("Error parsing headers JSON for auth:", e);
          vscode.postMessage({
            command: "showError",
            message: "Invalid JSON in Request Headers. Bearer token might not be applied correctly."
          });
      
      }
  }

  statusCodeEl.textContent = "Status: Sending...";
  responseTimeEl.textContent = "Time: -";
  responseSizeEl.textContent = "Size: -";
  responseOutputEl.textContent = "Waiting for response...";
  responseHeadersOutputEl.textContent = "Waiting for response..."; 
  statusCodeEl.classList.remove('status-code-success', 'status-code-error');
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels);

  vscode.postMessage({
    command: "sendRequest",
    method,
    url,
    headers,
    body,
  });
});

window.addEventListener("message", (event) => {
  const message = event.data; 
  if (message.command === "response") {
    statusCodeEl.textContent = `Status: ${message.status} ${message.statusText}`;
    if (message.ok && message.status >= 200 && message.status < 300) {
        statusCodeEl.classList.add('status-code-success');
        statusCodeEl.classList.remove('status-code-error');
    } else {
        statusCodeEl.classList.add('status-code-error');
        statusCodeEl.classList.remove('status-code-success');
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
    const contentType = message.headers && message.headers['content-type'] ? message.headers['content-type'] : '';
    
    if (contentType.includes('application/json')) {
        try {
            displayBody = JSON.stringify(JSON.parse(message.body), null, 2);
        } catch (e) {
            console.warn("Could not pretty print JSON response body:", e);
        }
    }
    responseOutputEl.textContent = displayBody;

    let displayHeaders = '';
    if (message.headers) {
        for (const key in message.headers) {
            if (Object.hasOwnProperty.call(message.headers, key)) {
                displayHeaders += `${key}: ${message.headers[key]}\n`;
            }
        }
    } else {
        displayHeaders = 'No response headers received.';
    }
    responseHeadersOutputEl.textContent = displayHeaders;
  }
});

requestTabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button, requestTabButtons, requestTabPanels);
  });
});

responseTabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button, responseTabButtons, responseTabPanels);
  });
});

newRequestBtn.addEventListener("click", () => {
    saveCurrentRequest(); 
    resetRequestEditor();
});

toggleSidebarBtn.addEventListener("click", () => {
  isSidebarCollapsed = !isSidebarCollapsed; 
  mainContainer.classList.toggle("sidebar-collapsed", isSidebarCollapsed);
  saveStateToVsCode(); 
});

clearResponseBtn.addEventListener("click", () => {
    resetResponseDisplay();
});

addParamBtn.addEventListener('click', () => {
    addParamRow();
    saveCurrentRequest(); 
});

authTypeSelect.addEventListener('change', updateAuthUI);
bearerTokenInput.addEventListener('input', saveCurrentRequest); 

requestNameInput.addEventListener('input', saveCurrentRequest);
methodSelectEl.addEventListener('change', saveCurrentRequest);
urlInputEl.addEventListener('input', saveCurrentRequest);
requestHeadersEl.addEventListener('input', saveCurrentRequest);
requestBodyEl.addEventListener('input', saveCurrentRequest);

environmentVariablesEl.addEventListener('input', parseEnvironmentVariables);

formatHeadersBtn.addEventListener('click', () => formatJsonInput(requestHeadersEl));
formatBodyBtn.addEventListener('click', () => formatJsonInput(requestBodyEl));

copyUrlBtn.addEventListener('click', (e) => copyToClipboard(urlInputEl.value, e.currentTarget, "URL copied!"));
copyHeadersBtn.addEventListener('click', (e) => copyToClipboard(requestHeadersEl.value, e.currentTarget, "Request Headers copied!"));
copyBodyBtn.addEventListener('click', (e) => copyToClipboard(requestBodyEl.value, e.currentTarget, "Request Body copied!"));
copyResponseBodyBtn.addEventListener('click', (e) => copyToClipboard(responseOutputEl.textContent, e.currentTarget, "Response Body copied!"));
copyResponseHeadersBtn.addEventListener('click', (e) => copyToClipboard(responseHeadersOutputEl.textContent, e.currentTarget, "Response Headers copied!"));


const restoredState = vscode.getState();
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
    
    environmentVariablesEl.value = restoredState.environmentVars || '{}';
    parseEnvironmentVariables(); 

    isSidebarCollapsed = restoredState.isSidebarCollapsed || false; 
    mainContainer.classList.toggle("sidebar-collapsed", isSidebarCollapsed);

} else {
    resetRequestEditor();
    environmentVariablesEl.value = '{}';
    parseEnvironmentVariables();
}

if (paramsContainer.children.length === 0) {
    addParamRow();
}

renderRequestList();