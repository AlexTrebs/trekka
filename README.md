# Trekka

Trekka is an interactive photo map web application built with SvelteKit, MapLibre GL, and Google Drive API. 

Users can explore geotagged photos on a 3D globe, view photo details, and navigate between images in a responsive sidebar popup.

## Features

* Interactive 3D Globe: Pan, zoom, and rotate a globe with MapLibre GL.
* Photo Markers: Geo-tagged photos are displayed as clickable markers.
* Photo Popup: Sidebar popup showing photo, timestamp, location, and navigation buttons.
* Next/Previous Navigation: Navigate between photos directly from the sidebar.
* Dynamic Sunlight: Real-time sun position and lighting effects on the globe.
* Starfield Background: Animated starfield behind the globe for enhanced visual appeal.
* Responsive Design: Works on both desktop and mobile devices.
* Accessible: ARIA labels, keyboard-friendly buttons, and focusable interactive elements.

## Technologies

* SvelteKit
* Maplibre GL
* Google Drive API
* TypeScript

## Environment Variables

Create a .env file in the root:
```.env
GOOGLE_FOLDER_ID=<your-google-drive-folder-id>
GOOGLE_API_KEY=<google-drive-api-key>
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
pnpm start
```

Open your browser at http://localhost:5173.

## Scripts

* `pnpm dev` – Run development server
* `pnpm build` – Build production app
* `pnpm preview` – Preview production build
* 