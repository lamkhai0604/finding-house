package com.findinghouse.ai;

/** T-301 (FR-05): turns a plain-language room search into filter values. */
public interface QueryParser {

  /**
   * Reads the search sentence. Only the sentence itself is sent to the provider: no account,
   * address or other user data.
   *
   * @throws AiException when the provider is off, slow, busy, or answers with something unusable
   */
  ParsedQuery parse(String query);
}
