import { apiClient } from "@/lib/apiClient";

export interface CompanyProfile {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

let cachedProfile: CompanyProfile | null = null;
let inflightRequest: Promise<CompanyProfile> | null = null;

const buildProfile = (settings: Record<string, string>): CompanyProfile => {
  const fallbackName =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_APP_NAME) || "Cable TV Network";

  return {
    name: settings.company_name?.trim() || fallbackName,
    address: settings.company_address?.trim() || "",
    phone: settings.company_phone?.trim() || "",
    email: settings.company_email?.trim() || "",
  };
};

export const fetchCompanyProfile = async (): Promise<CompanyProfile> => {
  if (cachedProfile) return cachedProfile;
  if (inflightRequest) return inflightRequest;

  inflightRequest = (async () => {
    try {
      const response = await apiClient.get("/settings", {
        params: { keys: "company_name,company_address,company_phone,company_email" },
      });
      const rows = response.data?.data ?? response.data ?? [];
      const settings = Array.isArray(rows)
        ? rows.reduce<Record<string, string>>((acc, row) => {
            acc[row.key] = String(row.value ?? "");
            return acc;
          }, {})
        : {};

      cachedProfile = buildProfile(settings);
      return cachedProfile;
    } catch (error) {
      cachedProfile = buildProfile({});
      return cachedProfile;
    } finally {
      inflightRequest = null;
    }
  })();

  return inflightRequest;
};

export const clearCachedCompanyProfile = () => {
  cachedProfile = null;
  inflightRequest = null;
};
