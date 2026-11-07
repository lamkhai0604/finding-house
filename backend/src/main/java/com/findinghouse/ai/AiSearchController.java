package com.findinghouse.ai;

import com.findinghouse.ai.InterpretDtos.AvailabilityResponse;
import com.findinghouse.ai.InterpretDtos.InterpretRequest;
import com.findinghouse.ai.InterpretDtos.InterpretResponse;
import com.findinghouse.common.ClientAddressResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * T-302 (FR-05): plain-language search. Public, like browse. It only returns filters; the client
 * then runs the normal browse search with them, so results, sharing and Back work as for manual
 * filters, and manual search keeps working whatever happens here (NFR-04).
 */
@RestController
@RequestMapping("/api/v1/search/interpret")
public class AiSearchController {

  private final InterpretService service;
  private final AiSearchThrottle throttle;
  private final ClientAddressResolver clientAddress;

  public AiSearchController(
      InterpretService service, AiSearchThrottle throttle, ClientAddressResolver clientAddress) {
    this.service = service;
    this.throttle = throttle;
    this.clientAddress = clientAddress;
  }

  /** Lets the UI hide the search box when no provider is configured. */
  @GetMapping
  public AvailabilityResponse availability() {
    return new AvailabilityResponse(service.available());
  }

  @PostMapping
  public InterpretResponse interpret(
      @Valid @RequestBody InterpretRequest request, HttpServletRequest httpRequest) {
    if (!service.available()) {
      throw new AiException(AiException.Kind.UNAVAILABLE, "AI search is not configured");
    }
    throttle
        .tryAcquire(clientAddress.resolve(httpRequest))
        .ifPresent(
            refusal -> {
              throw refusal.perAddress()
                  ? new AiSearchLimitException(refusal.retryAfter())
                  : new AiException(
                      AiException.Kind.BUSY,
                      "AI search budget used up",
                      null,
                      refusal.retryAfter());
            });
    return service.interpret(request.query());
  }
}
