import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('api-tester.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'apiTester',
      'API Tester',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true // 🚀 Keep state when switching files
      }
    );

    panel.webview.html = getWebviewContent();

    // Listen for requests from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'sendRequest') {
        try {
          const res = await fetch(message.url, {
            method: message.method,
            headers: JSON.parse(message.headers || '{}'),
            body: message.method !== 'GET' ? message.body : undefined,
          });

          const text = await res.text();
          panel.webview.postMessage({
            command: 'response',
            id: message.id,
            status: res.status,
            body: text
          });
        } catch (err: any) {
          panel.webview.postMessage({
            command: 'response',
            id: message.id,
            status: 'Error',
            body: err.message
          });
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: sans-serif;
      padding: 15px;
      background: #1e1e1e;
      color: #eee;
    }
    h2 {
      color: #4ade80;
    }
    .request-card {
      background: #2d2d2d;
      border: 1px solid #444;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
    }
    input, select, textarea {
      width: 100%;
      margin: 6px 0;
      padding: 8px;
      border: 1px solid #555;
      border-radius: 6px;
      background: #1e1e1e;
      color: #eee;
    }
    button {
      padding: 6px 12px;
      margin: 6px 4px 0 0;
      background: #2563eb;
      color: white;
      border: none;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.2s;
    }
    button:hover { background: #1e40af; }
    .delete-btn {
      background: #dc2626;
    }
    .delete-btn:hover {
      background: #b91c1c;
    }
    pre {
      background: #111;
      color: #0f0;
      padding: 10px;
      overflow-x: auto;
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <h2>API Tester</h2>
  <div id="requests"></div>
  <button onclick="addRequest()">+ Add Request</button>

  <script>
    const vscode = acquireVsCodeApi();
    let counter = 0;

    // Restore state if available
    const oldState = vscode.getState();
    if (oldState && oldState.requests) {
      oldState.requests.forEach(req => addRequest(req));
    } else {
      addRequest(); // add one empty card by default
    }

    function addRequest(prefill = {}) {
      const id = counter++;
      const container = document.createElement('div');
      container.className = 'request-card';
      container.id = 'card-' + id;
      container.innerHTML = \`
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="method-\${id}">
            <option \${prefill.method==='GET'?'selected':''}>GET</option>
            <option \${prefill.method==='POST'?'selected':''}>POST</option>
            <option \${prefill.method==='PUT'?'selected':''}>PUT</option>
            <option \${prefill.method==='DELETE'?'selected':''}>DELETE</option>
          </select>
          <input id="url-\${id}" placeholder="Enter API URL (http://...)" value="\${prefill.url||''}" />
          <button onclick="sendRequest(\${id})">Send</button>
          <button class="delete-btn" onclick="deleteRequest(\${id})">Delete</button>
        </div>
        <textarea id="headers-\${id}" placeholder='{"Content-Type":"application/json"}'>\${prefill.headers||''}</textarea>
        <textarea id="body-\${id}" placeholder='{"key":"value"}'>\${prefill.body||''}</textarea>
        <h4>Response:</h4>
        <pre id="response-\${id}">\${prefill.response||''}</pre>
      \`;
      document.getElementById('requests').appendChild(container);

      // Save state whenever inputs change
      container.querySelectorAll("input, textarea, select")
        .forEach(el => el.addEventListener("input", saveState));
    }

    function sendRequest(id) {
      vscode.postMessage({
        command: 'sendRequest',
        id,
        method: document.getElementById('method-' + id).value,
        url: document.getElementById('url-' + id).value,
        headers: document.getElementById('headers-' + id).value,
        body: document.getElementById('body-' + id).value,
      });
      saveState();
    }

    function deleteRequest(id) {
      const card = document.getElementById('card-' + id);
      if (card) card.remove();
      saveState();
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'response') {
        try {
          const pretty = JSON.stringify(JSON.parse(msg.body), null, 2);
          document.getElementById('response-' + msg.id).innerText =
            "Status: " + msg.status + "\\n\\n" + pretty;
        } catch(e) {
          document.getElementById('response-' + msg.id).innerText =
            "Status: " + msg.status + "\\n\\n" + msg.body;
        }
        saveState();
      }
    });

    function saveState() {
      const requests = [];
      document.querySelectorAll(".request-card").forEach(card => {
        const id = card.id.replace("card-","");
        requests.push({
          method: document.getElementById("method-" + id).value,
          url: document.getElementById("url-" + id).value,
          headers: document.getElementById("headers-" + id).value,
          body: document.getElementById("body-" + id).value,
          response: document.getElementById("response-" + id).innerText
        });
      });
      vscode.setState({ requests });
    }
  </script>
</body>
</html>`;
}
