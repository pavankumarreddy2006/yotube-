"""Generate a YouTube OAuth refresh token using InstalledAppFlow.

Install required packages:
    pip install google-auth google-auth-oauthlib google-auth-httplib2

Create client_secret.json:
    1. Open https://console.cloud.google.com/
    2. Create or select a project.
    3. Enable the YouTube Data API v3.
    4. Go to Credentials and create OAuth 2.0 Client ID.
    5. Choose Application type: Desktop app.
    6. Download the JSON file and save it as client_secret.json in this folder.

Run the script:
    python generate_youtube_refresh_token.py

The script will open a browser for login and print only the refresh token.
"""

import os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CLIENT_SECRETS_FILE = "client_secret.json"


def find_similar_secret_files(files):
    """Find files with a name similar to client_secret.json."""
    return [f for f in files if f.lower().startswith("client_secret")]


def main():
    """Run the OAuth flow and print the refresh token."""
    try:
        # Get the current folder path and list the files that are actually present.
        current_dir = os.getcwd()
        current_files = os.listdir(current_dir)
        if CLIENT_SECRETS_FILE not in current_files:
            similar = find_similar_secret_files(current_files)
            if similar:
                raise FileNotFoundError(
                    "client_secret.json not found in the current directory. "
                    f"Found files: {similar}. "
                    "Rename the file to client_secret.json and remove any .txt extension."
                )
            raise FileNotFoundError(
                "client_secret.json not found in the current directory. "
                f"Current directory: {current_dir}\n"
                f"Files found: {current_files}\n"
                "Place client_secret.json in the same folder as this script."
            )

        # Load OAuth client configuration from client_secret.json.
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)

        # Run the local server flow. This opens the browser automatically.
        credentials = flow.run_local_server(port=0)

        refresh_token = credentials.refresh_token
        if not refresh_token:
            raise ValueError(
                "No refresh token was returned. "
                "This can happen if the app was already authorized without offline access. "
                "Try deleting any old local credentials and re-running the script."
            )

        print(refresh_token)

    except FileNotFoundError as error:
        print(f"Error: {error}")
    except ValueError as error:
        print(f"Error: {error}")
    except Exception as error:
        print(f"Error: {error}")


if __name__ == "__main__":
    main()
