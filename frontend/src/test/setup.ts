import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { setAccessToken } from "../api/client";

// Every test starts logged out, with no fake fetch left over from the previous one.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  setAccessToken(null);
  window.sessionStorage.clear();
});
