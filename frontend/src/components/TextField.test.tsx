import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("connects the label, hint, and error to the input", () => {
    render(
      <TextField label="Email" hint="We never share it" error="Required" />,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("We never share it Required");
  });

  it("is not marked invalid without an error", () => {
    render(<TextField label="Name" />);

    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});
