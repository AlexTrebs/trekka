<script lang="ts">
  import { goto } from "$app/navigation";

  import PhotoTagger from "$lib/components/dashboard/PhotoTagger.svelte";

  // Selected tab
  let activeTab: "tag" | "upload" | "manage" | "activity" = "tag";

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    goto("/admin/login");
  }
</script>

<div class="dashboard-panel">
  <div class="top-bar">
    <div class="toolbar">
      <button class:active={activeTab === "tag"} on:click={() => (activeTab = "tag")}>Tag Photos</button>
    </div>

    <button class="logout-btn" on:click={handleLogout}>Logout</button>
  </div>


  <div class="dashboard-content">
    {#if activeTab === "tag"}
      <PhotoTagger />
    {/if}
  </div>
</div>

<style>
  .dashboard-panel {
    padding: 1rem 2rem;
    font-family: inherit;
    color: white;
    width: 100%;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .toolbar {
    display: flex;
    gap: 1rem;
  }

  .toolbar button.active {
    background: #555;
    color: black;
  }

  .toolbar button:hover {
    background: #444;
  }

  .dashboard-content {
    min-height: 300px;
  }

  :global(button) {
    background: #333;
    color: white;
    cursor: pointer;
    font-weight: 600;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: none;
    transition:
      background 0.2s,
      transform 0.2s;
  }

  :global(button:hover){
    background: #555;
    transform: scale(1.05);
  }
</style>
