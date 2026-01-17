"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
