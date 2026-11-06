/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from "vite";
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
function contentSecurityPolicy(apiOrigin: string | null): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https: data:",
    // D-030: a deployed build calls the backend on its own origin, and only that origin.
    apiOrigin ? `connect-src 'self' ${apiOrigin}` : "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          "http-equiv": "Content-Security-Policy",
          content: policy,
        },
        injectTo: "head-prepend",
      },
    ],
  };
}

/**
 * T-114b: VITE_API_BASE_URL must be a bare origin (https, or http on localhost for the smoke
 * test). Anything else stops the build, so a typo cannot ship a broken or over-wide CSP.
 */
function apiOriginFrom(value: string | undefined): string | null {
  const raw = (value ?? "").trim().replace(/\/+$/, "");
  if (!raw) return null;
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  const allowedScheme =
    url.protocol === "https:" || (url.protocol === "http:" && local);
  if (!allowedScheme || url.origin !== raw) {
    throw new Error(
      `VITE_API_BASE_URL must be an origin like https://api.example.com, got "${value}"`,
    );
  }
  return url.origin;
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    contentSecurityPolicy(
      apiOriginFrom(loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL),
    ),
  ],
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
}));
