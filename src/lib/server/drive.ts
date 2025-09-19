// src/lib/server/drive.ts
import { google } from 'googleapis';
import { GOOGLE_API_KEY } from '$env/static/private';

/**
 * Initialize a Drive v3 client using your API key.
 * You can swap this out for OAuth2 credentials if you need private files.
 */
export function initDrive() {
  return google.drive({
    version: 'v3',
    auth: GOOGLE_API_KEY
  });
}
