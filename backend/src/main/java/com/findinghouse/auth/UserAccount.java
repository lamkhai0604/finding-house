package com.findinghouse.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** A registered user. Named UserAccount to avoid clashing with Spring Security's User. */
@Entity
@Table(name = "users")
public class UserAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 254)
  private String email;

  @Column(name = "password_hash", nullable = false, length = 100)
  private String passwordHash;

  @Column(name = "display_name", nullable = false, length = 50)
  private String displayName;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Role role;

  @Column(length = 30)
  private String phone;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected UserAccount() {
    // for JPA
  }

  public UserAccount(
      String email,
      String passwordHash,
      String displayName,
      Role role,
      String phone,
      Instant createdAt) {
    this.email = email;
    this.passwordHash = passwordHash;
    this.displayName = displayName;
    this.role = role;
    this.phone = phone;
    this.createdAt = createdAt;
  }

  /** D-036: only tenant accounts are promoted, so no listing or phone is left on an admin. */
  public void promoteToAdmin() {
    if (role != Role.TENANT) {
      throw new IllegalStateException("Only tenant accounts can become administrators");
    }
    this.role = Role.ADMIN;
  }

  public Long getId() {
    return id;
  }

  public String getEmail() {
    return email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public String getDisplayName() {
    return displayName;
  }

  public Role getRole() {
    return role;
  }

  public String getPhone() {
    return phone;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
