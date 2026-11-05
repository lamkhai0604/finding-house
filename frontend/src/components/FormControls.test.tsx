import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CheckboxGroup } from "./CheckboxGroup";
import { ImageUrlsField } from "./ImageUrlsField";

function UrlsHarness({ initial }: { initial: string[] }) {
  const [urls, setUrls] = useState(initial);
  return <ImageUrlsField urls={urls} onChange={setUrls} max={2} />;
}

describe("ImageUrlsField", () => {
  it("adds and removes photo links, up to the maximum", () => {
    render(<UrlsHarness initial={[]} />);
    const add = screen.getByRole("button", { name: "Add photo link" });

    fireEvent.click(add);
    fireEvent.click(add);

    expect(screen.getByLabelText("Photo link 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Photo link 2")).toBeInTheDocument();
    expect(add).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);

    expect(screen.queryByLabelText("Photo link 2")).not.toBeInTheDocument();
    expect(add).toBeEnabled();
  });

  it("previews https links and shows a placeholder otherwise", () => {
    render(<UrlsHarness initial={["https://example.com/a.jpg", "http://x"]} />);

    expect(
      screen.getByRole("img", { name: "Preview of photo 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "No photo available" }),
    ).toBeInTheDocument();
  });
});

describe("CheckboxGroup", () => {
  function Harness() {
    const [selected, setSelected] = useState<string[]>([]);
    return (
      <>
        <CheckboxGroup
          legend="Amenities"
          options={[
            { value: "WIFI", label: "Wi-Fi" },
            { value: "KITCHEN", label: "Kitchen" },
          ]}
          selected={selected}
          onChange={setSelected}
        />
        <output>{selected.join(",")}</output>
      </>
    );
  }

  it("keeps the options' order no matter the click order", () => {
    render(<Harness />);

    fireEvent.click(screen.getByLabelText("Kitchen"));
    fireEvent.click(screen.getByLabelText("Wi-Fi"));

    expect(screen.getByRole("status")).toHaveTextContent("WIFI,KITCHEN");

    fireEvent.click(screen.getByLabelText("Wi-Fi"));

    expect(screen.getByRole("status")).toHaveTextContent("KITCHEN");
  });
});
