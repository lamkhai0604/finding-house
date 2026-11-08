package com.findinghouse.moderation;

import com.findinghouse.auth.UserAccount;
import com.findinghouse.auth.UserAccountRepository;
import com.findinghouse.common.ConflictException;
import com.findinghouse.common.NotFoundException;
import com.findinghouse.listing.Listing;
import com.findinghouse.listing.ListingRepository;
import com.findinghouse.listing.ListingStatus;
import com.findinghouse.moderation.ModerationAction.Kind;
import com.findinghouse.moderation.ModerationDtos.ActionItem;
import com.findinghouse.moderation.ModerationDtos.ListingSummary;
import com.findinghouse.moderation.ModerationDtos.ReportGroup;
import com.findinghouse.moderation.ModerationDtos.ReportItem;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-08 AC2 to AC4 and D-037: the report queue and the three administrator actions. Each action
 * changes the listing and its reports and writes its record in one transaction.
 */
@Service
public class ModerationService {

  private final ListingReportRepository reports;
  private final ModerationActionRepository actions;
  private final ListingRepository listings;
  private final UserAccountRepository users;
  private final Clock clock;

  public ModerationService(
      ListingReportRepository reports,
      ModerationActionRepository actions,
      ListingRepository listings,
      UserAccountRepository users,
      Clock clock) {
    this.reports = reports;
    this.actions = actions;
    this.listings = listings;
    this.users = users;
    this.clock = clock;
  }

  /** Open reports grouped by listing, the listing with the newest report first. */
  @Transactional(readOnly = true)
  public List<ReportGroup> openReports() {
    List<ListingReport> open = reports.findByStatusOrderByCreatedAtDesc(ReportStatus.OPEN);
    Map<Long, List<ListingReport>> byListing = new LinkedHashMap<>();
    open.forEach(r -> byListing.computeIfAbsent(r.getListingId(), id -> new ArrayList<>()).add(r));
    Map<Long, Listing> listingById =
        listings.findAllById(byListing.keySet()).stream()
            .collect(Collectors.toMap(Listing::getId, Function.identity()));
    Map<Long, String> names =
        names(
            listingById.values().stream().map(Listing::getLandlordId).collect(Collectors.toSet()));
    List<ReportGroup> groups = new ArrayList<>();
    byListing.forEach(
        (listingId, list) -> {
          Listing listing = listingById.get(listingId);
          if (listing == null) {
            return;
          }
          Map<ReportReason, Integer> reasons = new EnumMap<>(ReportReason.class);
          list.forEach(r -> reasons.merge(r.getReason(), 1, Integer::sum));
          groups.add(
              new ReportGroup(
                  summary(listing, names),
                  list.size(),
                  reasons,
                  list.stream()
                      .map(r -> new ReportItem(r.getReason(), r.getNote(), r.getCreatedAt()))
                      .toList(),
                  list.getFirst().getCreatedAt()));
        });
    return groups;
  }

  /** Removed listings, newest change first, so an administrator can restore one. */
  @Transactional(readOnly = true)
  public List<ListingSummary> removedListings() {
    List<Listing> removed = listings.findByStatusOrderByUpdatedAtDescIdDesc(ListingStatus.REMOVED);
    Map<Long, String> names =
        names(removed.stream().map(Listing::getLandlordId).collect(Collectors.toSet()));
    return removed.stream().map(l -> summary(l, names)).toList();
  }

  @Transactional(readOnly = true)
  public List<ActionItem> recentActions() {
    List<ModerationAction> recent = actions.findTop50ByOrderByCreatedAtDescIdDesc();
    Map<Long, String> names =
        names(recent.stream().map(ModerationAction::getAdminId).collect(Collectors.toSet()));
    return recent.stream()
        .map(
            a ->
                new ActionItem(
                    a.getId(),
                    a.getListingId(),
                    a.getListingTitle(),
                    names.get(a.getAdminId()),
                    a.getAction(),
                    a.getReason(),
                    a.getCreatedAt()))
        .toList();
  }

  @Transactional
  public Listing remove(long listingId, long adminId, String reason) {
    Listing listing = find(listingId);
    if (listing.getStatus() == ListingStatus.REMOVED) {
      throw new ConflictException("This listing is already removed");
    }
    Instant now = clock.instant();
    String cleanReason = reason.strip();
    listing.remove(cleanReason, now);
    resolveOpenReports(listingId, ReportStatus.ACTIONED, adminId, now);
    record(listing, adminId, Kind.REMOVE, cleanReason, now);
    return listing;
  }

  /** D-037: a restored listing comes back hidden, so its owner decides when to show it again. */
  @Transactional
  public Listing restore(long listingId, long adminId) {
    Listing listing = find(listingId);
    if (listing.getStatus() != ListingStatus.REMOVED) {
      throw new ConflictException("Only a removed listing can be restored");
    }
    Instant now = clock.instant();
    listing.restore(now);
    record(listing, adminId, Kind.RESTORE, null, now);
    return listing;
  }

  @Transactional
  public void dismiss(long listingId, long adminId, String reason) {
    Listing listing = find(listingId);
    Instant now = clock.instant();
    if (resolveOpenReports(listingId, ReportStatus.DISMISSED, adminId, now) == 0) {
      throw new ConflictException("This listing has no open reports");
    }
    String cleanReason = reason == null || reason.isBlank() ? null : reason.strip();
    record(listing, adminId, Kind.DISMISS, cleanReason, now);
  }

  private int resolveOpenReports(long listingId, ReportStatus outcome, long adminId, Instant now) {
    List<ListingReport> open = reports.findByListingIdAndStatus(listingId, ReportStatus.OPEN);
    open.forEach(r -> r.resolve(outcome, adminId, now));
    return open.size();
  }

  private void record(Listing listing, long adminId, Kind kind, String reason, Instant now) {
    actions.save(
        new ModerationAction(listing.getId(), listing.getTitle(), adminId, kind, reason, now));
  }

  private Listing find(long listingId) {
    return listings
        .findById(listingId)
        .orElseThrow(() -> new NotFoundException("Listing not found"));
  }

  private Map<Long, String> names(Set<Long> userIds) {
    return users.findAllById(userIds).stream()
        .collect(Collectors.toMap(UserAccount::getId, UserAccount::getDisplayName));
  }

  private static ListingSummary summary(Listing listing, Map<Long, String> names) {
    return new ListingSummary(
        listing.getId(),
        listing.getTitle(),
        listing.getNeighborhood(),
        listing.getStatus(),
        names.get(listing.getLandlordId()),
        listing.getRemovedReason());
  }
}
