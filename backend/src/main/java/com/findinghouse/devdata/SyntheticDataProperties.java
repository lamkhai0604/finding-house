package com.findinghouse.devdata;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * T-203: synthetic data for development and load tests. Only read under the {@code dev} profile
 * (see {@link SyntheticDataLoader}); {@code listings = 0} turns it off.
 */
@ConfigurationProperties(prefix = "app.synthetic-data")
public record SyntheticDataProperties(int listings, long seed) {

  /** Upper bound so a typo cannot fill a laptop's disk. */
  public static final int MAX_LISTINGS = 100_000;

  public SyntheticDataProperties {
    if (listings < 0 || listings > MAX_LISTINGS) {
      throw new IllegalStateException(
          "app.synthetic-data.listings must be between 0 and " + MAX_LISTINGS);
    }
  }
}
