<script lang="ts">
  import type { FeatureCollection, Point } from 'geojson';
  import * as maplibregl from 'maplibre-gl';
  import { onMount } from 'svelte';
  import marker from '$lib/assets/marker.png';
  import Popup from '$lib/components/popup.svelte';
  import Starfield from '$lib/components/starfield.svelte';
  import type { PhotoProps } from '$lib/types/photo';

  let selectedPhoto: PhotoProps | null = null;
  let selectedPhotoIndex: number | null = null;

  let photos: FeatureCollection<Point, PhotoProps>;
  let map: maplibregl.Map;

  let lightRotation = 0;
  let sunRotation = 90;

  $: hasPrev = selectedPhotoIndex !== null && selectedPhotoIndex > 0;
  $: hasNext = selectedPhotoIndex !== null && photos && selectedPhotoIndex < photos.features.length - 1;

  /**
   * Updates the sun and light rotation angles for the map's lighting and sky.
   * - Computes the sun's declination (latitude tilt) using a sinusoidal approximation.
   * - Computes the sun's hour angle based on the current UTC time.
   */
  function updateSunPosition() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const declination = 23.44 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 80));
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const hourAngle = (utcHours / 24) * 360;

    sunRotation = 90 - declination;
    lightRotation = hourAngle;
  }

  setInterval(updateSunPosition, 60_000);
  updateSunPosition();

  /**
   * Opens a photo on the map by its ID.
   *
   * @param photoId - The ID of the photo to open.
   */
  function openPhoto(photoId: number) {
    if (!photos) return;

    const index = photos.features.findIndex((f: any) => f.properties.id === photoId);
    if (index === -1) return;

    selectedPhotoIndex = index;
    selectedPhoto = photos.features[index].properties;

    map.easeTo({
      center: photos.features[index].properties.location,
      duration: 1500
    });
  }

  function onPrevPhoto() {
    if (hasPrev && selectedPhotoIndex !== null) openPhoto(photos.features[selectedPhotoIndex - 1].properties.id);
  }

  function onNextPhoto() {
    if (hasNext && selectedPhotoIndex !== null) openPhoto(photos.features[selectedPhotoIndex + 1].properties.id);
  }

  onMount(async () => {
    // Loads photo
    photos = await fetch('/api/photos').then(r => r.json());

    // Loads map
    map = new maplibregl.Map({
      container: 'map',
      center: [0, 0],
      zoom: 1,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        projection: { type: 'globe' },
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
            ],
          },
        },
        layers: [
          { id: 'Satellite', type: 'raster', source: 'satellite' },
        ],
        light: { anchor: 'map', position: [10, sunRotation, lightRotation] },
        sky: {
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 0.8, 1, 0.4, 2, 0.1, 3, 0],
        },
      },
    });

    map.on('load', async () => {
      map.addSource('countries', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
      });

      map.addLayer({
        id: 'country-borders',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': '#fff', 'line-width': 0.5 },
      });

      map.addSource('photos', { type: 'geojson', data: photos });

      // creates reusable marker
      const res = await fetch(marker);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      if (!map.hasImage('marker-icon')) map.addImage('marker-icon', bitmap);

      map.addLayer({
        id: 'photo-points',
        type: 'symbol',
        source: 'photos',
        layout: { 'icon-image': 'marker-icon', 'icon-size': 0.05, 'icon-allow-overlap': true },
      });

      map.on('click', 'photo-points', (e: any) => {
        const feature = e.features?.[0];
        if (feature?.geometry.type === 'Point' && feature.properties) openPhoto(feature.properties.id);
      });

      map.on('click', () => {
        const hits = map.queryRenderedFeatures({ layers: ['photo-points'] });
        if (!hits.length && selectedPhoto) selectedPhoto = null;
      });

      map.on('mouseenter', 'photo-points', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'photo-points', () => (map.getCanvas().style.cursor = ''));
    });
  });
</script>

<div id="container">
  <Starfield />
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
  :global(.maplibregl-control-container) { display: none; }
  :global(.maplibregl-canvas) { width: 100% !important; }
  #map { width: 100%; height: 100%; display: flex; }
  #container { width: 100%; height: 100%; background: black; display: flex; flex-direction: row-reverse; }
  :global(#map canvas) { position: relative; z-index: 1; }

  /* Global */
  :global(html, body) {
    overflow: hidden;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
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
