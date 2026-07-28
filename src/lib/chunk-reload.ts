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
const RELOAD_PARAM = "__chunk_reload";

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
 * Whether we've already tried a recovery reload. Checks sessionStorage first,
 * then a URL query param that survives the reload even when storage APIs are
 * unavailable (e.g. Safari private mode) — without this fallback a truly
 * unrecoverable chunk could loop-reload forever.
 */
export function hasAttemptedChunkReload(): boolean {
	if (typeof window === "undefined") return false;
	try {
		if (window.sessionStorage.getItem(RELOAD_FLAG) === "1") return true;
	} catch {
		// storage unavailable — fall through to the URL guard
	}
	try {
		return new URLSearchParams(window.location.search).has(RELOAD_PARAM);
	} catch {
		return false;
	}
}

/**
 * Reload once to pick up the latest deployment. Guarded against infinite reload
 * loops by both sessionStorage and a URL query param. Returns true if a reload
 * was triggered.
 */
export function reloadForChunkError(): boolean {
	if (typeof window === "undefined") return false;
	if (hasAttemptedChunkReload()) return false;
	try {
		window.sessionStorage.setItem(RELOAD_FLAG, "1");
	} catch {
		// storage unavailable — the URL param below is the storage-independent guard
	}
	try {
		const url = new URL(window.location.href);
		url.searchParams.set(RELOAD_PARAM, "1");
		window.location.replace(url.toString());
	} catch {
		window.location.reload();
	}
	return true;
}

/**
 * Clear the reload guard once the app has loaded successfully, so a later
 * deployment in the same session can auto-recover again. Also strips the
 * recovery query param from the URL.
 */
export function clearChunkReloadGuard(): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(RELOAD_FLAG);
	} catch {
		// ignore
	}
	try {
		const url = new URL(window.location.href);
		if (url.searchParams.has(RELOAD_PARAM)) {
			url.searchParams.delete(RELOAD_PARAM);
			window.history.replaceState(window.history.state, "", url.toString());
		}
	} catch {
		// ignore
	}
}
