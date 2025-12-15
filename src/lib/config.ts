/**
 * Application Configuration Constants
 *
 * This file contains all configurable constants used throughout the application.
 * Modify these values to tune application behavior without changing component code.
 */

// Image Caching
export const IMAGE_CACHE_SIZE = 200; // Maximum number of images to cache in memory
export const IMAGE_CACHE_TTL_MS = 24 * 3600 * 1000; // 1 day cache TTL
export const IMAGE_CACHE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour cleanup

// Image Processing
export const HEIC_CONVERSION_QUALITY = 0.9; // JPEG quality for HEIC conversion (0-1)

// Map Configuration
export const COUNTRY_BORDER_ZOOM_THRESHOLD = 1.5; // Zoom level to load country borders
export const MAP_CAMERA_ANIMATION_DURATION_MS = 1200; // Duration for map animations
export const MAP_INITIAL_ZOOM = 0.7; // Initial zoom level

// Sun Position Updates
export const SUN_UPDATE_INTERVAL_MS = 60_000; // Update sun position every 60 seconds

// Starfield
export const STARFIELD_STAR_COUNT = 200; // Number of stars in background

// Reverse Geocoding
export const NOMINATIM_RATE_LIMIT_MS = 1000; // OSM Nominatim: 1 request per second
export const GEOCODE_CACHE_PRECISION = 4; // Decimal places for coordinate caching

// API Retry Configuration
export const API_MAX_RETRIES = 3; // Maximum number of retry attempts
export const API_RETRY_BASE_DELAY_MS = 1000; // Base delay for exponential backoff
export const API_RETRY_MAX_DELAY_MS = 10000; // Maximum retry delay
