import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('api-tester.open', () => {
    const panel = vscode.window.createWebviewPanel(
      'apiTester',
      'API Tester',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    panel.webview.html = getWebviewContent();

    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'sendRequest') {
        try {
          const res = await fetch(msg.url, {
            method: msg.method,
            headers: JSON.parse(msg.headers || '{}'),
            body: msg.method !== 'GET' ? msg.body : undefined,
          });

          const text = await res.text();
          panel.webview.postMessage({ command: 'response', id: msg.id, status: res.status, body: text });
        } catch (err: any) {
          panel.webview.postMessage({ command: 'response', id: msg.id, status: 'Error', body: err.message });
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
  body { font-family: Arial, sans-serif; padding: 15px; background: #1e1e1e; color: #eee; }
  h2 { color: #4ade80; margin-bottom: 10px; }
  .request-card { background: #2d2d2d; padding: 12px; margin-bottom: 12px; border-radius: 6px; }
  input, select, textarea { width: 100%; margin: 6px 0; padding: 8px; border-radius: 4px; background: #1e1e1e; color: #eee; border: 1px solid #555; font-size: 14px; }
  button { padding: 6px 10px; margin-right: 6px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  button.send { background: #2563eb; color: white; }
  button.send:hover { background: #1e40af; }
  button.delete { background: #dc2626; color: white; }
  button.delete:hover { background: #b91c1c; }
  pre { background: #111; color: #0f0; padding: 10px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
  .controls { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
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
  addRequest(); // one card by default
}

function addRequest(prefill = {}) {
  const id = counter++;
  const container = document.createElement('div');
  container.className = 'request-card';
  container.id = 'card-' + id;
  container.innerHTML = \`
    <div class="controls">
      <select id="method-\${id}">
        <option \${prefill.method==='GET'?'selected':''}>GET</option>
        <option \${prefill.method==='POST'?'selected':''}>POST</option>
        <option \${prefill.method==='PUT'?'selected':''}>PUT</option>
        <option \${prefill.method==='DELETE'?'selected':''}>DELETE</option>
      </select>
      <input id="url-\${id}" placeholder="API URL" value="\${prefill.url||''}" />
      <button class="send" onclick="sendRequest(\${id})">Send</button>
      <button class="delete" onclick="deleteRequest(\${id})">Delete</button>
    </div>
    <textarea id="headers-\${id}" placeholder='Headers JSON'>{\${prefill.headers||'"Content-Type":"application/json"'}}\</textarea>
    <textarea id="body-\${id}" placeholder='Body JSON'>\${prefill.body||''}</textarea>
    <h4>Response:</h4>
    <pre id="response-\${id}">\${prefill.response||''}</pre>
  \`;
  document.getElementById('requests').appendChild(container);

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
    body: document.getElementById('body-' + id).value
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
    const pre = document.getElementById('response-' + msg.id);
    try {
      pre.innerText = "Status: " + msg.status + "\\n\\n" + JSON.stringify(JSON.parse(msg.body), null, 2);
    } catch {
      pre.innerText = "Status: " + msg.status + "\\n\\n" + msg.body;
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
