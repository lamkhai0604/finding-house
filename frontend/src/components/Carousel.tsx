import { useCallback, useId, useRef, useState } from "react";
import { Link } from "react-router";
import { ListingImage } from "./ListingImage";

export interface CarouselItem {
  id: string;
  imageUrl?: string;
  title: string;
  subtitle?: string;
  /** Optional link, e.g. to a listing once real listings are shown. */
  href?: string;
}

interface CarouselProps {
  label: string;
  items: CarouselItem[];
}

/**
 * D-027 / T-122: a horizontal row of cards that snaps into place. Previous/Next buttons, swipe on
 * touch screens, and arrow keys when focused. It never moves by itself.
 */
export function Carousel({ label, items }: CarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(items.length <= 1);

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }, []);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    const card = track?.querySelector<HTMLElement>("li");
    if (!track || !card) return;
    track.scrollBy({
      left: direction * (card.offsetWidth + 16),
      behavior: "smooth",
    });
  }

  return (
    <section
      className="carousel"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="carousel-controls">
        <button
          type="button"
          className="button button-secondary carousel-arrow"
          aria-controls={trackId}
          disabled={atStart}
          onClick={() => scrollByCard(-1)}
        >
          <span aria-hidden="true">‹</span>
          <span className="sr-only">Previous</span>
        </button>
        <button
          type="button"
          className="button button-secondary carousel-arrow"
          aria-controls={trackId}
          disabled={atEnd}
          onClick={() => scrollByCard(1)}
        >
          <span aria-hidden="true">›</span>
          <span className="sr-only">Next</span>
        </button>
      </div>
      <ul
        id={trackId}
        ref={trackRef}
        className="carousel-track"
        tabIndex={0}
        onScroll={updateEdges}
      >
        {items.map((item, index) => {
          const content = (
            <>
              <ListingImage
                src={item.imageUrl}
                alt=""
                className="carousel-image"
                linkToFullSize={false}
              />
              <span className="carousel-caption">
                <strong>{item.title}</strong>
                {item.subtitle && <span>{item.subtitle}</span>}
              </span>
            </>
          );
          return (
            <li
              key={item.id}
              className="carousel-slide"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${items.length}: ${item.title}`}
            >
              {item.href ? <Link to={item.href}>{content}</Link> : content}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
