import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AREA, MONEY, type NumberFormat } from "../utils/numberInput";
import { NumberField } from "./NumberField";

function Harness({
  format,
  prefix,
  suffix,
}: {
  format: NumberFormat;
  prefix?: string;
  suffix?: string;
}) {
  const [value, setValue] = useState("");
  return (
    <>
      <NumberField
        label="Amount"
        format={format}
        prefix={prefix}
        suffix={suffix}
        value={value}
        onValueChange={setValue}
      />
      <output>{value}</output>
    </>
  );
}

describe("NumberField (T-207)", () => {
  it("shows dollars with separators and keeps the plain value", () => {
    render(<Harness format={MONEY} prefix="$" />);
    const input = screen.getByLabelText("Amount");

    fireEvent.change(input, { target: { value: "5000" } });

    expect(input).toHaveValue("5,000");
    expect(screen.getByRole("status")).toHaveTextContent("5000");
    expect(screen.getByText("$")).toHaveAttribute("aria-hidden", "true");
  });

  it("refuses an extra digit beyond the limit", () => {
    render(<Harness format={AREA} suffix="sq ft" />);
    const input = screen.getByLabelText("Amount");

    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.change(input, { target: { value: "9999990" } });

    expect(input).toHaveValue("999,999");
    expect(screen.getByText("sq ft")).toBeInTheDocument();
  });

  it("keeps the caret after the digit just typed", () => {
    render(<Harness format={MONEY} />);
    const input = screen.getByLabelText<HTMLInputElement>("Amount");
    input.focus();

    fireEvent.change(input, { target: { value: "123" } });
    // Type "4" at the end: the box becomes "1,234" and the caret stays at the end.
    input.setSelectionRange(3, 3);
    fireEvent.change(input, { target: { value: "1234", selectionStart: 4 } });

    expect(input).toHaveValue("1,234");
    expect(input.selectionStart).toBe(5);
  });
});
