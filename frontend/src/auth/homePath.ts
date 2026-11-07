import type { UserProfile } from "../api/types";

/** Where each role starts after logging in or signing up: landlords manage their rooms. */
export function homePathFor(user: Pick<UserProfile, "role">): string {
  return user.role === "LANDLORD" ? "/my/listings" : "/";
}

export function roleLabel(user: Pick<UserProfile, "role">): string {
  return user.role === "LANDLORD" ? "Landlord" : "Tenant";
}
