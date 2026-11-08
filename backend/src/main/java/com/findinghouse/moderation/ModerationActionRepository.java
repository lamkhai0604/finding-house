package com.findinghouse.moderation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, Long> {

  List<ModerationAction> findTop50ByOrderByCreatedAtDescIdDesc();
}
