import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ConvexClientProvider } from "../components/ConvexClientProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import Header from "../components/Header";
import { Toaster } from "../components/ui/sonner";
import { getUmamiScriptConfig } from "../lib/analytics";
import { ThemeProvider } from "../lib/theme";

import appCss from "../styles.css?url";

// Inline script to set theme before paint (prevents flash)
const themeScript = `
(function() {
  const stored = localStorage.getItem('theme');
  const theme = stored || 'system';
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.add(isDark ? 'dark' : 'light');
})();
`;

// Umami analytics (optional - only loaded when both env vars are set)
const umamiScripts = getUmamiScriptConfig(
	import.meta.env.VITE_UMAMI_SCRIPT_URL,
	import.meta.env.VITE_UMAMI_WEBSITE_ID,
);

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TimeSync - Find the Perfect Time",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
		scripts: [
			{
				children: themeScript,
			},
			...umamiScripts,
		],
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="bg-background text-foreground">
				<ErrorBoundary>
					<ConvexClientProvider>
						<ThemeProvider>
							<Header />
							{children}
							<Toaster richColors closeButton />
							<TanStackDevtools
								config={{
									position: "bottom-right",
								}}
								plugins={[
									{
										name: "Tanstack Router",
										render: <TanStackRouterDevtoolsPanel />,
									},
								]}
							/>
						</ThemeProvider>
					</ConvexClientProvider>
				</ErrorBoundary>
				<Scripts />
			</body>
		</html>
	);
}
