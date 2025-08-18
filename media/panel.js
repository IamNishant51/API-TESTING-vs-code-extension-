// media/panel.js

const vscode = acquireVsCodeApi();

// DOM Elements
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
const responseOutputEl = document.getElementById("responseOutput"); // Response Body Output
const responseHeadersOutputEl = document.getElementById("responseHeadersOutput"); // Response Headers Output

const statusCodeEl = document.getElementById("statusCode");
const responseTimeEl = document.getElementById("responseTime");
const responseSizeEl = document.getElementById("responseSize");
const clearResponseBtn = document.getElementById("clearResponseBtn");

const requestTabButtons = document.querySelectorAll(".request-section .tab-button"); // Select only request section tabs
const requestTabPanels = document.querySelectorAll(".request-section .tab-panel"); // Select only request section panels

const responseTabButtons = document.querySelectorAll(".response-section .tab-button"); // Select response section tabs
const responseTabPanels = document.querySelectorAll(".response-section .tab-panel"); // Select response section panels

// Params Tab Elements
const paramsContainer = document.getElementById("paramsContainer");
const addParamBtn = document.getElementById("addParamBtn");

// Auth Tab Elements
const authTypeSelect = document.getElementById("authTypeSelect");
const bearerTokenInputGroup = document.getElementById("bearerTokenInputGroup");
const bearerTokenInput = document.getElementById("bearerTokenInput");

// Environment Variables Tab Element
const environmentVariablesEl = document.getElementById("environmentVariables");

// Format Buttons
const formatHeadersBtn = document.getElementById("formatHeadersBtn");
const formatBodyBtn = document.getElementById("formatBodyBtn");

// Copy Buttons
const copyUrlBtn = document.getElementById("copyUrlBtn");
const copyHeadersBtn = document.getElementById("copyHeadersBtn");
const copyBodyBtn = document.getElementById("copyBodyBtn");
const copyResponseBodyBtn = document.getElementById("copyResponseBodyBtn");
const copyResponseHeadersBtn = document.getElementById("copyResponseHeadersBtn");


// State Management
let savedRequests = JSON.parse(localStorage.getItem("apiTesterRequests") || "[]");
let activeRequestIndex = null;
let isSidebarCollapsed = false;
let environmentVars = {}; // Holds parsed environment variables

// Helper to save all state to VS Code (for persistence across reloads)
function saveStateToVsCode() {
  vscode.setState({
    requests: savedRequests,
    activeIndex: activeRequestIndex,
    isSidebarCollapsed: isSidebarCollapsed,
    environmentVars: environmentVariablesEl.value // Save raw text for env vars
  });
}

// --------------------
// Environment Variable Functions
// --------------------

/**
 * Parses the environment variables from the textarea and updates the global `environmentVars` object.
 */
function parseEnvironmentVariables() {
    try {
        environmentVars = JSON.parse(environmentVariablesEl.value || "{}");
        // console.log("Environment variables parsed:", environmentVars);
    } catch (e) {
        console.error("Error parsing environment variables JSON:", e);
        environmentVars = {}; // Reset on error
        vscode.postMessage({
            command: "showError",
            message: "Invalid JSON in Environment Variables. Please correct it."
        });
    }
    saveStateToVsCode(); // Save updated variables
}

/**
 * Replaces `{{variableName}}` placeholders in a string with their corresponding values
 * from `environmentVars`.
 * @param {string} str The string to process.
 * @returns {string} The string with variables replaced.
 */
function substituteVariables(str) {
    if (!str) return '';
    return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return environmentVars[varName] !== undefined ? environmentVars[varName] : match;
    });
}

// --------------------
// UI Render Functions
// --------------------

/**
 * Renders the list of saved requests in the sidebar.
 */
