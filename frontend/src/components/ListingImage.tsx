import { useState } from "react";

interface ListingImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/**
 * FR-02 AC7: shows the photo, or a placeholder frame when there is no link or the image fails to
 * load. Clicking a loaded photo opens it full size in a new tab.
 */
export function ListingImage({ src, alt, className }: ListingImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const classes = ["listing-image", className].filter(Boolean).join(" ");

  if (!src || failedSrc === src) {
    return (
      <div role="img" aria-label="No photo available" className={`${classes} placeholder`}>
        <span aria-hidden="true">No photo yet</span>
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className={classes}>
      <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} />
    </a>
  );
}
