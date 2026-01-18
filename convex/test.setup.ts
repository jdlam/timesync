/// <reference types="vite/client" />

// This file provides the modules glob for convex-test
// All Convex function files need to be included here for testing
export const modules = import.meta.glob("./**/!(*.*.*)*.*s");