function renderRequestList() {
  requestListEl.innerHTML = "";
  savedRequests.forEach((req, index) => {
    const item = document.createElement("div");
    item.className = "request-item" + (index === activeRequestIndex ? " active" : "");
    // Display name if available, otherwise fallback to method + URL
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
 * @param {number} index The index of the request to load.
 */
function loadRequest(index) {
  // Save current request state before loading a new one
  if (activeRequestIndex !== null && activeRequestIndex !== index) {
      saveCurrentRequest();
  } else if (activeRequestIndex === null && urlInputEl.value.trim() !== "") {
      // If no active request but there's content, save it as a new unnamed request
      saveCurrentRequest();
  }

  activeRequestIndex = index;
  const request = savedRequests[index];

  requestNameInput.value = request.name || ""; // Load name
  methodSelectEl.value = request.method;
  urlInputEl.value = request.url;
  requestHeadersEl.value = request.headers;
  requestBodyEl.value = request.body;

  // Load Params
  renderParams(request.params || []);

  // Load Auth
  authTypeSelect.value = request.auth && request.auth.type ? request.auth.type : "none";
  updateAuthUI(); // Show/hide bearer token input
  bearerTokenInput.value = request.auth && request.auth.value ? request.auth.value : "";

  resetResponseDisplay();
  renderRequestList();
  saveStateToVsCode();
}

/**
 * Saves the current state of the request editor (URL, Method, Headers, Body, Name, Params, Auth)
 * either by updating an existing request or adding a new one.
 */
function saveCurrentRequest() {
  const currentRequest = {
    name: requestNameInput.value.trim(), // Save the name
    method: methodSelectEl.value,
    url: urlInputEl.value,
    headers: requestHeadersEl.value || "{}",
    body: requestBodyEl.value || "{}",
    params: getParamsFromUI(), // Get params from UI
    auth: { // Get auth from UI
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
  renderRequestList(); // Re-render to reflect changes in sidebar
}

/**
 * Deletes a request from history.
 * @param {number} indexToDelete The index of the request to delete.
 */
function deleteRequest(indexToDelete) {
  savedRequests.splice(indexToDelete, 1);

  if (activeRequestIndex === indexToDelete) {
    activeRequestIndex = null;
    resetRequestEditor(); // Clear editor if active request was deleted
  } else if (activeRequestIndex > indexToDelete) {
    activeRequestIndex--; // Adjust active index if item before it was deleted
  }

  localStorage.setItem("apiTesterRequests", JSON.stringify(savedRequests));
  renderRequestList();
  saveStateToVsCode();
}

/**
 * Clears the request editor to start a new blank request.
 */
function resetRequestEditor() {
  requestNameInput.value = "";
  methodSelectEl.value = "GET";
  urlInputEl.value = "";
  requestHeadersEl.value = "{}";
  requestBodyEl.value = "{}";
  renderParams([]); // Clear params UI
  authTypeSelect.value = "none";
  bearerTokenInput.value = "";
  updateAuthUI(); // Hide bearer token input
  resetResponseDisplay();
  activeRequestIndex = null;
  renderRequestList(); // Update sidebar (no active item)
  saveStateToVsCode();
}

/**
 * Clears the response display area.
 */
function resetResponseDisplay() {
  statusCodeEl.textContent = "Status: -";
  responseTimeEl.textContent = "Time: -";
  responseSizeEl.textContent = "Size: -";
  responseOutputEl.textContent = "Response body will appear here...";
  responseHeadersOutputEl.textContent = "Response headers will appear here..."; // Clear headers too
  statusCodeEl.classList.remove('status-code-success', 'status-code-error');
  // Reset response tab to body
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels);
}

// --------------------
// Params Tab Functions
// --------------------

/**
 * Adds a new empty parameter row to the UI.
 * @param {object} [param={}] - Optional initial parameter object with key, value, and enabled properties.
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

    // Add event listener for delete button
    row.querySelector('.delete-key-value-btn').addEventListener('click', () => {
        row.remove();
        saveCurrentRequest(); // Save state after deleting a param
    });

    // Add event listeners for input changes to trigger auto-save
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveCurrentRequest);
    });
}

/**
 * Renders parameter rows based on an array of parameter objects.
 * @param {Array<object>} params An array of {key, value, enabled} objects.
 */
function renderParams(params) {
    paramsContainer.innerHTML = ''; // Clear existing rows
    if (params.length === 0) {
        // If no params, add one empty row for convenience
        addParamRow();
    } else {
        params.forEach(param => addParamRow(param));
    }
}

/**
 * Extracts parameters from the UI and returns them as an array of objects.
 * @returns {Array<object>} An array of {key, value, enabled} objects.
 */
function getParamsFromUI() {
    const params = [];
    paramsContainer.querySelectorAll('.key-value-row').forEach(row => {
        const enabled = row.querySelector('.param-enabled').checked;
        const key = row.querySelector('.param-key').value.trim();
        const value = row.querySelector('.param-value').value.trim();
        if (key || value) { // Only save if key or value is present
            params.push({ key, value, enabled });
        }
    });
    return params;
}

/**
 * Builds the URL with query parameters.
 * @param {string} baseUrl The base URL.
 * @param {Array<object>} params An array of {key, value, enabled} objects.
 * @returns {string} The URL with query parameters.
 */
function buildUrlWithParams(baseUrl, params) {
    let url = baseUrl;
    const queryString = params
        .filter(p => p.enabled && p.key) // Only enabled params with a key
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(substituteVariables(p.value))}`) // Substitute variables in values
        .join('&');

    if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
    }
    return url;
}


// --------------------
// Auth Tab Functions
// --------------------

/**
 * Updates the visibility of authentication input groups based on the selected auth type.
 */
function updateAuthUI() {
    const selectedType = authTypeSelect.value;
    if (selectedType === "bearer") {
        bearerTokenInputGroup.classList.remove("hidden");
    } else {
        bearerTokenInputGroup.classList.add("hidden");
    }
    saveCurrentRequest(); // Save auth state on change
}

// --------------------
// General Utility Functions
// --------------------

/**
 * Formats a textarea's content as pretty-printed JSON.
 * @param {HTMLTextAreaElement} textareaEl The textarea element to format.
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
 * @param {string} text The text to copy.
 * @param {HTMLElement} buttonElement The button element that was clicked.
 * @param {string} successMessage Message to show on successful copy.
 */
function copyToClipboard(text, buttonElement, successMessage = "Copied to clipboard!") {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        textarea.style.left = '-9999px';
        textarea.style.opacity = '0'; // Hide it
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

        // Animation feedback
        if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            buttonElement.classList.add('copied-active'); // For potential button-wide animation
        }

        setTimeout(() => {
            if (copyIcon && checkIcon) {
                copyIcon.classList.remove('hidden');
                checkIcon.classList.add('hidden');
                buttonElement.classList.remove('copied-active');
            }
        }, 1200); // Duration for the animation feedback
    }).catch(err => {
        vscode.postMessage({ command: "showError", message: "Failed to copy text: " + err });
    });
}

/**
 * Generic function to switch tabs within a group.
 * @param {HTMLElement} clickedButton The button that was clicked.
 * @param {NodeListOf<HTMLElement>} allButtons All tab buttons in the group.
 * @param {NodeListOf<HTMLElement>} allPanels All tab panels in the group.
 */
function switchTab(clickedButton, allButtons, allPanels) {
    allButtons.forEach(btn => btn.classList.remove("active"));
    allPanels.forEach(panel => panel.classList.add("hidden"));

    clickedButton.classList.add("active");
    const targetPanelId = clickedButton.dataset.target;
    document.getElementById(targetPanelId).classList.remove("hidden");
}


// --------------------
// Event Listeners
// --------------------

// Event listener for the "Send" button
sendBtnEl.addEventListener("click", () => {
  saveCurrentRequest(); // Save the current request state before sending

  // Substitute variables in URL, Headers, and Body BEFORE sending
  let url = substituteVariables(urlInputEl.value);
  const method = methodSelectEl.value;
  let headers = substituteVariables(requestHeadersEl.value);
  let body = substituteVariables(requestBodyEl.value);

  // Build URL with query parameters
  url = buildUrlWithParams(url, getParamsFromUI());

  // Add Auth Headers
  if (authTypeSelect.value === "bearer" && bearerTokenInput.value.trim() !== "") {
      try {
          // Attempt to parse headers JSON to add Authorization
          const headersObj = JSON.parse(headers || "{}");
          headersObj["Authorization"] = `Bearer ${substituteVariables(bearerTokenInput.value)}`;
          headers = JSON.stringify(headersObj);
      } catch (e) {
          console.error("Error parsing headers JSON for auth:", e);
          vscode.postMessage({
            command: "showError",
            message: "Invalid JSON in Request Headers. Bearer token might not be applied correctly."
          });
          // Fallback: This part would only work if headers were not strictly JSON before,
          // but if they are, the JSON.parse error means we can't merge cleanly.
          // For now, if parsing fails, we proceed with potentially malformed headers,
          // relying on the user to fix their JSON.
      }
  }

  // Indicate loading state
  statusCodeEl.textContent = "Status: Sending...";
  responseTimeEl.textContent = "Time: -";
  responseSizeEl.textContent = "Size: -";
  responseOutputEl.textContent = "Waiting for response...";
  responseHeadersOutputEl.textContent = "Waiting for response..."; // Clear headers output on new request
  statusCodeEl.classList.remove('status-code-success', 'status-code-error');
  switchTab(responseTabButtons[0], responseTabButtons, responseTabPanels); // Reset response tab to body

  // Post message to the VS Code extension to send the HTTP request
  vscode.postMessage({
    command: "sendRequest",
    method,
    url,
    headers,
    body,
  });
});

// Handle messages from the extension (responses)
window.addEventListener("message", (event) => {
  const message = event.data; // The JSON data sent from the extension
  if (message.command === "response") {
    // Update status code display
    statusCodeEl.textContent = `Status: ${message.status} ${message.statusText}`;
    if (message.ok && message.status >= 200 && message.status < 300) {
        statusCodeEl.classList.add('status-code-success');
        statusCodeEl.classList.remove('status-code-error');
    } else {
        statusCodeEl.classList.add('status-code-error');
        statusCodeEl.classList.remove('status-code-success');
    }

    // Update response time display
    responseTimeEl.textContent = `Time: ${message.time}ms`;

    // Calculate and display response size
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

    // Pretty print JSON response body if content-type is JSON
    let displayBody = message.body;
    const contentType = message.headers && message.headers['content-type'] ? message.headers['content-type'] : '';
    
    if (contentType.includes('application/json')) {
        try {
            displayBody = JSON.stringify(JSON.parse(message.body), null, 2);
        } catch (e) {
            console.warn("Could not pretty print JSON response body:", e);
            // Fallback to raw body if parsing fails
        }
    }
    responseOutputEl.textContent = displayBody;

    // Display response headers
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

// Request Tab switching logic
requestTabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button, requestTabButtons, requestTabPanels);
  });
});

// Response Tab switching logic
responseTabButtons.forEach(button => {
  button.addEventListener("click", () => {
    switchTab(button, responseTabButtons, responseTabPanels);
  });
});

// "New Request" button click
newRequestBtn.addEventListener("click", () => {
    saveCurrentRequest(); // Save the current request before creating a new one
    resetRequestEditor(); // Clear the editor for a new request
});

// Sidebar toggle logic
toggleSidebarBtn.addEventListener("click", () => {
  isSidebarCollapsed = !isSidebarCollapsed; // Toggle the state
  mainContainer.classList.toggle("sidebar-collapsed", isSidebarCollapsed); // Add/remove class based on state
  saveStateToVsCode(); // Persist the sidebar collapse state
});

// "Clear Response" button click
clearResponseBtn.addEventListener("click", () => {
    resetResponseDisplay(); // Simply call the existing function to clear the response area
});

// Add Parameter button click
addParamBtn.addEventListener('click', () => {
    addParamRow();
    saveCurrentRequest(); // Save state after adding a new param row
});

// Auth type select change listener
authTypeSelect.addEventListener('change', updateAuthUI);
bearerTokenInput.addEventListener('input', saveCurrentRequest); // Auto-save token input

// Auto-save on main input changes
requestNameInput.addEventListener('input', saveCurrentRequest);
methodSelectEl.addEventListener('change', saveCurrentRequest);
urlInputEl.addEventListener('input', saveCurrentRequest);
requestHeadersEl.addEventListener('input', saveCurrentRequest);
requestBodyEl.addEventListener('input', saveCurrentRequest);

// Environment variables input change listener
environmentVariablesEl.addEventListener('input', parseEnvironmentVariables);

// Format JSON Buttons
formatHeadersBtn.addEventListener('click', () => formatJsonInput(requestHeadersEl));
formatBodyBtn.addEventListener('click', () => formatJsonInput(requestBodyEl));

// Copy to Clipboard Buttons (now passing the button element itself)
copyUrlBtn.addEventListener('click', (e) => copyToClipboard(urlInputEl.value, e.currentTarget, "URL copied!"));
copyHeadersBtn.addEventListener('click', (e) => copyToClipboard(requestHeadersEl.value, e.currentTarget, "Request Headers copied!"));
copyBodyBtn.addEventListener('click', (e) => copyToClipboard(requestBodyEl.value, e.currentTarget, "Request Body copied!"));
copyResponseBodyBtn.addEventListener('click', (e) => copyToClipboard(responseOutputEl.textContent, e.currentTarget, "Response Body copied!"));
copyResponseHeadersBtn.addEventListener('click', (e) => copyToClipboard(responseHeadersOutputEl.textContent, e.currentTarget, "Response Headers copied!"));


// --------------------
// Initialization
// --------------------

/**
 * Initializes the webview panel when it's loaded/reloaded.
 * It attempts to restore the previous state from VS Code's state.
 */
const restoredState = vscode.getState();
if (restoredState) {
    if (restoredState.requests && restoredState.requests.length > 0) {
        savedRequests = restoredState.requests;
        activeRequestIndex = restoredState.activeIndex;
        // Load the active request if it exists and is valid
        if (activeRequestIndex !== null && savedRequests[activeRequestIndex]) {
            loadRequest(activeRequestIndex);
        } else if (savedRequests.length > 0) {
            // If activeIndex is invalid but there are requests, load the first one
            activeRequestIndex = 0;
            loadRequest(0);
        } else {
            // No requests found in restored state, start fresh
            resetRequestEditor();
        }
    } else {
        // If no requests were saved, start with a fresh editor
        resetRequestEditor();
    }
    
    // Restore environment variables
    environmentVariablesEl.value = restoredState.environmentVars || '{}';
    parseEnvironmentVariables(); // Parse them immediately

    // Apply the saved sidebar collapse state
    isSidebarCollapsed = restoredState.isSidebarCollapsed || false; // Default to false if not found
    mainContainer.classList.toggle("sidebar-collapsed", isSidebarCollapsed);

} else {
    // If no saved state at all (first time opening), start fresh
    resetRequestEditor();
    environmentVariablesEl.value = '{}'; // Initialize empty env vars
    parseEnvironmentVariables();
}

// Ensure at least one empty param row is present on load if paramsContainer is empty
if (paramsContainer.children.length === 0) {
    addParamRow();
}

// Initial render of the request list when the panel loads
renderRequestList();