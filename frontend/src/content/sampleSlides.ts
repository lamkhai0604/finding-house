import type { CarouselItem } from "../components/Carousel";

/**
 * SAMPLE CONTENT (T-122, D-027): placeholder photos and neighborhood blurbs for the home-page
 * carousel. They are not listings. Replace with the newest real listings once the browse API
 * (T-201) exists; the Carousel component does not need to change.
 */
export const SAMPLE_SLIDES: CarouselItem[] = [
  {
    id: "capitol-hill",
    imageUrl: "https://picsum.photos/seed/fh-hood-capitol/800/500",
    title: "Capitol Hill",
    subtitle: "Lively streets, cafés, and light rail",
  },
  {
    id: "university-district",
    imageUrl: "https://picsum.photos/seed/fh-hood-udistrict/800/500",
    title: "University District",
    subtitle: "Steps from campus, great for students",
  },
  {
    id: "ballard",
    imageUrl: "https://picsum.photos/seed/fh-hood-ballard/800/500",
    title: "Ballard",
    subtitle: "Breweries, the locks, and a weekend market",
  },
  {
    id: "fremont",
    imageUrl: "https://picsum.photos/seed/fh-hood-fremont/800/500",
    title: "Fremont",
    subtitle: "Quirky, creative, and close to the canal",
  },
  {
    id: "queen-anne",
    imageUrl: "https://picsum.photos/seed/fh-hood-queenanne/800/500",
    title: "Queen Anne",
    subtitle: "Quiet hills with city views",
  },
  {
    id: "west-seattle",
    imageUrl: "https://picsum.photos/seed/fh-hood-westseattle/800/500",
    title: "West Seattle",
    subtitle: "Beaches, parks, and more space",
  },
];
