import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import type { Role } from "../api/types";
import { useSession } from "../auth/session";
import { StatusMessage } from "./StatusMessage";

interface RequireRoleProps {
  role: Role;
  children: ReactNode;
}

/**
 * Guards a page: anonymous visitors go to the login page (and come back after logging in);
 * users with another role see an explanation. The server still enforces this (FR-01 AC5).
 */
export function RequireRole({ role, children }: RequireRoleProps) {
  const { status, user } = useSession();
  const location = useLocation();

  if (status === "loading") {
    return <StatusMessage title="Loading…" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) {
    return (
      <StatusMessage
        title={role === "LANDLORD" ? "Landlords only" : "Tenants only"}
      >
        <p>This page is for {role === "LANDLORD" ? "landlord" : "tenant"} accounts.</p>
        <Link to="/">Back to home</Link>
      </StatusMessage>
    );
  }
  return children;
}
