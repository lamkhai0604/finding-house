package com.findinghouse.ai;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** T-301: wires the AI search provider from {@code app.ai.*} (off when no key is set). */
@Configuration
@EnableConfigurationProperties(AiProperties.class)
public class AiConfig {

  @Bean
  QueryParser queryParser(AiProperties properties) {
    return new OpenAiCompatibleQueryParser(properties);
  }
}
