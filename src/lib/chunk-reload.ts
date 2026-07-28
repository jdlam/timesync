/**
 * Recovery for stale-chunk errors after a deployment.
 *
 * This is a server-rendered SPA with code-split routes. When a new version is
 * deployed, the content-hashed JS chunk filenames change. A browser still
 * running the previous version (an open tab, or a cached document) that then
 * lazily imports a route chunk requests a filename that no longer exists → the
 * dynamic import fails with "Importing a module script failed" / "Failed to
 * fetch dynamically imported module". Reloading the page fetches the current
 * document and its valid chunk references, resolving it.
 */

const RELOAD_FLAG = "ts:chunk-reloaded";

const CHUNK_ERROR_PATTERNS = [
	/importing a module script failed/i,
	/failed to fetch dynamically imported module/i,
	/error loading dynamically imported module/i,
	/loading chunk \d+ failed/i,
	/loading css chunk/i,
	/chunkloaderror/i,
];

/** True when an error looks like a failed dynamic-import / chunk load. */
export function isChunkLoadError(error: unknown): boolean {
	if (!error) return false;
	if (error instanceof Error && error.name === "ChunkLoadError") return true;
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "";
	return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Reload once to pick up the latest deployment. Guarded by sessionStorage so a
 * genuinely unrecoverable chunk can't cause an infinite reload loop. Returns
 * true if a reload was triggered.
 */
export function reloadForChunkError(): boolean {
	if (typeof window === "undefined") return false;
	try {
		if (window.sessionStorage.getItem(RELOAD_FLAG) === "1") return false;
		window.sessionStorage.setItem(RELOAD_FLAG, "1");
	} catch {
		// sessionStorage may be unavailable (e.g. private mode) — reloading once
		// without the guard is still acceptable.
	}
	window.location.reload();
	return true;
}

/**
 * Clear the reload guard once the app has loaded successfully, so a later
 * deployment in the same session can auto-recover again.
 */
export function clearChunkReloadGuard(): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(RELOAD_FLAG);
	} catch {
		// ignore
	}
}
