<div id="container">
  <slot />
</div>

<style>
  #container { width: 100%; height: 100%; background: black; display: flex; flex-direction: row; }

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
