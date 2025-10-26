<script lang="ts">
  import { goto } from "$app/navigation";

  let username = "";
  let password = "";
  let error: string | null = null;

  async function handleLogin() {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      goto("/admin/panel");
    } else {
      const data = await res.json();
      error = data.error || "Login failed";
    }
  }
</script>

<div class="auth-panel">
  <h1>Login</h1>
  {#if error}
    <p class="error">{error}</p>
  {/if}
  <form on:submit|preventDefault={handleLogin}>
    <input type="text" placeholder="Username" bind:value={username} required />
    <input
      type="password"
      placeholder="Password"
      bind:value={password}
      required
    />
    <button type="submit">Log In</button>
  </form>
</div>

<style>
  .auth-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(20, 20, 20, 0.95);
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
    width: 350px;
    max-width: 90%;
    color: white;
    text-align: center;
    font-family: inherit;
  }

  h1 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  input {
    padding: 0.75rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    background: #333;
    color: white;
  }

  input:focus {
    outline: 2px solid #555;
  }

  button {
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

  button:hover {
    background: #555;
    transform: scale(1.05);
  }

  .error {
    color: #ff6b6b;
    margin-bottom: 0.75rem;
  }
</style>
