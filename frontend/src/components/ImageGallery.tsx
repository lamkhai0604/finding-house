import { ListingImage } from "./ListingImage";

interface ImageGalleryProps {
  urls: string[];
  title: string;
}

/** The listing's photos: the first one large, the rest as smaller tiles. */
export function ImageGallery({ urls, title }: ImageGalleryProps) {
  if (urls.length === 0) {
    return (
      <div className="gallery">
        <ListingImage alt={title} className="gallery-main" />
      </div>
    );
  }
  const [first, ...rest] = urls;
  return (
    <div className="gallery">
      <ListingImage
        src={first}
        alt={`${title}, photo 1`}
        className="gallery-main"
      />
      {rest.map((url, index) => (
        <ListingImage
          key={url}
          src={url}
          alt={`${title}, photo ${index + 2}`}
          className="gallery-tile"
        />
      ))}
    </div>
  );
}
