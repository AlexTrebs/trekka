import { google } from "googleapis";
import { GOOGLE_API_KEY } from "$env/static/private";

/**
 * Create a Google Drive v3 client configured with the module's API key.
 *
 * This client is suitable for accessing public or API-key-accessible files; replace with OAuth2 credentials to access private files.
 *
 * @returns A Drive v3 client configured to authenticate using the module's API key
 */
function initDrive() {
  return google.drive({
    version: "v3",
    auth: GOOGLE_API_KEY,
  });
}

export const drive = initDrive();