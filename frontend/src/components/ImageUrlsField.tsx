import { Button } from "./Button";
import { ListingImage } from "./ListingImage";
import { TextField } from "./TextField";

interface ImageUrlsFieldProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  max: number;
  /** Errors per link, by index, e.g. from the server's "imageUrls[0]". */
  errors?: Record<number, string>;
  /** Error about the list as a whole, e.g. too many links. */
  error?: string;
}

/** Up to `max` photo links (D-017), each with a small preview. */
export function ImageUrlsField({
  urls,
  onChange,
  max,
  errors = {},
  error,
}: ImageUrlsFieldProps) {
  function setAt(index: number, value: string) {
    onChange(urls.map((url, i) => (i === index ? value : url)));
  }

  return (
    <fieldset className="field image-urls">
      <legend>Photos</legend>
      <p className="field-hint">
        Paste up to {max} links to photos (https://…). Listings without photos
        show a placeholder.
      </p>
      {urls.map((url, index) => (
        <div key={index} className="image-url-row">
          <ListingImage
            src={url.startsWith("https://") ? url : undefined}
            alt={`Preview of photo ${index + 1}`}
            className="image-url-preview"
          />
          <TextField
            label={`Photo link ${index + 1}`}
            type="url"
            inputMode="url"
            placeholder="https://"
            value={url}
            error={errors[index]}
            onChange={(e) => setAt(index, e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange(urls.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      {error && <p className="field-error">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        disabled={urls.length >= max}
        onClick={() => onChange([...urls, ""])}
      >
        Add photo link
      </Button>
    </fieldset>
  );
}
