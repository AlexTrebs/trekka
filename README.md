<h1 align="center">
Trekka
</h1>
<h1 align="center">
  <img width="300px" src="https://raw.githubusercontent.com/AlexTrebs/trekka/refs/heads/main/static/trekka-icon.png" />
</h1>

Trekka is an interactive photo map web application built with SvelteKit, MapLibre GL, and multiple backend sources (Google Drive API or Trekka API).

Users can explore geotagged photos and videos on a 3D globe, view media details, and navigate between images in a responsive sidebar popup.

## Features

* **Interactive 3D Globe**: Pan, zoom, and rotate a globe with MapLibre GL
* **Photo & Video Support**: Displays geotagged photos and videos as clickable markers
* **Media Popup**: Sidebar popup showing image/video, timestamp, reverse-geocoded location, and navigation
* **Navigation Controls**: "Show Most Recent" button and Previous/Next navigation between media
* **Dynamic Sunlight**: Real-time sun position and lighting effects based on UTC time and day of year
* **Country Borders**: Political boundaries displayed when zoomed in (zoom level > 1.5)
* **Starfield Background**: Animated starfield behind the globe for enhanced visual appeal
* **JWT Authentication**: Secure session tokens with 24-hour expiration
* **Multiple Backends**: Support for Google Drive API or Trekka API photo sources
* **HEIC Conversion**: Automatic conversion of HEIC images to JPEG for browser compatibility
* **Performance Optimized**: Client-side image loading with Firebase signed URLs, LRU caching
* **Reverse Geocoding**: Human-readable location names from coordinates
* **Responsive Design**: Works on both desktop and mobile devices
* **Accessible**: ARIA labels, keyboard-friendly buttons, and focusable interactive elements

## Technologies

* **SvelteKit**: Full-stack framework
* **MapLibre GL**: Interactive 3D globe and mapping
* **TypeScript**: Type-safe development
* **Google Drive API**: Photo source backend option
* **Trekka API**: Alternative photo source backend
* **jose**: JWT authentication
* **heic-convert**: HEIC to JPEG conversion
* **quick-lru**: LRU caching for images and signed URLs
* **Vitest**: Unit testing

## Environment Variables

Create a `.env` file in the root (see `.env.example` for template):

### Required for All Configurations

```env
# JWT Secret for session tokens (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-random-string

# Photo source: "drive" or "trekka"
API_SOURCE=drive
```

### Option A: Google Drive Backend

```env
API_SOURCE=drive
GOOGLE_FOLDER_ID=your-google-drive-folder-id
GOOGLE_API_KEY=your-google-drive-api-key
```

### Option B: Trekka API Backend

```env
API_SOURCE=trekka
TREKKA_API_URL=https://your-trekka-api.com
TREKKA_API_KEY=your-trekka-api-key
```

## Installation

1. Clone the repo:
```bash
git clone <repo-url>
cd trekka
```

2. Install dependencies:
```bash
pnpm install
```

Run the server:
```bash
pnpm dev
```

Open your browser at http://localhost:5173.

## Scripts

* `pnpm dev` – Run development server
* `pnpm build` – Build production app
* `pnpm preview` – Preview production build
* `pnpm prod` – Run production Node server
* `pnpm test` – Run tests with Vitest
* `pnpm test:ui` – Run tests with interactive UI
* `pnpm test:coverage` – Run tests with coverage report

## Backend Integration

The app supports two photo source backends:

### Google Drive Backend

Reads geotagged images/videos from a Google Drive folder using API key authentication:
* Fetches photo metadata via Drive API
* Serves images through server proxy with automatic HEIC to JPEG conversion
* Caches up to 200 images for 24 hours
* Performs reverse geocoding to get location names

### Trekka API Backend

Connects to a Trekka API server for photo management:
* Fetches pre-processed photo metadata with coordinates and locations
* Uses Firebase signed URLs for direct client-side image loading (faster, lower server costs)
* Caches signed URLs for 14 minutes
* No server proxy needed for image delivery

Both backends provide:
* Photo/video ID
* File name and MIME type
* Capture timestamp
* GPS coordinates [longitude, latitude]
* Human-readable location (city, country)
