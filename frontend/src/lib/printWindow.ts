export type PrintDocumentType = "invoice" | "receipt";

interface OpenPrintWindowParams {
  type: PrintDocumentType;
  id: string;
}

export const buildPrintUrl = ({ type, id }: OpenPrintWindowParams): string => {
  const url = new URL("/print", window.location.origin);
  url.searchParams.set("type", type);
  url.searchParams.set("id", id);
  return url.toString();
};

export const openPrintWindow = ({ type, id }: OpenPrintWindowParams): Window => {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    throw new Error("Cannot print without a document id.");
  }

  const popup = window.open(
    buildPrintUrl({ type, id: normalizedId }),
    "_blank",
    "width=900,height=760,noopener,noreferrer",
  );

  if (!popup) {
    throw new Error("Popup blocked. Please allow popups for this site and try again.");
  }

  popup.focus();
  return popup;
};
