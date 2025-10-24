import { google } from "googleapis";
import { GOOGLE_API_KEY } from "$env/static/private";

/**
 * Initialize a Drive v3 client using your API key.
 * You can swap this out for OAuth2 credentials if you need private files.
 */
export function initDrive() {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not set. Add it to your environment.");
  }
  return google.drive({
    version: "v3",
    auth: GOOGLE_API_KEY,
  });
}

export const drive = initDrive();
