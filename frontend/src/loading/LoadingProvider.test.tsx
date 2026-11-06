import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLoadingSignal } from "./loading";
import { LoadingProvider, SLOW_AFTER_MS } from "./LoadingProvider";

function Waiting({ active }: { active: boolean }) {
  useLoadingSignal(active);
  return null;
}

function bar() {
  return document.querySelector(".nav-progress")!;
}

describe("LoadingProvider (T-217)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs the progress line at once while something waits, and finishes it after", () => {
    const { rerender } = render(
      <LoadingProvider>
        <Waiting active={false} />
      </LoadingProvider>,
    );
    expect(bar()).toHaveAttribute("data-state", "idle");

    rerender(
      <LoadingProvider>
        <Waiting active />
      </LoadingProvider>,
    );
    expect(bar()).toHaveAttribute("data-state", "loading");

    rerender(
      <LoadingProvider>
        <Waiting active={false} />
      </LoadingProvider>,
    );
    expect(bar()).toHaveAttribute("data-state", "done");
    act(() => vi.advanceTimersByTime(400));
    expect(bar()).toHaveAttribute("data-state", "idle");
  });

  it("explains a slow wait, and only while the wait lasts", () => {
    const { rerender } = render(
      <LoadingProvider>
        <Waiting active />
        <Waiting active />
      </LoadingProvider>,
    );
    act(() => vi.advanceTimersByTime(SLOW_AFTER_MS - 100));
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Waking up the server",
    );

    // One of two still waiting: the notice stays.
    rerender(
      <LoadingProvider>
        <Waiting active />
        <Waiting active={false} />
      </LoadingProvider>,
    );
    expect(screen.getByText(/Waking up the server/)).toBeInTheDocument();

    rerender(
      <LoadingProvider>
        <Waiting active={false} />
        <Waiting active={false} />
      </LoadingProvider>,
    );
    expect(screen.queryByText(/Waking up the server/)).not.toBeInTheDocument();
  });
});
