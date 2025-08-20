import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("api-tester.open", () => {
    const panel = vscode.window.createWebviewPanel(
      "apiTester",
      "API Tester",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "media"))],
      }
    );

    const mediaPath = path.join(context.extensionPath, "media");

    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaPath, "style.css"))
    );

    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaPath, "panel.js"))
    );

    let htmlContent = fs.readFileSync(path.join(mediaPath, "index.html"), "utf8");

    htmlContent = htmlContent
      .replace(/href="style.css"/g, `href="${styleUri}"`)
      .replace(/src="panel.js"/g, `src="${scriptUri}"`);

    panel.webview.html = htmlContent;

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "sendRequest") {
        try {
          const startTime = Date.now();

          let headersToSend: { [key: string]: string } = {};
          try {
            const parsedHeaders = JSON.parse(message.headers || "{}");
            for (const key in parsedHeaders) {
              if (Object.prototype.hasOwnProperty.call(parsedHeaders, key)) {
                headersToSend[key] = String(parsedHeaders[key]);
              }
            }
          } catch (e) {
            vscode.window.showWarningMessage(
              "Invalid Headers JSON. Using default 'Content-Type: application/json'."
            );
            headersToSend = { "Content-Type": "application/json" };
          }

          if (
            (message.method === "POST" ||
              message.method === "PUT" ||
              message.method === "PATCH") &&
            !headersToSend["Content-Type"]
          ) {
            headersToSend["Content-Type"] = "application/json";
          }

          let bodyToSend: string | undefined = undefined;
          if (message.method !== "GET" && message.method !== "HEAD") {
            try {
              bodyToSend = JSON.stringify(JSON.parse(message.body || "{}"));
            } catch {
              bodyToSend = message.body;
            }
          }

          const response = await fetch(message.url, {
            method: message.method,
            headers: headersToSend,
            body: bodyToSend,
          });

          const endTime = Date.now();
          const elapsedTime = endTime - startTime;

          const text = await response.text();
          let formattedText = text;
          try {
            formattedText = JSON.stringify(JSON.parse(text), null, 2);
          } catch (e) {}

          const responseHeaders: { [key: string]: string } = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          panel.webview.postMessage({
            command: "response",
            status: response.status,
            statusText: response.statusText,
            time: elapsedTime,
            body: formattedText,
            ok: response.ok,
            headers: responseHeaders,
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(`API Request Error: ${error.message}`);
          panel.webview.postMessage({
            command: "response",
            status: 0,
            statusText: `Error: ${error.message}`,
            time: 0,
            body: "Could not connect to the server or invalid URL. Check console for more details.",
            ok: false,
            headers: {},
          });
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
