import { useId, useLayoutEffect, useRef, type ChangeEvent } from "react";
import {
  caretAfter,
  formatPlainNumber,
  significantBefore,
  toPlainNumber,
  type NumberFormat,
} from "../utils/numberInput";

interface NumberFieldProps {
  label: string;
  /** Plain value without separators, e.g. "5000" or "1995.50". */
  value: string;
  onValueChange: (plain: string) => void;
  format: NumberFormat;
  /** Shown inside the box before the number, e.g. "$". */
  prefix?: string;
  /** Shown inside the box after the number, e.g. "sq ft". */
  suffix?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

/**
 * T-207: a number box that groups thousands as you type ("5,000") and shows its unit inside the
 * box. The caret stays after the digit just typed even when commas appear or disappear.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  format,
  prefix,
  suffix,
  placeholder,
  error,
  hint,
  required,
}: NumberFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const shown = formatPlainNumber(value);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [shown]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value;
    const plain = toPlainNumber(typed, format);
    if (plain === null) {
      // Too many digits: keep the previous value and put the caret back where it was.
      const caret = Math.max(0, (event.target.selectionStart ?? typed.length) - 1);
      pendingCaret.current = caret;
      event.target.value = shown;
      event.target.setSelectionRange(caret, caret);
      return;
    }
    const before = significantBefore(typed, event.target.selectionStart ?? typed.length);
    pendingCaret.current = caretAfter(formatPlainNumber(plain), before);
    onValueChange(plain);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={error ? "input-affix invalid" : "input-affix"}>
        {prefix && (
          <span className="affix" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode={format.decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          required={required}
          value={shown}
          onChange={handleChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        />
        {suffix && (
          <span className="affix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
