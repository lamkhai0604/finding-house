package com.findinghouse;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * Full application on a random port with a real PostgreSQL. All integration tests use the same
 * settings so Spring reuses one application context and one container.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      IntegrationTest.TEST_JWT_SECRET_PROPERTY,
      // All tests share one client address (localhost); the per-address limit is unit-tested.
      "app.login-throttle.max-failures-per-address=100000",
      // Lets tests count SQL statements (e.g. no N+1 queries when browsing).
      "spring.jpa.properties.hibernate.generate_statistics=true"
    })
@Import(TestcontainersConfiguration.class)
public @interface IntegrationTest {

  /** Test-only signing key; never used outside tests. */
  String TEST_JWT_SECRET = "test-only-jwt-secret-0123456789-abcdefghij";

  String TEST_JWT_SECRET_PROPERTY = "app.jwt.secret=" + TEST_JWT_SECRET;
}
