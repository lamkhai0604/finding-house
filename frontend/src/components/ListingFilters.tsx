import { useState, type FormEvent } from "react";
import type { Amenity, ListingSort } from "../api/types";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  type FilterErrors,
  type FilterValues,
} from "../browse/filters";
import { formatAmenity } from "../utils/format";
import { Button } from "./Button";
import { CheckboxGroup } from "./CheckboxGroup";
import { SelectField } from "./SelectField";
import { AREA, MONEY } from "../utils/numberInput";
import { NumberField } from "./NumberField";

interface ListingFiltersProps {
  initial: FilterValues;
  /** Errors to show straight away, e.g. for an invalid shared link. */
  initialErrors?: FilterErrors;
  neighborhoods: string[];
  amenities: Amenity[];
  /** Returns errors to show, or an empty object when the filters were applied. */
  onApply: (values: FilterValues) => FilterErrors;
}

/**
 * T-202: the browse filter panel. Changes apply when the visitor presses "Show rooms" (or Enter),
 * not on every keystroke, so typing a price does not fire a search per digit.
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

  function submit(event: FormEvent) {
    event.preventDefault();
    setErrors(onApply(values));
  }

  function clear() {
    setValues(EMPTY_FILTERS);
    setErrors(onApply(EMPTY_FILTERS));
  }

  return (
    <form
      className="card filter-panel"
      aria-label="Filters"
      noValidate
      onSubmit={submit}
    >
      <h2>Filters</h2>
      <SelectField
        label="Neighborhood"
        value={values.neighborhood}
        onChange={(e) => set("neighborhood", e.target.value)}
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
      <div className="field-row">
        <NumberField
          label="Min rent"
          format={MONEY}
          prefix="$"
          placeholder="Any"
          value={values.minPrice}
          error={errors.minPrice}
          onValueChange={(plain) => set("minPrice", plain)}
        />
        <NumberField
          label="Max rent"
          format={MONEY}
          prefix="$"
          placeholder="Any"
          value={values.maxPrice}
          error={errors.maxPrice}
          onValueChange={(plain) => set("maxPrice", plain)}
        />
      </div>
      <NumberField
        label="Min area"
        format={AREA}
        suffix="sq ft"
        placeholder="Any"
        value={values.minArea}
        error={errors.minArea}
        onValueChange={(plain) => set("minArea", plain)}
      />
      <CheckboxGroup
        legend="Must have"
        options={amenities.map((a) => ({ value: a, label: formatAmenity(a) }))}
        selected={values.amenities}
        onChange={(selected) => set("amenities", selected)}
        error={errors.amenities}
      />
      <SelectField
        label="Sort by"
        value={values.sort}
        onChange={(e) => set("sort", e.target.value as ListingSort)}
        options={SORT_OPTIONS}
      />
      <div className="form-actions">
        <Button type="submit" variant="primary">
          Show rooms
        </Button>
        <Button variant="ghost" onClick={clear}>
          Clear filters
        </Button>
      </div>
    </form>
  );
}
