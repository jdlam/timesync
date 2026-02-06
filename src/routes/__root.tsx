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
			{
				name: "description",
				content:
					"The fastest way to coordinate group schedules. No signups, no hassle — create an event, share a link, and find the best time with an interactive heatmap.",
			},
			{ property: "og:title", content: "TimeSync - Find the Perfect Time" },
			{
				property: "og:description",
				content:
					"The fastest way to coordinate group schedules. No signups, no hassle — just results.",
			},
			{ property: "og:type", content: "website" },
			{ property: "og:image", content: "/og-image.png" },
			{ name: "twitter:card", content: "summary_large_image" },
			{
				name: "twitter:title",
				content: "TimeSync - Find the Perfect Time",
			},
			{
				name: "twitter:description",
				content:
					"The fastest way to coordinate group schedules. No signups, no hassle — just results.",
			},
			{ name: "twitter:image", content: "/og-image.png" },
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{
				rel: "icon",
				href: "/favicon-16x16.png",
				sizes: "16x16",
				type: "image/png",
			},
			{
				rel: "icon",
				href: "/favicon-32x32.png",
				sizes: "32x32",
				type: "image/png",
			},
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
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
