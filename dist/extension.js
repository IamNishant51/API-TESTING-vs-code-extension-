/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(2));
const fs = __importStar(__webpack_require__(3));
function activate(context) {
    const disposable = vscode.commands.registerCommand("api-tester.open", () => {
        const panel = vscode.window.createWebviewPanel("apiTester", // Identifies the type of the webview
        "API Tester", // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in.
        {
            enableScripts: true, // Enable JavaScript in the webview
            retainContextWhenHidden: true, // Keep the state of the webview even when it's hidden
            // And restrict the webview to only loading resources from our extension's media directory.
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "media"))],
        });
        // Get the path to the media directory
        const mediaPath = path.join(context.extensionPath, "media");
        // Get the URI for the webview's stylesheet
        const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, "style.css")));
        // Get the URI for the webview's JavaScript file
        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, "panel.js")));
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
                    let headersToSend = {};
                    try {
                        // Attempt to parse headers, if invalid, default to JSON
                        const parsedHeaders = JSON.parse(message.headers);
                        // Ensure all header values are strings
                        for (const key in parsedHeaders) {
                            if (Object.prototype.hasOwnProperty.call(parsedHeaders, key)) {
                                headersToSend[key] = String(parsedHeaders[key]);
                            }
                        }
                    }
                    catch (e) {
                        vscode.window.showWarningMessage("Invalid Headers JSON. Using default 'Content-Type: application/json'.");
                        headersToSend = { "Content-Type": "application/json" };
                    }
                    const response = await fetch(message.url, {
                        method: message.method,
                        headers: headersToSend,
                        body: message.method !== "GET" && message.method !== "HEAD"
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
                    }
                    catch (e) {
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
                }
                catch (error) {
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
            }
            else if (message.command === "saveState") {
                // You could add logic here to save state more persistently if needed
                // For now, webview's localStorage is used, and vscode.setState is handled within webview
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("fs");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map