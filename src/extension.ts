import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("api-tester.open", () => {
    const panel = vscode.window.createWebviewPanel(
      "apiTester", // Identifies the type of the webview
      "API Tester", // Title of the panel displayed to the user
      vscode.ViewColumn.One, // Editor column to show the new webview panel in.
      {
        enableScripts: true, // Enable JavaScript in the webview
        retainContextWhenHidden: true, // Keep the state of the webview even when it's hidden
        // And restrict the webview to only loading resources from our extension's media directory.
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "media"))],
      }
    );

    // Get the path to the media directory
    const mediaPath = path.join(context.extensionPath, "media");

    // Get the URI for the webview's stylesheet
    const styleUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaPath, "style.css"))
    );

    // Get the URI for the webview's JavaScript file
    const scriptUri = panel.webview.asWebviewUri(
      vscode.Uri.file(path.join(mediaPath, "panel.js"))
    );

    // Read the HTML content from the index.html file
    let htmlContent = fs.readFileSync(path.join(mediaPath, "index.html"), "utf8");

    // Replace placeholders with actual URIs
    htmlContent = htmlContent
      .replace(/href="style.css"/g, `href="${styleUri}"`)
      .replace(/src="panel.js"/g, `src="${scriptUri}"`);

    panel.webview.html = htmlContent;

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "sendRequest") {
        try {
          const startTime = Date.now();

          let headersToSend: { [key: string]: string } = {};
          try {
            // Attempt to parse headers, if invalid, default to JSON
            const parsedHeaders = JSON.parse(message.headers);
            // Ensure all header values are strings
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

          const response = await fetch(message.url, {
            method: message.method,
            headers: headersToSend,
            body:
              message.method !== "GET" && message.method !== "HEAD"
                ? message.body
                : undefined,
          });

          const endTime = Date.now();
          const elapsedTime = endTime - startTime;

          const text = await response.text();
          let formattedText = text;
          try {
            // Attempt to pretty-print JSON response
            formattedText = JSON.stringify(JSON.parse(text), null, 2);
          } catch (e) {
            // Not JSON, keep as plain text
          }

          // Send response back to the webview
          panel.webview.postMessage({
            command: "response", // Match the command name expected by panel.js
            status: response.status,
            statusText: response.statusText,
            time: elapsedTime,
            body: formattedText,
            ok: response.ok, // Pass whether the request was successful (2xx status)
          });
        } catch (error: any) {
          vscode.window.showErrorMessage(`API Request Error: ${error.message}`);
          // Send error response back to the webview
          panel.webview.postMessage({
            command: "response",
            status: 0,
            statusText: `Error: ${error.message}`,
            time: 0,
            body: "Could not connect to the server or invalid URL. Check console for more details.",
            ok: false,
          });
        }
      } else if (message.command === "saveState") {
          // You could add logic here to save state more persistently if needed
          // For now, webview's localStorage is used, and vscode.setState is handled within webview
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}