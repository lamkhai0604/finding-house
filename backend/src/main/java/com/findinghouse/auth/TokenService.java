package com.findinghouse.auth;

import com.findinghouse.config.JwtProperties;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Issues signed access tokens (D-009: HS256, fixed lifetime, no refresh token). */
@Service
public class TokenService {

  static final String ROLE_CLAIM = "role";

  private final JwtEncoder encoder;
  private final JwtProperties properties;
  private final Clock clock;

  public TokenService(JwtEncoder encoder, JwtProperties properties, Clock clock) {
    this.encoder = encoder;
    this.properties = properties;
    this.clock = clock;
  }

  public IssuedToken issue(UserAccount user) {
    Instant now = clock.instant();
    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(properties.issuer())
            .subject(String.valueOf(user.getId()))
            .issuedAt(now)
            .expiresAt(now.plus(properties.ttl()))
            .claim(ROLE_CLAIM, user.getRole().name())
            .build();
    JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
    String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    return new IssuedToken(token, properties.ttl().toSeconds());
  }

  public record IssuedToken(String value, long expiresInSeconds) {}
}
