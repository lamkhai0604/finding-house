import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImageGallery } from "./ImageGallery";
import { ListingImage } from "./ListingImage";

describe("ListingImage (FR-02 AC7)", () => {
  it("shows the photo as a link to the full-size image", () => {
    render(<ListingImage src="https://example.com/a.jpg" alt="Studio" />);

    const image = screen.getByRole("img", { name: "Studio" });
    expect(image).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/a.jpg");
  });

  it("shows a placeholder when there is no link", () => {
    render(<ListingImage alt="Studio" />);

    expect(screen.getByRole("img", { name: "No photo available" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("switches to the placeholder when the image fails to load", () => {
    render(<ListingImage src="https://example.invalid/x.jpg" alt="Studio" />);

    fireEvent.error(screen.getByRole("img", { name: "Studio" }));

    expect(screen.getByRole("img", { name: "No photo available" })).toBeInTheDocument();
  });
});

describe("ImageGallery", () => {
  it("shows every photo", () => {
    render(
      <ImageGallery
        title="Loft"
        urls={["https://example.com/1.jpg", "https://example.com/2.jpg"]}
      />,
    );

    expect(screen.getByRole("img", { name: "Loft, photo 1" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Loft, photo 2" })).toBeInTheDocument();
  });

  it("shows a single placeholder for a listing without photos", () => {
    render(<ImageGallery title="Room" urls={[]} />);

    expect(screen.getAllByRole("img", { name: "No photo available" })).toHaveLength(1);
  });
});
