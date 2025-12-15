import {
  GOOGLE_API_KEY,
  GOOGLE_FOLDER_ID,
  API_SOURCE,
  TREKKA_API_URL,
  TREKKA_API_KEY,
  ADMIN_USER,
  ADMIN_PASS,
  JWT_SECRET
} from "$env/static/private";

export type ApiSource = "drive" | "trekka-api";

export interface EnvConfig {
  apiSource: ApiSource;
  googleApiKey?: string;
  googleFolderId?: string;
  trekkaApiUrl?: string;
  trekkaApiKey?: string;
  adminUser?: string;
  adminPass?: string;
  jwtSecret?: string;
}

function validateApiSource(source: string): ApiSource {
  if (source !== "drive" && source !== "trekka-api") {
    throw new Error(
      `Invalid API_SOURCE: "${source}". Must be "drive" or "trekka-api"`
    );
  }
  return source as ApiSource;
}

function validateEnv(): EnvConfig {
  const apiSource = validateApiSource(API_SOURCE);

  const config: EnvConfig = {
    apiSource,
    adminUser: ADMIN_USER,
    adminPass: ADMIN_PASS,
    jwtSecret: JWT_SECRET
  };

  // Validate Google Drive specific variables
  if (apiSource === "drive") {
    const missing: string[] = [];

    if (!GOOGLE_API_KEY) missing.push("GOOGLE_API_KEY");
    if (!GOOGLE_FOLDER_ID) missing.push("GOOGLE_FOLDER_ID");

    if (missing.length > 0) {
      throw new Error(
        `Missing required Google Drive environment variables: ${missing.join(", ")}\n` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }

    config.googleApiKey = GOOGLE_API_KEY;
    config.googleFolderId = GOOGLE_FOLDER_ID;
  }

  // Validate Trekka API specific variables
  if (apiSource === "trekka-api") {
    const missing: string[] = [];

    if (!TREKKA_API_URL) missing.push("TREKKA_API_URL");
    if (!TREKKA_API_KEY) missing.push("TREKKA_API_KEY");

    if (missing.length > 0) {
      throw new Error(
        `Missing required Trekka API environment variables: ${missing.join(", ")}\n` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }

    config.trekkaApiUrl = TREKKA_API_URL;
    config.trekkaApiKey = TREKKA_API_KEY;
  }

  return config;
}

// Validate environment on module load
let env: EnvConfig;

try {
  env = validateEnv();
  console.log(`[ENV] Using API source: ${env.apiSource}`);
} catch (error) {
  console.error("[ENV] Environment validation failed:");
  console.error(error);
  throw error;
}

export { env };
