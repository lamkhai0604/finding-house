import { ListingImage } from "./ListingImage";

interface ImageGalleryProps {
  urls: string[];
  title: string;
}

/** The listing's photos: the first one large, the rest as tiles beside it. */
export function ImageGallery({ urls, title }: ImageGalleryProps) {
  if (urls.length === 0) {
    return (
      <div className="gallery gallery-count-0">
        <ListingImage alt={title} className="gallery-main" />
      </div>
    );
  }
  const [first, ...rest] = urls;
  // T-212: the layout depends on how many photos there are (1 to 5).
  return (
    <div className={`gallery gallery-count-${urls.length}`}>
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
