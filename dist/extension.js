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
        const panel = vscode.window.createWebviewPanel("apiTester", "API Tester", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, "media"))],
        });
        const mediaPath = path.join(context.extensionPath, "media");
        const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, "style.css")));
        const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath, "panel.js")));
        let htmlContent = fs.readFileSync(path.join(mediaPath, "index.html"), "utf8");
        htmlContent = htmlContent
            .replace(/href="style.css"/g, `href="${styleUri}"`)
            .replace(/src="panel.js"/g, `src="${scriptUri}"`);
        panel.webview.html = htmlContent;
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === "sendRequest") {
                try {
                    const startTime = Date.now();
                    let headersToSend = {};
                    try {
                        const parsedHeaders = JSON.parse(message.headers || "{}");
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
                    // 🔹 Ensure Content-Type if body is present
                    if ((message.method === "POST" ||
                        message.method === "PUT" ||
                        message.method === "PATCH") &&
                        !headersToSend["Content-Type"]) {
                        headersToSend["Content-Type"] = "application/json";
                    }
                    let bodyToSend = undefined;
                    if (message.method !== "GET" && message.method !== "HEAD") {
                        try {
                            bodyToSend = JSON.stringify(JSON.parse(message.body || "{}"));
                        }
                        catch {
                            // send raw text if not JSON
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
                    }
                    catch (e) { }
                    const responseHeaders = {};
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
                }
                catch (error) {
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