import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { Role } from "../api/types";
import { useSession } from "../auth/session";
import { ButtonLink } from "./ButtonLink";
import { PageLoading } from "./Skeleton";
import { Spinner } from "./Spinner";
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
    return (
      <PageLoading label="Loading">
        <Spinner size="2rem" />
      </PageLoading>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user.role !== role) {
    const who = {
      LANDLORD: "landlord",
      TENANT: "tenant",
      ADMIN: "administrator",
    }[role];
    return (
      <StatusMessage
        title={
          {
            LANDLORD: "Landlords only",
            TENANT: "Tenants only",
            ADMIN: "Administrators only",
          }[role]
        }
      >
        <p>This page is for {who} accounts.</p>
        <ButtonLink to="/">Back to home</ButtonLink>
      </StatusMessage>
    );
  }
  return children;
}
