import type { FilterValues } from "../browse/filters";
import { formatAmenity, formatPrice } from "../utils/format";
import { parseDollarsToCents } from "../utils/money";

interface Chip {
  key: string;
  label: string;
  without: FilterValues;
}

function money(text: string): string {
  const cents = parseDollarsToCents(text);
  return cents == null ? text : formatPrice(cents);
}

function chipsFor(values: FilterValues): Chip[] {
  const chips: Chip[] = [];
  if (values.neighborhood) {
    chips.push({
      key: "neighborhood",
      label: values.neighborhood,
      without: { ...values, neighborhood: "" },
    });
  }
  if (values.minPrice) {
    chips.push({
      key: "minPrice",
      label: `From ${money(values.minPrice)}`,
      without: { ...values, minPrice: "" },
    });
  }
  if (values.maxPrice) {
    chips.push({
      key: "maxPrice",
      label: `Up to ${money(values.maxPrice)}`,
      without: { ...values, maxPrice: "" },
    });
  }
  if (values.minArea) {
    chips.push({
      key: "minArea",
      label: `At least ${values.minArea} sq ft`,
      without: { ...values, minArea: "" },
    });
  }
  for (const amenity of values.amenities) {
    chips.push({
      key: amenity,
      label: formatAmenity(amenity),
      without: {
        ...values,
        amenities: values.amenities.filter((a) => a !== amenity),
      },
    });
  }
  return chips;
}

/**
 * T-303: the filters in use, each with a remove button. AI search lands here too, so nothing it
 * read is applied without the visitor seeing it and being able to take it away.
 */
export function ActiveFilterChips({
  values,
  onChange,
}: {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}) {
  const chips = chipsFor(values);
  if (chips.length === 0) return null;
  return (
    <ul className="active-chips" aria-label="Filters in use">
      {chips.map((chip) => (
        <li key={chip.key}>
          <span className="active-chip">
            {chip.label}
            <button
              type="button"
              aria-label={`Remove ${chip.label}`}
              onClick={() => onChange(chip.without)}
            >
              ×
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
