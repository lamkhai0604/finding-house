package com.findinghouse.config;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

/**
 * Stateless bearer-token security (D-009). CSRF protection is disabled because the API uses no
 * cookies or sessions: every request must carry an Authorization header.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

  private static final String UNAUTHORIZED_BODY =
      "{\"code\":\"UNAUTHORIZED\",\"message\":\"Authentication required\",\"fieldErrors\":[]}";
  private static final String FORBIDDEN_BODY =
      "{\"code\":\"FORBIDDEN\",\"message\":\"Not allowed\",\"fieldErrors\":[]}";

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/actuator/health", "/api/v1/reference-data")
                    .permitAll()
                    // FR-02: only landlords create listings or have a "my listings" page.
                    // Editing and status changes are checked for ownership in ListingService.
                    .requestMatchers(HttpMethod.POST, "/api/v1/listings")
                    .hasRole("LANDLORD")
                    .requestMatchers(HttpMethod.GET, "/api/v1/me/listings")
                    .hasRole("LANDLORD")
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                    .authenticationEntryPoint(unauthorizedEntryPoint()))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(unauthorizedEntryPoint())
                    .accessDeniedHandler(forbiddenHandler()));
    return http.build();
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  JwtEncoder jwtEncoder(JwtProperties properties) {
    return NimbusJwtEncoder.withSecretKey(secretKey(properties)).build();
  }

  @Bean
  JwtDecoder jwtDecoder(JwtProperties properties) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(secretKey(properties))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
    return decoder;
  }

  private static SecretKey secretKey(JwtProperties properties) {
    return new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  private static JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthoritiesClaimName("role");
    authorities.setAuthorityPrefix("ROLE_");
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);
    return converter;
  }

  private static AuthenticationEntryPoint unauthorizedEntryPoint() {
    return (request, response, exception) ->
        writeJson(response, HttpStatus.UNAUTHORIZED, UNAUTHORIZED_BODY);
  }

  private static AccessDeniedHandler forbiddenHandler() {
    return (request, response, exception) ->
        writeJson(response, HttpStatus.FORBIDDEN, FORBIDDEN_BODY);
  }

  private static void writeJson(
      jakarta.servlet.http.HttpServletResponse response, HttpStatus status, String body)
      throws java.io.IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write(body);
  }
}
