import { useState, type FormEvent } from "react";
import type { Amenity } from "../api/types";
import {
  EMPTY_FILTERS,
  type FilterErrors,
  type FilterValues,
} from "../browse/filters";
import { LINE_STOPS } from "../home/lineStops";
import { formatAmenity } from "../utils/format";
import { AREA, MONEY } from "../utils/numberInput";
import { Button } from "./Button";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";

interface ListingFiltersProps {
  initial: FilterValues;
  /** Errors to show straight away, e.g. for an invalid shared link. */
  initialErrors?: FilterErrors;
  neighborhoods: string[];
  amenities: Amenity[];
  /**
   * Applies the filters. `submitted` is true for "Show rooms" / Enter and false for a stop, chip or
   * neighborhood picked from the panel. Returns errors to show, or an empty object when applied.
   */
  onApply: (values: FilterValues, submitted: boolean) => FilterErrors;
}

/**
 * T-202 / T-211: the browse filter panel. Stops on the mini 1 Line, the neighborhood list and the
 * amenity chips apply at once. Typed amounts apply on "Show rooms" (or Enter), so typing a price
 * does not fire a search per digit.
 */
export function ListingFilters({
  initial,
  initialErrors = {},
  neighborhoods,
  amenities,
  onApply,
}: ListingFiltersProps) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FilterErrors>(initialErrors);

  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function applyNow(next: FilterValues) {
    setValues(next);
    setErrors(onApply(next, false));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors(onApply(values, true));
  }

  function toggleAmenity(amenity: Amenity) {
    const chosen = values.amenities.includes(amenity)
      ? values.amenities.filter((a) => a !== amenity)
      : [...values.amenities, amenity];
    // Keep the server's order so the URL stays the same for the same choice.
    applyNow({
      ...values,
      amenities: amenities.filter((a) => chosen.includes(a)),
    });
  }

  return (
    <form
      className="filter-panel"
      aria-label="Filters"
      noValidate
      onSubmit={submit}
    >
      <div className="mini-line">
        <div
          role="group"
          aria-label="Stops on the 1 Line"
          className="mini-stops"
        >
          {LINE_STOPS.map((stop) => {
            const on = values.neighborhood === stop.neighborhood;
            return (
              <button
                key={stop.neighborhood}
                type="button"
                className="mini-stop"
                aria-pressed={on}
                onClick={() =>
                  applyNow({
                    ...values,
                    neighborhood: on ? "" : stop.neighborhood,
                  })
                }
              >
                <span className="mini-dot" aria-hidden="true" />
                {stop.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="filter-fields">
        <SelectField
          label="Neighborhood"
          value={values.neighborhood}
          onChange={(e) =>
            applyNow({ ...values, neighborhood: e.target.value })
          }
          options={[
            { value: "", label: "Any neighborhood" },
            ...neighborhoods.map((n) => ({ value: n, label: n })),
            // Keep a value from a link even before the list has loaded.
            ...(values.neighborhood &&
            !neighborhoods.includes(values.neighborhood)
              ? [{ value: values.neighborhood, label: values.neighborhood }]
              : []),
          ]}
        />
        <NumberField
          label="Rent from"
          format={MONEY}
          prefix="$"
          placeholder="Any"
          value={values.minPrice}
          error={errors.minPrice}
          onValueChange={(plain) => set("minPrice", plain)}
        />
        <NumberField
          label="Rent up to"
          format={MONEY}
          prefix="$"
          placeholder="Any"
          value={values.maxPrice}
          error={errors.maxPrice}
          onValueChange={(plain) => set("maxPrice", plain)}
        />
        <NumberField
          label="Area at least"
          format={AREA}
          suffix="sq ft"
          placeholder="Any"
          value={values.minArea}
          error={errors.minArea}
          onValueChange={(plain) => set("minArea", plain)}
        />
        <Button type="submit" variant="primary" className="filter-submit">
          Show rooms
        </Button>
      </div>

      <div className="filter-chips">
        <div role="group" aria-labelledby="must-have" className="chip-list">
          <span id="must-have" className="chip-legend">
            Must have
          </span>
          {amenities.map((amenity) => (
            <button
              key={amenity}
              type="button"
              className="chip"
              aria-pressed={values.amenities.includes(amenity)}
              onClick={() => toggleAmenity(amenity)}
            >
              {formatAmenity(amenity)}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          className="filter-clear"
          onClick={() => applyNow(EMPTY_FILTERS)}
        >
          Clear filters
        </Button>
      </div>
      {errors.amenities && <p className="field-error">{errors.amenities}</p>}
    </form>
  );
}
