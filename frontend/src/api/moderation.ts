import { apiRequest } from "./client";
import type {
  Listing,
  ModerationActionItem,
  ModerationListing,
  ReportGroup,
  ReportReason,
} from "./types";

/** FR-08 AC1: any signed-in user reports someone else's active listing (D-038). */
export async function reportListing(
  listingId: number,
  reason: ReportReason,
  note: string,
): Promise<void> {
  await apiRequest("POST", `/api/v1/listings/${listingId}/reports`, {
    reason,
    note: note.trim() === "" ? null : note.trim(),
  });
}

export function getReportQueue(): Promise<ReportGroup[]> {
  return apiRequest("GET", "/api/v1/admin/reports");
}

export function getRemovedListings(): Promise<ModerationListing[]> {
  return apiRequest("GET", "/api/v1/admin/listings/removed");
}

export function getModerationActions(): Promise<ModerationActionItem[]> {
  return apiRequest("GET", "/api/v1/admin/actions");
}

export function removeListing(id: number, reason: string): Promise<Listing> {
  return apiRequest("POST", `/api/v1/admin/listings/${id}/remove`, { reason });
}

export function restoreListing(id: number): Promise<Listing> {
  return apiRequest("POST", `/api/v1/admin/listings/${id}/restore`);
}

export async function dismissReports(id: number): Promise<void> {
  await apiRequest<null>("POST", `/api/v1/admin/listings/${id}/dismiss`, {});
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SCAM", label: "Scam or fraud" },
  { value: "WRONG_INFO", label: "Wrong information" },
  { value: "UNAVAILABLE", label: "No longer available" },
  { value: "OFFENSIVE", label: "Offensive" },
  { value: "OTHER", label: "Other" },
];

export function reasonLabel(reason: ReportReason): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}
