import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Enable minification for production
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true, // Remove console.log in production
				drop_debugger: true
			}
		},
		// Chunk size warnings
		chunkSizeWarningLimit: 1000,
		rollupOptions: {
			output: {
				// Manual chunk splitting for better caching
				manualChunks: (id) => {
					// Vendor chunk for node_modules
					if (id.includes('node_modules')) {
						// Separate maplibre-gl into its own chunk (it's large)
						if (id.includes('maplibre-gl')) {
							return 'maplibre';
						}
						// Separate googleapis into its own chunk
						if (id.includes('googleapis')) {
							return 'googleapis';
						}
						// Separate heic-convert into its own chunk
						if (id.includes('heic-convert')) {
							return 'heic-convert';
						}
						// All other vendor code
						return 'vendor';
					}
				}
			}
		},
		// Source maps for debugging production issues
		sourcemap: true
	},
	optimizeDeps: {
		include: ['maplibre-gl', 'geojson']
	}
});
