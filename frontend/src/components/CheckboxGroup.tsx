interface CheckboxGroupProps<T extends string> {
  legend: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  error?: string;
}

/** A labelled set of checkboxes, e.g. amenities. Keeps the options' order in the result. */
export function CheckboxGroup<T extends string>({
  legend,
  options,
  selected,
  onChange,
  error,
}: CheckboxGroupProps<T>) {
  function toggle(value: T, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(value);
    } else {
      next.delete(value);
    }
    onChange(options.map((o) => o.value).filter((v) => next.has(v)));
  }

  return (
    <fieldset className="field checkbox-group">
      <legend>{legend}</legend>
      <div className="checkbox-options">
        {options.map((option) => (
          <label key={option.value} className="checkbox">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(e) => toggle(option.value, e.target.checked)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}
