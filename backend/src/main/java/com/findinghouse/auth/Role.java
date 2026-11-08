package com.findinghouse.auth;

/** FR-01 roles. ADMIN (FR-08, D-036) is granted only by configuration, never at sign-up. */
public enum Role {
  TENANT,
  LANDLORD,
  ADMIN
}
