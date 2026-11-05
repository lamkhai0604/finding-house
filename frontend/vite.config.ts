/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// In development, API calls go through the Vite dev server to the
// Spring Boot backend, so the browser sees a single origin (no CORS setup).
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * Content Security Policy for the production build (T-110). Scripts, styles, and API calls are
 * limited to this site; listing photos may come from any https host (D-017). Not applied to the
 * dev server, whose hot reload needs inline scripts. frame-ancestors cannot be set in a meta tag;
 * it must be an HTTP header from the host (Sprint 3 deployment).
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' https: data:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          "http-equiv": "Content-Security-Policy",
          content: CONTENT_SECURITY_POLICY,
        },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  server: {
    proxy: {
      "/api": backendUrl,
      "/actuator": backendUrl,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
