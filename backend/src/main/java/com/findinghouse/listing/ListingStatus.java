package com.findinghouse.listing;

/**
 * FR-02 AC3: new listings are ACTIVE; the owner can hide and unhide them. REMOVED (FR-08, D-037) is
 * set and cleared only by an administrator.
 */
public enum ListingStatus {
  ACTIVE,
  HIDDEN,
  REMOVED;

  /** The statuses an owner may choose. */
  public boolean ownerCanSet() {
    return this != REMOVED;
  }
}
