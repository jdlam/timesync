import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
import {
	clearChunkReloadGuard,
	isChunkLoadError,
	reloadForChunkError,
} from "@/lib/chunk-reload";
import { Button } from "./ui/button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	private clearGuardTimer?: ReturnType<typeof setTimeout>;

	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidMount() {
		if (typeof window === "undefined") return;
		// Vite fires this when a route chunk fails to preload after a deploy.
		window.addEventListener("vite:preloadError", this.handlePreloadError);
		// If the app is still running after a moment, any recovery reload worked —
		// release the guard so a future deploy can auto-recover again.
		this.clearGuardTimer = setTimeout(clearChunkReloadGuard, 10_000);
	}

	componentWillUnmount() {
		if (typeof window === "undefined") return;
		window.removeEventListener("vite:preloadError", this.handlePreloadError);
		if (this.clearGuardTimer) clearTimeout(this.clearGuardTimer);
	}

	private handlePreloadError = (event: Event) => {
		// Prevent the default unhandled rejection and reload to the latest build.
		event.preventDefault();
		reloadForChunkError();
	};

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		// A stale route chunk after a deploy — reload once to the current build.
		if (isChunkLoadError(error)) {
			reloadForChunkError();
		}
	}

	handleReset = () => {
		// For chunk errors a state reset just re-imports the same missing chunk;
		// a full reload fetches the current document and its valid chunk refs.
		if (isChunkLoadError(this.state.error)) {
			window.location.reload();
			return;
		}
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			const isChunkError = isChunkLoadError(this.state.error);

			return (
				<div className="min-h-screen bg-background flex items-center justify-center px-4">
					<div className="max-w-md w-full text-center">
						<AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
						<h1 className="text-4xl font-bold text-foreground mb-2">
							{isChunkError
								? "A new version is available"
								: "Something went wrong"}
						</h1>
						<p className="text-lg text-muted-foreground mb-4">
							{isChunkError
								? "The app was updated. Reload to get the latest version."
								: "An unexpected error occurred. Please try refreshing the page."}
						</p>
						{!isChunkError && this.state.error && (
							<div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 text-left">
								<p className="text-red-400 text-sm font-mono">
									{this.state.error.message}
								</p>
							</div>
						)}
						<Button onClick={this.handleReset}>
							<RefreshCw className="w-4 h-4" />
							{isChunkError ? "Reload" : "Try Again"}
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
