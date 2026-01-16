import { AlertCircle, RefreshCw } from "lucide-react";
import { Component, type ReactNode } from "react";
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
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="min-h-screen bg-background flex items-center justify-center px-4">
					<div className="max-w-md w-full text-center">
						<AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
						<h1 className="text-4xl font-bold text-foreground mb-2">
							Something went wrong
						</h1>
						<p className="text-lg text-muted-foreground mb-4">
							An unexpected error occurred. Please try refreshing the page.
						</p>
						{this.state.error && (
							<div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6 text-left">
								<p className="text-red-400 text-sm font-mono">
									{this.state.error.message}
								</p>
							</div>
						)}
						<Button onClick={this.handleReset}>
							<RefreshCw className="w-4 h-4" />
							Try Again
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
