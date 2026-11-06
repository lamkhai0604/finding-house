package com.findinghouse.listing;

/**
 * T-210: how many rooms are shown in one neighborhood and the lowest rent among them. {@code
 * lowestMonthlyPriceCents} is null when the neighborhood has no shown rooms.
 */
public record NeighborhoodStats(
    String neighborhood, Long activeListings, Long lowestMonthlyPriceCents) {}
