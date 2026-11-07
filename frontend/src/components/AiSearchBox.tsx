import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { interpretQuery } from "../api/aiSearch";
import { ApiError } from "../api/client";
import {
  MAX_QUERY_LENGTH,
  toFilterValues,
  useAiSearchAvailable,
  type AiSearchState,
} from "../ai/aiSearch";
import { filtersToParams } from "../browse/filters";
import { Button } from "./Button";

interface AiSearchBoxProps {
  /** "hero" on the home page, "band" in the browse page's colour band. */
  placement: "hero" | "band";
}

/**
 * T-303 (FR-05): "describe the room you want". The sentence goes to the API, which returns
 * filters; the browse page then opens with them, exactly as if they had been set by hand, and
 * shows them as chips that can be removed. Hidden when AI search is off.
 */
export function AiSearchBox({ placement }: AiSearchBoxProps) {
  const available = useAiSearchAvailable();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputId = useId();
  const messageId = useId();

  if (!available) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      setMessage(
        "Describe the room first, for example: “room in Ballard under $1,200 with laundry”.",
      );
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await interpretQuery(text);
      if (!result.understood) {
        setMessage(
          result.notes[0] ??
            "That does not look like a room search. Try the neighborhood, rent or amenities.",
        );
        return;
      }
      const state: AiSearchState = { aiQuery: text, aiNotes: result.notes };
      navigate(`/browse?${filtersToParams(toFilterValues(result.filters))}`, {
        state,
      });
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.status !== 0
          ? error.message
          : "AI search is not reachable right now. The filters still work.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`ai-search ai-search-${placement}`}
      role="search"
      aria-label="Describe the room you want"
      noValidate
      onSubmit={submit}
    >
      <label htmlFor={inputId} className="ai-search-label">
        <span className="ai-spark" aria-hidden="true">
          ✦
        </span>
        Or just describe it
      </label>
      <div className="ai-search-row">
        <input
          id={inputId}
          type="text"
          value={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Quiet room near the light rail under $1,300 with laundry"
          aria-describedby={messageId}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="primary" busy={busy}>
          Ask
        </Button>
      </div>
      <p
        id={messageId}
        className={message ? "ai-search-help ai-search-message" : "ai-search-help"}
        aria-live="polite"
      >
        {message ??
          "Please don't include names, phone numbers or other personal details."}
      </p>
    </form>
  );
}
