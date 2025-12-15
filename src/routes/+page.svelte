<script lang="ts">
  import type { FeatureCollection, Point } from "geojson";
  import * as maplibregl from "maplibre-gl";

  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";

  import marker from "$lib/assets/marker.png";
  import Popup from "$lib/components/popup.svelte";
  import Starfield from "$lib/components/starfield.svelte";
  import type { PhotoProps } from "$lib/types/photo";
  import { calculateSunPosition } from "$lib/utils/sun-position";
  import {
    openMostRecentPhoto,
    navigateToPrevious,
    navigateToNext,
    preparePhotoOpen,
  } from "$lib/utils/photo-navigation";

  import {
    SUN_UPDATE_INTERVAL_MS,
    MAP_CAMERA_ANIMATION_DURATION_MS,
    COUNTRY_BORDER_ZOOM_THRESHOLD,
  } from "$lib/config";

  let selectedPhoto: PhotoProps | null = null;
  let selectedPhotoIndex: number | null = null;
  let photos: FeatureCollection<Point, PhotoProps>;
  let map: maplibregl.Map;
  let markerBitmap: ImageBitmap | null = null;

  let hasPrev = false;
  let hasNext = false;
  let lightRotation = 0;
  let sunRotation = 90;
  let sunInterval: number;

  /**
   * Updates the sun's position on the globe based on current UTC time and day of year.
   */
  function updateSunPosition() {
    const position = calculateSunPosition();
    sunRotation = position.sunRotation;
    lightRotation = position.lightRotation;

    if (map) {
      map.setLight({
        anchor: "map",
        position: [10, sunRotation, lightRotation],
      });
    }
  }

  /**
   * Opens a photo in the sidebar popup and animates the map to its location.
   *
   * @param photoId - The unique identifier of the photo to open
   */
  function openPhoto(photoId: string) {
    if (!photos) return;

    const result = preparePhotoOpen(photos, photoId);
    if (!result) return;

    selectedPhotoIndex = result.navigation.index;
    selectedPhoto = result.navigation.photo;
    hasNext = result.navigation.hasNext;
    hasPrev = result.navigation.hasPrev;

    map.easeTo({
      center: result.location,
      duration: MAP_CAMERA_ANIMATION_DURATION_MS,
    });
  }

  /**
   * Navigates to the previous photo (older images, higher index)
   */
  const onPrevPhoto = () =>
    navigateToPrevious(photos, selectedPhotoIndex!, openPhoto);

  /**
   * Navigates to the next photo (newer images, lower index)
   */
  const onNextPhoto = () =>
    navigateToNext(photos, selectedPhotoIndex!, openPhoto);

  /**
   * Opens the most recently taken photo
   */
  const openMostRecent = () => openMostRecentPhoto(photos, openPhoto);

  onMount(async () => {
    updateSunPosition();
    sunInterval = window.setInterval(updateSunPosition, SUN_UPDATE_INTERVAL_MS);

    const photoPromise = fetch("/api/photos").then((r) => r.json());

    map = new maplibregl.Map({
      container: "map",
      center: [0, 0],
      zoom: 1,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        projection: { type: "globe" },
        sources: {
          satellite: {
            type: "raster",
            tiles: [
              "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
            ],
          },
        },
        layers: [{ id: "Satellite", type: "raster", source: "satellite" }],
        light: { anchor: "map", position: [10, sunRotation, lightRotation] },
        sky: {
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.8,
            1,
            0.4,
            2,
            0.1,
            3,
            0,
          ],
        },
      },
    });

    map.once("load", async () => {
      // lazy-load photos
      photos = await photoPromise;
      map.addSource("photos", { type: "geojson", data: photos });

      if (!markerBitmap) {
        const blob = await (await fetch(marker)).blob();
        markerBitmap = await createImageBitmap(blob);
      }
      if (!map.hasImage("marker-icon"))
        map.addImage("marker-icon", markerBitmap);

      map.addLayer({
        id: "photo-points",
        type: "symbol",
        source: "photos",
        layout: {
          "icon-image": "marker-icon",
          "icon-size": 0.05,
          "icon-allow-overlap": true,
        },
      });

      map.on("click", "photo-points", (e) => {
        const f = e.features?.[0];
        if (f?.geometry.type === "Point" && f.properties)
          openPhoto(f.properties.id);
      });
      map.on(
        "mouseenter",
        "photo-points",
        () => (map.getCanvas().style.cursor = "pointer"),
      );
      map.on(
        "mouseleave",
        "photo-points",
        () => (map.getCanvas().style.cursor = ""),
      );

      // lazy load country borders when zoomed in
      map.on("moveend", async () => {
        if (
          !map.getSource("countries") &&
          map.getZoom() > COUNTRY_BORDER_ZOOM_THRESHOLD
        ) {
          const data = await fetch(
            "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
          ).then((r) => r.json());
          map.addSource("countries", { type: "geojson", data });
          map.addLayer({
            id: "country-borders",
            type: "line",
            source: "countries",
            paint: { "line-color": "#fff", "line-width": 0.5 },
          });
        }
      });
    });
  });

  onDestroy(() => {
    if (sunInterval) clearInterval(sunInterval);
    map?.remove();
  });
</script>

<div id="container">
  <Starfield />

  {#if photos?.features?.length}
    <button
      class="recent-btn"
      on:click={openMostRecent}
      in:fade={{ duration: 200 }}
      out:fade={{ duration: 150 }}
    >
      Show Most Recent
    </button>
  {/if}

  {#if selectedPhoto}
    <Popup
      {selectedPhoto}
      onPrev={onPrevPhoto}
      onNext={onNextPhoto}
      {hasPrev}
      {hasNext}
    />
  {/if}

  <div id="map"></div>
</div>

<style>
  :global(.maplibregl-control-container) {
    display: none;
  }
  :global(.maplibregl-canvas) {
    width: 100% !important;
  }
  #map {
    width: 100%;
    height: 100%;
    display: flex;
  }
  #container {
    width: 100%;
    height: 100%;
    background: black;
    display: flex;
    flex-direction: row-reverse;
    position: relative;
    overflow: hidden;
  }

  :global(#map canvas) {
    position: relative;
    z-index: 1;
  }

  /* Fade button */
  .recent-btn {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.02em;
    transition:
      background 0.25s ease,
      transform 0.25s ease;
    backdrop-filter: blur(4px);
  }

  .recent-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }

  /* Global styles */
  :global(html, body) {
    overflow: hidden;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    font-family:
      "Inter",
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      Oxygen,
      Ubuntu,
      Cantarell,
      "Fira Sans",
      "Droid Sans",
      "Helvetica Neue",
      sans-serif;
    font-weight: 400;
    line-height: 1.5;
    color: #fff;
  }

  :global(*) {
    box-sizing: inherit;
  }

  :global(p, span, div, button, input, textarea, a) {
    font-family: inherit;
  }
</style>
