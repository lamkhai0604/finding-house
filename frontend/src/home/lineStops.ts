/** T-210: the Link light rail 1 Line, north to south, as neighborhoods the market knows. */
export const LINE_STOPS: { neighborhood: string; label: string }[] = [
  { neighborhood: "Northgate", label: "Northgate" },
  { neighborhood: "Roosevelt", label: "Roosevelt" },
  { neighborhood: "University District", label: "U District" },
  { neighborhood: "Capitol Hill", label: "Capitol Hill" },
  { neighborhood: "Downtown", label: "Downtown" },
  { neighborhood: "Beacon Hill", label: "Beacon Hill" },
  { neighborhood: "Columbia City", label: "Columbia City" },
];

/**
 * T-212: every Market neighborhood with a 1 Line station, north to south, for "Getting around" on
 * a listing. Longer than LINE_STOPS, which keeps the home strip to seven stops.
 */
export const LINE_ORDER: { neighborhood: string; label: string }[] = [
  { neighborhood: "Northgate", label: "Northgate" },
  { neighborhood: "Roosevelt", label: "Roosevelt" },
  { neighborhood: "University District", label: "U District" },
  { neighborhood: "Capitol Hill", label: "Capitol Hill" },
  { neighborhood: "Downtown", label: "Downtown" },
  { neighborhood: "International District", label: "Intl District" },
  { neighborhood: "Beacon Hill", label: "Beacon Hill" },
  { neighborhood: "Columbia City", label: "Columbia City" },
  { neighborhood: "Rainier Valley", label: "Rainier Valley" },
];
