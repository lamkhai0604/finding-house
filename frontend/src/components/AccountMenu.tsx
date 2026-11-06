import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router";
import type { UserProfile } from "../api/types";
import { initials } from "../utils/format";

interface AccountMenuProps {
  user: UserProfile;
  onLogout: () => void;
}

/**
 * D-027: avatar button with a dropdown (My listings, Post a room, Log out). Closes on Escape, on a
 * click outside, and after choosing an item.
 */
export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const roleLabel = user.role === "LANDLORD" ? "Landlord" : "Tenant";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account-button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(user.displayName)}
        </span>
        <span className="account-name">
          {user.displayName} ({roleLabel})
        </span>
        <span className="sr-only">Account menu</span>
      </button>
      {open && (
        <div id={menuId} className="account-dropdown">
          <p className="account-email">{user.email}</p>
          {user.role === "LANDLORD" && (
            <>
              <Link to="/my/listings" onClick={() => setOpen(false)}>
                My listings
              </Link>
              <Link to="/listings/new" onClick={() => setOpen(false)}>
                Post a room
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
