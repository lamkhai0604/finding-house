import { createContext, useContext } from "react";

export interface Toast {
  id: number;
  message: string;
}

export interface ToastApi {
  /** Shows a short confirmation, e.g. "Changes saved." It closes by itself. */
  show: (message: string) => void;
}

export const ToastContext = createContext<ToastApi>({ show: () => {} });

/** T-214: confirmations after posting, saving, hiding and deleting. */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}
