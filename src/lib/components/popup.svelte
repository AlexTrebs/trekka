<script lang="ts">
  import type { PhotoProps } from "$lib/types/photo";

  export let selectedPhoto: PhotoProps | null = null;

  export let onPrev: () => void;
  export let onNext: () => void;
  export let hasPrev: boolean = false;
  export let hasNext: boolean = false;

  let locationLoad = false;
  let locationData: { city?: string; country?: string } = {};
  let error: string | null = null;

  let loadingImage = true;
  let currentPhotoId: number | null = null;

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
      locationData = { city: data.city, country: data.country };
    } catch (err) {
      console.error(err);
      error = 'Failed to load location';
      locationData = {};
    } finally {
      locationLoad = false;
    }
  }

  $: if (selectedPhoto?.location?.length === 2) {
    fetchLocation(selectedPhoto.location[0], selectedPhoto.location[1]);
  }

  function closePopup() {
    selectedPhoto = null;
    locationData = {};
    loadingImage = true;
  }

  function handleImageLoad() {
    loadingImage = false;
  }
</script>

{#if selectedPhoto?.id}
  <div class="popup-panel">
    <div class="top-bar">
      <button class="x-btn" aria-label="Close" on:click={closePopup}>
        <svg width={24} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6 L18 18 M6 18 L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="popup-body">
      {#if loadingImage}
        <div class="loading-overlay">
          <div class="spinner"></div>
        </div>
      {/if}
      <a
        class="image-wrapper"
        href={`/api/photos/image/${selectedPhoto.id}`}
        target="_blank"
        rel="noopener noreferrer"
        role="button"
        aria-label="Open full image"
        draggable="false"
      >
        <img
          src={`/api/photos/image/${selectedPhoto.id}`}
          alt={selectedPhoto.name}
          class="popup-img"
          draggable="false"
          on:load={handleImageLoad}
        />
      </a>
      <div class="photo-details">
        <p class="taken-at">Taken at: {selectedPhoto.takenAt}</p>
        {#if locationLoad}
          <p class="loading">Loading location…</p>
        {:else if error}
          <p class="error">{error}</p>
        {:else if locationData.city || locationData.country}
          <p class="location">Location: {locationData.city}{locationData.city && locationData.country ? ', ' : ''}{locationData.country}</p>
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
    background: rgba(20,20,20,0.95);
    color: white;
    display: flex;
    flex-direction: column;
    z-index: 1000;
    box-shadow: -4px 0 24px rgba(0,0,0,0.4);
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

  .image-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
    max-height: calc(100% - 4rem);
  }

  .popup-img {
    max-width: 100%;
    border-radius: 12px;
    object-fit: contain;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
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
    transition: background 0.2s, transform 0.2s;
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

  /* Loading overlay */
  .loading-overlay {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  }

  .spinner {
    width: 60px;
    height: 60px;
    border: 6px solid rgba(255, 255, 255, 0.2);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .taken-at, .location, .loading, .error {
    margin: 0.25rem 0;
    font-size: 0.95rem;
    opacity: 0.85;
  }

  .error {
    color: #ff6b6b;
  }

  .taken-at, .location, .loading, .error {
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
      background: rgba(20,20,20,0.95);
      padding: 0.5rem 1rem;
    }
  }
</style>
