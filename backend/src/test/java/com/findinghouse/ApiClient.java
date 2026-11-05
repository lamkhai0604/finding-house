package com.findinghouse;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/** Minimal HTTP client for integration tests: sends JSON, returns status and body. */
public final class ApiClient {

  private final HttpClient client =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
  private final String baseUrl;

  public ApiClient(int port) {
    this.baseUrl = "http://localhost:" + port;
  }

  public HttpResponse<String> get(String path, String bearerToken) {
    return send(request(path, bearerToken).GET());
  }

  public HttpResponse<String> post(String path, String json) {
    return post(path, json, null);
  }

  public HttpResponse<String> post(String path, String json, String bearerToken) {
    return send(
        request(path, bearerToken)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json)));
  }

  public HttpResponse<String> put(String path, String json, String bearerToken) {
    return send(
        request(path, bearerToken)
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString(json)));
  }

  public HttpResponse<String> patch(String path, String json, String bearerToken) {
    return send(
        request(path, bearerToken)
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(json)));
  }

  private HttpRequest.Builder request(String path, String bearerToken) {
    HttpRequest.Builder builder =
        HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(Duration.ofSeconds(10));
    if (bearerToken != null) {
      builder.header("Authorization", "Bearer " + bearerToken);
    }
    return builder;
  }

  private HttpResponse<String> send(HttpRequest.Builder builder) {
    try {
      return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException(e);
    }
  }
}
