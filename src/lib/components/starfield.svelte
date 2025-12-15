<script lang="ts">
  import { onMount } from "svelte";
  import { STARFIELD_STAR_COUNT } from "$lib/config";

  onMount(() => {
    const starfield = document.getElementById("starfield");
    if (!starfield) return;

    for (let i = 0; i < STARFIELD_STAR_COUNT; i++) {
      const star = document.createElement("div");
      star.classList.add("star");
      star.style.left = Math.random() * 100 + "%";
      star.style.top = Math.random() * 100 + "%";
      star.style.animationDelay = Math.random() * 5 + "s";
      starfield.appendChild(star);
    }
  });
</script>

<div id="starfield"></div>

<style>
  #starfield {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  :global(.star) {
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    opacity: 0.6;
    animation: twinkle 2s infinite ease-in-out alternate;
  }

  @keyframes twinkle {
    from {
      opacity: 0.2;
      transform: scale(1);
    }

    to {
      opacity: 1;
      transform: scale(1.4);
    }
  }
</style>
