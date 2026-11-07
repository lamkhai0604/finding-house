package com.findinghouse.ai;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * T-301 / T-304: a stand-in for an OpenAI-compatible provider on localhost. Each test sets the
 * status, body and delay it should answer with, and reads back what was sent. CI never talks to a
 * real provider and never needs a key.
 */
final class FakeAiServer implements AutoCloseable {

  private final HttpServer server;
  private final ExecutorService executor;
  private final AtomicInteger requests = new AtomicInteger();
  private volatile int status = 200;
  private volatile String body = "{}";
  private volatile long delayMillis;
  volatile String lastPath;
  volatile String lastAuthorization;
  volatile String lastBody;

  FakeAiServer() throws IOException {
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          requests.incrementAndGet();
          lastPath = exchange.getRequestURI().getPath();
          lastAuthorization = exchange.getRequestHeaders().getFirst("Authorization");
          lastBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
          if (delayMillis > 0) {
            try {
              Thread.sleep(delayMillis);
            } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
            }
          }
          byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().add("Content-Type", "application/json");
          try {
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
              out.write(bytes);
            }
          } catch (IOException e) {
            // The client gave up (timeout test); nothing to do.
          }
        });
    // One thread per request: a deliberately slow answer (the timeout case) must not hold up the
    // next test's request, or that one times out too and the tests depend on timing.
    executor = Executors.newCachedThreadPool();
    server.setExecutor(executor);
    server.start();
  }

  String baseUrl() {
    return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
  }

  /** Answers with a chat completion whose message content is {@code content}. */
  FakeAiServer replyWithContent(String content) {
    String escaped = content.replace("\\", "\\\\").replace("\"", "\\\"");
    return reply(
        200,
        """
        {"id":"x","object":"chat.completion","choices":[{"index":0,"message":\
        {"role":"assistant","content":"%s"},"finish_reason":"stop"}]}\
        """
            .formatted(escaped));
  }

  FakeAiServer reply(int status, String body) {
    this.status = status;
    this.body = body;
    return this;
  }

  FakeAiServer delay(long millis) {
    this.delayMillis = millis;
    return this;
  }

  int requestCount() {
    return requests.get();
  }

  @Override
  public void close() {
    server.stop(0);
    executor.shutdownNow();
  }
}
