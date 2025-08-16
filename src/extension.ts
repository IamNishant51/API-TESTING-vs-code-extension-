import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("api-tester.open", () => {
    const panel = vscode.window.createWebviewPanel(
      "apiTester",
      "API Tester",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "sendRequest") {
        try {
          const response = await fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body:
              message.method !== "GET" && message.method !== "HEAD"
                ? message.body
                : undefined,
          });

          const text = await response.text();
          let formatted = text;
          try {
            formatted = JSON.stringify(JSON.parse(text), null, 2);
          } catch (e) {}

          panel.webview.postMessage({
            command: "showResponse",
            response: formatted,
          });
        } catch (err: any) {
          panel.webview.postMessage({
            command: "showResponse",
            response: `Error: ${err.message}`,
          });
        }
      } else if (message.command === "clearResponse") {
        panel.webview.postMessage({
          command: "showResponse",
          response: "Response cleared.",
        });
      }
    });
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return /*html*/ `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: sans-serif;
          margin: 0;
          background: #1e1e1e;
          color: #ddd;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        header {
          background: #202123;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        select, input, textarea, button {
          border-radius: 4px;
          border: none;
          padding: 6px;
          font-size: 14px;
        }
        select, input {
          background: #2d2f31;
          color: #eee;
        }
        textarea {
          background: #2d2f31;
          color: #eee;
          resize: vertical;
        }
        button {
          background: #f26b38;
          color: white;
          cursor: pointer;
        }
        button:hover {
          opacity: 0.9;
        }
        .tabs {
          display: flex;
          background: #2a2c2e;
          padding: 5px;
          overflow-x: auto;
        }
        .tab {
          padding: 6px 12px;
          margin-right: 6px;
          background: #3a3d3f;
          color: white;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tab.active {
          background: #f26b38;
        }
        .tab button {
          background: transparent;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 12px;
        }
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 10px;
          background: #1e1e1e;
          overflow: auto;
        }
        .response {
          margin-top: 10px;
          background: #252728;
          padding: 10px;
          border-radius: 4px;
          white-space: pre-wrap;
          color: #a9dc76;
          font-family: monospace;
        }
        .sub-tabs {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }
        .sub-tab {
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 4px;
          background: #333;
          color: #aaa;
        }
        .sub-tab.active {
          background: #f26b38;
          color: white;
        }
        .hidden {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="tabs" id="tabs"></div>
      <header>
        <select id="method">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
        <input type="text" id="url" placeholder="Enter request URL..." style="flex:1"/>
        <button id="send">Send</button>
        <button id="clear">Clear Response</button>
        <button id="newTab">+ Tab</button>
      </header>
      <div class="content">
        <div class="sub-tabs">
          <div class="sub-tab active" data-tab="body">Body</div>
          <div class="sub-tab" data-tab="headers">Headers</div>
        </div>
        <textarea id="body" rows="8" placeholder="Request Body (JSON)"></textarea>
        <textarea id="headers" class="hidden" rows="8" placeholder='{ "Content-Type": "application/json" }'></textarea>
        <div class="response" id="response">Response will appear here...</div>
      </div>
      <script>
        const vscode = acquireVsCodeApi();

        let tabs = [];
        let activeTab = null;

        function addTab() {
          const id = Date.now().toString();
          const state = { id, url: "", method: "GET", body: "", headers: "", response: "" };
          tabs.push(state);
          setActiveTab(id);
          renderTabs();
          loadState();
        }

        function removeTab(id) {
          tabs = tabs.filter(t => t.id !== id);
          if (activeTab === id && tabs.length > 0) {
            setActiveTab(tabs[0].id);
          } else if (tabs.length === 0) {
            addTab();
          }
          renderTabs();
          loadState();
        }

        function setActiveTab(id) {
          activeTab = id;
        }

        function renderTabs() {
          const tabsDiv = document.getElementById("tabs");
          tabsDiv.innerHTML = "";
          tabs.forEach(tab => {
            const el = document.createElement("div");
            el.className = "tab" + (tab.id === activeTab ? " active" : "");
            el.innerHTML = tab.url || "New Request";
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "x";
            closeBtn.onclick = (e) => {
              e.stopPropagation();
              removeTab(tab.id);
            };
            el.appendChild(closeBtn);
            el.onclick = () => {
              saveState();
              setActiveTab(tab.id);
              renderTabs();
              loadState();
            };
            tabsDiv.appendChild(el);
          });
        }

        function saveState() {
          const tab = tabs.find(t => t.id === activeTab);
          if (tab) {
            tab.url = document.getElementById("url").value;
            tab.method = document.getElementById("method").value;
            tab.body = document.getElementById("body").value;
            tab.headers = document.getElementById("headers").value;
            tab.response = document.getElementById("response").innerText;
          }
        }

        function loadState() {
          const tab = tabs.find(t => t.id === activeTab);
          if (tab) {
            document.getElementById("url").value = tab.url;
            document.getElementById("method").value = tab.method;
            document.getElementById("body").value = tab.body;
            document.getElementById("headers").value = tab.headers;
            document.getElementById("response").innerText = tab.response || "Response will appear here...";
          }
        }

        document.getElementById("send").onclick = () => {
          saveState();
          const tab = tabs.find(t => t.id === activeTab);
          vscode.postMessage({
            command: "sendRequest",
            url: tab.url,
            method: tab.method,
            headers: tab.headers ? JSON.parse(tab.headers) : {},
            body: tab.body,
          });
        };

        document.getElementById("clear").onclick = () => {
          const responseEl = document.getElementById("response");
          responseEl.innerText = "Response cleared.";
          const tab = tabs.find(t => t.id === activeTab);
          if (tab) tab.response = "";
          vscode.postMessage({ command: "clearResponse" });
        };

        document.getElementById("newTab").onclick = () => {
          saveState();
          addTab();
        };

        window.addEventListener("message", event => {
          const message = event.data;
          if (message.command === "showResponse") {
            const tab = tabs.find(t => t.id === activeTab);
            if (tab) {
              tab.response = message.response;
              document.getElementById("response").innerText = message.response;
            }
          }
        });

        document.querySelectorAll(".sub-tab").forEach(el => {
          el.onclick = () => {
            document.querySelectorAll(".sub-tab").forEach(st => st.classList.remove("active"));
            el.classList.add("active");
            const target = el.dataset.tab;
            document.getElementById("body").classList.add("hidden");
            document.getElementById("headers").classList.add("hidden");
            document.getElementById(target).classList.remove("hidden");
          };
        });

        // Start with one tab
        addTab();
      </script>
    </body>
    </html>
  `;
}

export function deactivate() {}
