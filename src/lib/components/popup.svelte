<script lang="ts">
  import type { PhotoProps } from "$lib/types/photo";

  export let selectedPhoto: PhotoProps | null = null;
  export const mimeType = selectedPhoto?.mimeType ?? "image/jpeg";
  export const fileName = selectedPhoto?.name ?? "";

  export let onPrev: () => void;
  export let onNext: () => void;
  export let hasPrev: boolean = false;
  export let hasNext: boolean = false;

  let locationLoad = false;
  let locationString: string | null = null;
  let error: string | null = null;

  let loadingImage = true;
  let currentPhotoId: string | null = null;

  $: isVideo = selectedPhoto?.mimeType?.startsWith("video/") ?? false;

  $: if (selectedPhoto && selectedPhoto.id !== currentPhotoId) {
    loadingImage = true;
    currentPhotoId = selectedPhoto.id;
  }

  async function fetchLocation(lon: number, lat: number) {
    locationLoad = true;
    error = null;

    try {
      const res = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      let locationData = { city: data.city, country: data.country };
      locationString = `${locationData.city}${
        locationData.city && locationData.country ? ", " : ""
      }${locationData.country}`;
    } catch (err) {
      console.error(err);
      error = "Failed to load location";
      locationString = null;
    } finally {
      locationLoad = false;
    }
  }

  $: if (selectedPhoto?.location?.length === 2) {
    if (selectedPhoto.geoLocation) {
      locationString = selectedPhoto.geoLocation;
      locationLoad = false;
      error = null;
    } else {
      locationString = null;
      fetchLocation(selectedPhoto.location[0], selectedPhoto.location[1]);
    }
  }

  function closePopup() {
    selectedPhoto = null;
    locationString = null;
    loadingImage = true;
  }

  function handleImageLoad() {
    loadingImage = false;
  }

  function imageUrl(photo: PhotoProps) {
    const params = new URLSearchParams();

    params.set("mimeType", photo.mimeType ?? "image/jpeg");
    params.set("fileName", photo.name ?? "");

    return `/api/photos/image/${photo.id}?${params.toString()}`;
  }
</script>

{#if selectedPhoto?.id}
  <div class="popup-panel">
    <div class="top-bar">
      <button class="x-btn" aria-label="Close" on:click={closePopup}>
        <svg
          width={24}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M6 6 L18 18 M6 18 L18 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <div class="popup-body">
      {#if isVideo}
        <div class="media-wrapper">
          {#if loadingImage}
            <div class="skeleton-wrapper">
              <div class="skeleton skeleton-video"></div>
              <div class="loading-text">Loading video...</div>
            </div>
          {/if}
          <video
            src={imageUrl(selectedPhoto)}
            class="popup-video"
            class:hidden={loadingImage}
            controls
            preload="metadata"
            on:loadeddata={handleImageLoad}
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        </div>
      {:else}
        <a
          class="media-wrapper"
          href={imageUrl(selectedPhoto)}
          target="_blank"
          rel="noopener noreferrer"
          role="button"
          aria-label="Open full image"
          draggable="false"
        >
          {#if loadingImage}
            <div class="skeleton-wrapper">
              <div class="skeleton skeleton-image"></div>
              <div class="loading-text">Loading image...</div>
            </div>
          {/if}
          <img
            src={imageUrl(selectedPhoto)}
            alt={selectedPhoto.name}
            class="popup-img"
            class:hidden={loadingImage}
            draggable="false"
            on:load={handleImageLoad}
          />
        </a>
      {/if}
      <div class="photo-details">
        <p class="taken-at">Taken at: {selectedPhoto.takenAt}</p>
        {#if locationLoad}
          <p class="loading">Loading location…</p>
        {:else if error}
          <p class="error">{error}</p>
        {:else if locationString}
          <p class="location">Location: {locationString}</p>
        {/if}
      </div>
    </div>

    <div class="bottom-bar">
      <button class="nav-btn prev-btn" on:click={onPrev} disabled={!hasPrev}>
        ← Previous
      </button>
      <button class="nav-btn next-btn" on:click={onNext} disabled={!hasNext}>
        Next →
      </button>
    </div>
  </div>
{/if}

<style>
  /* Popup panel container */
  .popup-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100%;
    background: rgba(20, 20, 20, 0.95);
    color: white;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    font-family: inherit;
  }

  /* Top bar */
  .top-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    padding: 0.5rem 1rem;
    padding-bottom: 0;
  }

  .x-btn {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.25rem;
    transition: transform 0.2s;
  }

  .x-btn:hover {
    transform: scale(1.1);
  }

  /* Main body */
  .popup-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 0 1rem;
    box-sizing: border-box;
    max-height: calc(100% - 80px - 1rem);
  }

  .media-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    width: 100%;
    max-height: calc(100% - 4rem);
  }

  .popup-img,
  .popup-video {
    max-width: 100%;
    border-radius: 12px;
    object-fit: contain;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .popup-video {
    max-height: 100%;
  }

  .hidden {
    display: none;
  }

  /* Skeleton loading states */
  .skeleton-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s ease-in-out infinite;
    border-radius: 12px;
  }

  .skeleton-image {
    width: 300px;
    height: 400px;
    max-width: 100%;
  }

  .skeleton-video {
    width: 300px;
    height: 200px;
    max-width: 100%;
  }

  .loading-text {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    font-weight: 500;
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .photo-details {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .photo-details p {
    font-weight: 500;
    font-family: inherit;
  }

  /* Bottom bar */
  .bottom-bar {
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    padding-top: 0;
  }

  .nav-btn {
    background: #333;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 600;
    transition:
      background 0.2s,
      transform 0.2s;
  }

  .nav-btn:disabled {
    background: #222;
    color: #777;
    cursor: not-allowed;
    transform: none;
  }

  .nav-btn:hover {
    background: #555;
    transform: scale(1.05);
  }

  .taken-at,
  .location,
  .loading,
  .error {
    margin: 0.25rem 0;
    font-size: 0.95rem;
    opacity: 0.85;
  }

  .error {
    color: #ff6b6b;
  }

  .taken-at,
  .location,
  .loading,
  .error {
    font-weight: 400;
    font-size: 0.95rem;
    font-family: inherit;
  }

  /* Mobile full-screen adjustments */
  @media (max-width: 768px) {
    .popup-panel {
      width: 100%;
      height: 100%;
      border-radius: 0;
      box-shadow: none;
    }

    .popup-body {
      padding: 1rem;
    }

    .popup-img {
      max-height: 50vh;
    }

    .bottom-bar {
      position: sticky;
      bottom: 0;
      background: rgba(20, 20, 20, 0.95);
      padding: 0.5rem 1rem;
    }
  }
</style>
