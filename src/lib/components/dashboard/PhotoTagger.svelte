<script lang="ts">
  import { onMount } from "svelte";

  type Photo = {
    id: string;
    name: string;
    takenAt: string;
    url: string;
  };

  let photos: Photo[] = [];
  let loading = true;
  let error: string | null = null;

  let editingPhotoId: string | null = null;
  let lat = "";
  let lon = "";

  function toggleEdit(photo: Photo) {
    if (editingPhotoId === photo.id) {
      editingPhotoId = null;
    } else {
      editingPhotoId = photo.id;
      lat = "";
      lon = "";
    }
  }

  async function saveCoordinates(photo: Photo) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (!lat || !lon) {
      return alert("Please enter both latitude and longitude");
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return alert("Invalid coordinates. Please enter valid numbers.");
    }

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return alert(
        "Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180.",
      );
    }

    try {
      const res = await fetch(`/api/photos/image/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: photo.id,
          lat: latitude,
          lon: longitude,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      photos = photos.filter((p) => p.id !== photo.id);
      editingPhotoId = null;
      error = null;
    } catch (err) {
      console.error(err);
      error = err instanceof Error ? err.message : "Failed to save coordinates";
    }
  }

  async function loadPhotos() {
    loading = true;
    error = null;
    try {
      const res = await fetch("/api/photos/untagged");
      if (!res.ok) throw new Error("Failed to fetch photos");
      photos = await res.json();
    } catch (err) {
      console.error(err);
      error = "Could not load untagged photos.";
    } finally {
      loading = false;
    }
  }

  onMount(loadPhotos);
</script>

{#if loading}
  <p>Loading untagged photos…</p>
{:else if error}
  <p class="error">{error}</p>
{:else if photos.length === 0}
  <p class="empty">🎉 All photos are tagged!</p>
{:else}
  <ul>
    {#each photos as photo}
      <li>
        <button
          class="photo-info"
          on:click={() =>
            (window.location.href = `/api/photos/image/${photo.id}`)}
          aria-label={`Open full image: ${photo.name}`}
          draggable="false"
        >
          <img src={photo.url} alt={photo.name} class="thumb" />
          <span class="photo-name">{photo.name}</span>
        </button>
        <button on:click={() => toggleEdit(photo)}>
          {editingPhotoId === photo.id ? "Cancel" : "Edit"}
        </button>
      </li>

      {#if editingPhotoId === photo.id}
        <div class="edit-panel">
          <label>
            Latitude:
            <input type="text" bind:value={lat} placeholder="e.g. 51.5074" />
          </label>
          <label>
            Longitude:
            <input type="text" bind:value={lon} placeholder="e.g. -0.1278" />
          </label>
          <button class="save-btn" on:click={() => saveCoordinates(photo)}
            >Save</button
          >
        </div>
      {/if}
    {/each}
  </ul>
{/if}

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  li {
    background: #222;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .photo-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    text-decoration: none;
    color: inherit;
    border: none;
    background: none;
    font: inherit;
    text-align: left;
    flex: 1 1 auto;
    min-width: 0;
  }

  .photo-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex-shrink: 1;
  }

  .photo-info:hover {
    transform: scale(1);
  }

  .thumb {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .edit-panel {
    margin-top: -0.5rem;
    margin-bottom: 0.75rem;
    background: #1a1a1a;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .edit-panel label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
    opacity: 0.85;
  }

  .edit-panel input {
    margin-top: 0.25rem;
    padding: 0.4rem 0.6rem;
    border-radius: 6px;
    border: none;
    outline: none;
    background: #333;
    color: white;
  }

  .save-btn {
    margin-top: 0.5rem;
    align-self: flex-start;
  }

  .empty {
    text-align: center;
    opacity: 0.8;
    margin-top: 2rem;
  }

  .error {
    color: #ff6b6b;
    text-align: center;
    margin-top: 1rem;
  }
</style>
