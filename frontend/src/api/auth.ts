import { apiRequest } from "./client";
import type { RegisterRequest, TokenResponse, UserProfile } from "./types";

export function registerAccount(request: RegisterRequest): Promise<UserProfile> {
  return apiRequest("POST", "/api/v1/auth/register", request);
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiRequest("POST", "/api/v1/auth/login", { email, password });
}

export function fetchCurrentUser(): Promise<UserProfile> {
  return apiRequest("GET", "/api/v1/me");
}
