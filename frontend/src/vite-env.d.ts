/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin for deployed builds (T-114b); empty means same origin. */
  readonly VITE_API_BASE_URL?: string;
}
