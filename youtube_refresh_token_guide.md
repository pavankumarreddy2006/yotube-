# Fix: client_secret.json not found in current directory

This guide helps beginners fix the error `client_secret.json not found in the current directory`.

## 1. How to correctly create `client_secret.json`

1. Open https://console.cloud.google.com/
2. Select or create a project.
3. Enable the **YouTube Data API v3**.
4. Go to **APIs & Services > Credentials**.
5. Click **Create Credentials > OAuth client ID**.
6. Choose **Application type: Desktop app**.
7. Download the JSON file.
8. Save it as `client_secret.json`.

## 2. Exact JSON structure required for YouTube OAuth

The file should look exactly like this:

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "YOUR_PROJECT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": [
      "http://localhost"
    ]
  }
}
```

> The file name must be exactly `client_secret.json`.

## 3. Save the file in Windows using Notepad without `.txt`

1. Open Notepad.
2. Paste the JSON content.
3. Click **File > Save As**.
4. In the **File name** box, type: `client_secret.json`
5. In the **Save as type** dropdown, choose **All Files**.
6. Click **Save**.

This prevents Windows from saving it as `client_secret.json.txt`.

## 4. Enable file extensions in Windows to verify the file name

1. Open File Explorer.
2. Go to the **View** tab.
3. Check **File name extensions**.
4. Make sure the file is not shown as `client_secret.json.txt`.

## 5. Exact folder path where the file must be placed

Place `client_secret.json` in the same folder as the script file.

For this project, the correct path is:

```text
C:\Users\pavan\OneDrive\Documents\projects\youtube automation\client_secret.json
```

## 6. Example folder structure showing correct placement

```
youtube automation/
├── client_secret.json
├── generate_youtube_refresh_token.py
├── .env
├── README.md
└── youtube_refresh_token_guide.md
```

## 7. Verify the file exists using terminal command `dir`

Open PowerShell or Command Prompt and run:

```powershell
cd "C:\Users\pavan\OneDrive\Documents\projects\youtube automation"
dir
```

Look for `client_secret.json` in the output.

## 8. Python code to check current directory using `os.getcwd()` and `os.listdir()`

Create a simple verification script:

```python
import os

print("Current directory:", os.getcwd())
print("Files in current directory:")
for name in os.listdir('.'):
    print(" -", name)
```

If `client_secret.json` is not listed, move it into the folder shown by `os.getcwd()`.

## 9. Common mistakes and how to fix them

- `client_secret.json` saved as `client_secret.json.txt`
  - Fix: enable file extensions and rename to `client_secret.json`.
- Wrong folder
  - Fix: move `client_secret.json` to `C:\Users\pavan\OneDrive\Documents\projects\youtube automation`.
- Duplicate names like `client_secret (1).json`
  - Fix: rename it exactly to `client_secret.json`.

## 10. Python script to generate the refresh token with error handling

Use this file as `generate_youtube_refresh_token.py`:

```python
"""Generate a YouTube OAuth refresh token using InstalledAppFlow."""

import os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CLIENT_SECRETS_FILE = "client_secret.json"


def find_similar_secret_files(files):
    return [f for f in files if f.lower().startswith("client_secret")]


def main():
    current_dir = os.getcwd()
    current_files = os.listdir(current_dir)

    if CLIENT_SECRETS_FILE not in current_files:
        similar = find_similar_secret_files(current_files)
        print("Error: client_secret.json not found in the current directory.")
        print(f"Current directory: {current_dir}")
        print(f"Files found: {current_files}")
        if similar:
            print(f"Similar files found: {similar}")
            print("Rename the file to client_secret.json and remove any .txt extension.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
    credentials = flow.run_local_server(port=0)

    refresh_token = credentials.refresh_token
    if not refresh_token:
        print("Error: no refresh token was returned.")
        print("Try deleting old local credentials and rerunning the script.")
        return

    print(refresh_token)


if __name__ == "__main__":
    main()
```

## 11. Step to rerun the script after fixing

After fixing the file and folder, run:

```powershell
python generate_youtube_refresh_token.py
```

The browser should open, and after login the script will print the refresh token.
