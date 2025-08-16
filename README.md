# Repo Health Assistant - API Client (Postman-like)

This VS Code extension provides a **Postman-like API client** inside VS Code.  
You can send HTTP requests (GET, POST, PUT, DELETE, etc.), add headers, and view responses directly within the editor — without leaving VS Code.

---

## 🚀 Features

- Send **HTTP requests** (GET, POST, PUT, DELETE, PATCH, etc.)
- Add custom **headers** and **body** (JSON/text)
- See **response status code**
- Pretty-printed JSON response
- Works directly in VS Code sidebar

---

## 📦 Installation

1. Clone this repository or download the extension.
2. Open the folder in **VS Code**.
3. Run the extension:
   - Press `F5` → Opens a new VS Code window with the extension loaded.
4. (Optional) Package & install:
   - Run:  
     ```bash
     vsce package
     ```
   - Then install `.vsix` file in VS Code.

---

## 🛠️ How to Use

1. Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Search for **"Open API Client"** and press enter.
3. The panel will open in VS Code with:
   - **Method Selector** → Choose GET, POST, etc.
   - **URL Input** → Enter your API endpoint.
   - **Headers** → Provide headers in JSON format. Example:
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer <token>"
     }
     ```
   - **Body** → Enter raw JSON/text if required by request.
4. Click **Send Request**.
5. View:
   - **Status** → Response status code (200, 404, etc.)
   - **Response Body** → Pretty-printed JSON or raw text.

---

## 📖 Example Usage

### GET request:
- Method: `GET`
- URL: `https://jsonplaceholder.typicode.com/posts/1`
- Headers: `{}` (leave empty)
- Body: (leave empty)

### POST request:
- Method: `POST`
- URL: `https://jsonplaceholder.typicode.com/posts`
- Headers:
  ```json
  {
    "Content-Type": "application/json"
  }
