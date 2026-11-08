import { useId, type ReactNode } from "react";
import type { Role } from "../api/types";

const SEARCH_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

const KEY_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="15" r="4.5" />
    <path d="m11.2 11.8 8.3-8.3M16.5 6.5l2.5 2.5M14 9l2 2" />
  </svg>
);

const CHOICES: {
  role: Role;
  title: string;
  badge: string;
  detail: string;
  icon: ReactNode;
}[] = [
  {
    role: "TENANT",
    title: "Find a room",
    badge: "Tenant",
    detail:
      "I'm looking for a place to rent. Browse rooms, ask in plain words and save the ones I like.",
    icon: SEARCH_ICON,
  },
  {
    role: "LANDLORD",
    title: "Rent out a room",
    badge: "Landlord",
    detail:
      "I have a room or home to rent out. Post it with photos and manage my listings.",
    icon: KEY_ICON,
  },
];

interface RoleChoiceProps {
  value: Role;
  onChange: (role: Role) => void;
  error?: string;
}

/** Account type at sign-up as two cards. Native radios keep keyboard and screen-reader support. */
export function RoleChoice({ value, onChange, error }: RoleChoiceProps) {
  const name = useId();
  const errorId = error ? `${name}-error` : undefined;
  return (
    <fieldset
      className="field role-choice"
      aria-describedby={errorId}
      aria-invalid={error ? true : undefined}
    >
      <legend>I want to</legend>
      <div className="role-cards">
        {CHOICES.map((choice) => (
          <label key={choice.role} className="role-card">
            <input
              type="radio"
              name={name}
              value={choice.role}
              checked={value === choice.role}
              onChange={() => onChange(choice.role)}
            />
            <span className="role-card-icon" aria-hidden="true">
              {choice.icon}
            </span>
            <span className="role-card-title">{choice.title}</span>
            {/* T-219: the same word and colour as the badge next to the name after sign-up. */}
            <span
              className={`role-badge role-${choice.role.toLowerCase()} role-card-badge`}
            >
              {choice.badge} account
            </span>
            <span className="role-card-detail">{choice.detail}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
