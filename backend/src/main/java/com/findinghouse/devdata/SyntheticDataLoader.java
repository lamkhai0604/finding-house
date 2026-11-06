package com.findinghouse.devdata;

import com.findinghouse.devdata.SyntheticListings.SyntheticListing;
import com.findinghouse.listing.Amenity;
import com.findinghouse.listing.Market;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * T-203 (D-028): on startup under the {@code dev} profile, tops the database up to {@code
 * app.synthetic-data.listings} synthetic listings. It never exists in other profiles, so a
 * deployment cannot load fake data by accident.
 *
 * <p>Synthetic landlords use {@code @example.invalid} addresses and a password hash that matches no
 * password, so nobody can log in as them. Rows are inserted with plain JDBC in batches because
 * 10,000 listings through JPA would take minutes.
 */
@Component
@Profile("dev")
@EnableConfigurationProperties(SyntheticDataProperties.class)
public class SyntheticDataLoader implements ApplicationRunner {

  static final int LANDLORDS = 20;
  static final String EMAIL_DOMAIN = "@example.invalid";

  /** Not a BCrypt hash, so no password can ever match it. */
  static final String UNUSABLE_PASSWORD_HASH = "!synthetic-account-no-login";

  private static final int BATCH = 1_000;
  private static final Logger log = LoggerFactory.getLogger(SyntheticDataLoader.class);

  private final SyntheticDataProperties properties;
  private final JdbcTemplate jdbc;
  private final TransactionTemplate transactions;
  private final Clock clock;

  public SyntheticDataLoader(
      SyntheticDataProperties properties,
      JdbcTemplate jdbc,
      TransactionTemplate transactions,
      Clock clock) {
    this.properties = properties;
    this.jdbc = jdbc;
    this.transactions = transactions;
    this.clock = clock;
  }

  @Override
  public void run(ApplicationArguments args) {
    load();
  }

  /** Returns how many listings were added (0 when already at the target or turned off). */
  public int load() {
    int target = properties.listings();
    if (target == 0) {
      return 0;
    }
    long started = System.nanoTime();
    Integer added =
        transactions.execute(
            status -> {
              List<Long> landlords = ensureLandlords();
              int existing = countSyntheticListings();
              if (existing >= target) {
                return 0;
              }
              Instant now = clock.instant();
              for (int from = existing; from < target; from += BATCH) {
                int to = Math.min(from + BATCH, target);
                insert(landlords, from, to, now);
              }
              return target - existing;
            });
    int count = added == null ? 0 : added;
    if (count > 0) {
      log.warn(
          "Loaded {} synthetic listings (dev profile, target {}) in {} ms",
          count,
          target,
          (System.nanoTime() - started) / 1_000_000);
    }
    return count;
  }

  /** How many synthetic listings exist (for the dev tools and the performance test). */
  public int countSyntheticListings() {
    Integer count =
        jdbc.queryForObject(
            "SELECT count(*) FROM listings l JOIN users u ON u.id = l.landlord_id"
                + " WHERE u.email LIKE ?",
            Integer.class,
            "synthetic.landlord.%" + EMAIL_DOMAIN);
    return count == null ? 0 : count;
  }

  private List<Long> ensureLandlords() {
    List<Long> ids = new ArrayList<>(LANDLORDS);
    for (int i = 1; i <= LANDLORDS; i++) {
      String email = String.format("synthetic.landlord.%02d%s", i, EMAIL_DOMAIN);
      jdbc.update(
          "INSERT INTO users (email, password_hash, display_name, role, phone)"
              + " VALUES (?, ?, ?, 'LANDLORD', NULL) ON CONFLICT (email) DO NOTHING",
          email,
          UNUSABLE_PASSWORD_HASH,
          String.format("Synthetic Landlord %02d", i));
      ids.add(jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email));
    }
    return ids;
  }

  private void insert(List<Long> landlords, int from, int to, Instant now) {
    List<Long> ids =
        jdbc.queryForList(
            "SELECT nextval('listings_id_seq') FROM generate_series(1, ?)", Long.class, to - from);
    List<Object[]> listingRows = new ArrayList<>();
    List<Object[]> amenityRows = new ArrayList<>();
    List<Object[]> imageRows = new ArrayList<>();
    for (int index = from; index < to; index++) {
      SyntheticListing l = SyntheticListings.generate(properties.seed(), index, now);
      long id = ids.get(index - from);
      Timestamp created = Timestamp.from(l.createdAt());
      listingRows.add(
          new Object[] {
            id,
            landlords.get(index % landlords.size()),
            l.title(),
            l.description(),
            l.monthlyPriceCents(),
            l.areaSqft(),
            Market.CITY,
            l.neighborhood(),
            l.address(),
            l.status().name(),
            created,
            created
          });
      for (Amenity amenity : l.amenities()) {
        amenityRows.add(new Object[] {id, amenity.name()});
      }
      for (int position = 0; position < l.imageUrls().size(); position++) {
        imageRows.add(new Object[] {id, position, l.imageUrls().get(position)});
      }
    }
    jdbc.batchUpdate(
        "INSERT INTO listings (id, landlord_id, title, description, monthly_price_cents,"
            + " area_sqft, city, neighborhood, address, status, created_at, updated_at)"
            + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        listingRows);
    jdbc.batchUpdate(
        "INSERT INTO listing_amenities (listing_id, amenity) VALUES (?, ?)", amenityRows);
    jdbc.batchUpdate(
        "INSERT INTO listing_images (listing_id, position, url) VALUES (?, ?, ?)", imageRows);
  }
}
