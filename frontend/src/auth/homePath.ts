import type { UserProfile } from "../api/types";

/** Where each role starts after logging in: landlords manage rooms, admins review reports. */
export function homePathFor(user: Pick<UserProfile, "role">): string {
  if (user.role === "LANDLORD") return "/my/listings";
  if (user.role === "ADMIN") return "/admin";
  return "/";
}

export function roleLabel(user: Pick<UserProfile, "role">): string {
  if (user.role === "LANDLORD") return "Landlord";
  if (user.role === "ADMIN") return "Admin";
  return "Tenant";
}
