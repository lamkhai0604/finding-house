import { useEffect } from "react";

const SITE = "Finding House";

/**
 * T-208: each page names itself in the browser tab and history ("Browse rooms | Finding House"),
 * which also tells screen-reader users which page they are on.
 */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${SITE}`
      : `${SITE}: rooms for rent in Seattle`;
  }, [title]);
}
