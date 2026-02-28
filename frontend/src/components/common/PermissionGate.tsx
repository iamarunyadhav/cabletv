import { ReactNode, useMemo } from "react";

/**
 * SECURITY WARNING: This component is for UI convenience only (hiding buttons/features).
 * 
 * ⚠️ DO NOT rely on this for actual security enforcement! ⚠️
 * 
 * This reads permissions from localStorage which users can easily manipulate via browser DevTools.
 * ALL real authorization MUST be enforced server-side via:
 * 1. RLS (Row Level Security) policies on database tables
 * 2. Role checks in edge functions using is_admin() and has_role()
 * 3. JWT token validation
 * 
 * This component only provides a better UX by hiding UI elements users shouldn't access.
 * Server-side checks are the ONLY security that matters.
 */
const PERMISSIONS_STORAGE_KEY = "app_permissions";

const readPermissions = (): string[] => {
  if (typeof window === "undefined") {
    return ["*"];
  }

  const persisted = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);

  if (!persisted) {
    return ["*"];
  }

  try {
    const parsed = JSON.parse(persisted);
    if (Array.isArray(parsed)) {
      return parsed.map((entry) => String(entry));
    }
  } catch {
    /* ignored */
  }

  return persisted
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

interface PermissionGateProps {
  required?: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  required,
  fallback = null,
  children,
}: PermissionGateProps) {
  const permissions = useMemo(() => readPermissions(), []);

  const requiredList = Array.isArray(required)
    ? required
    : required
    ? [required]
    : [];

  const isAllowed =
    requiredList.length === 0 ||
    requiredList.some(
      (permission) =>
        permissions.includes(permission) || permissions.includes("*")
    );

  return <>{isAllowed ? children : fallback}</>;
}
