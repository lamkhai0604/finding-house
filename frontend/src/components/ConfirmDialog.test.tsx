import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness({ onConfirm }: { onConfirm: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <ConfirmDialog
        open={open}
        title="Delete this listing?"
        confirmLabel="Delete listing"
        onConfirm={async () => {
          await onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      >
        <p>This cannot be undone.</p>
      </ConfirmDialog>
    </>
  );
}

describe("ConfirmDialog (D-026)", () => {
  it("opens as a labelled modal with focus on Cancel", () => {
    render(<Harness onConfirm={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    const dialog = screen.getByRole("dialog", { name: "Delete this listing?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("does nothing on Cancel, Escape, or a click outside, and returns focus", () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const opener = screen.getByRole("button", { name: "Open" });

    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(opener);
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps Tab inside the dialog", () => {
    render(<Harness onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const confirm = screen.getByRole("button", { name: "Delete listing" });

    confirm.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("shows an error and stays open when confirming fails", async () => {
    render(
      <Harness
        onConfirm={() => Promise.reject(new Error("Could not delete"))}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete listing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not delete",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes after a successful confirm", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete listing" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
