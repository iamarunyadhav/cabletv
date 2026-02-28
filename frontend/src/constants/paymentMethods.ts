export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", requiresReference: false, placeholder: "Optional reference" },
  { value: "cheque", label: "Cheque", requiresReference: true, placeholder: "Cheque number" },
  { value: "bank_transfer", label: "Bank Transfer", requiresReference: false, placeholder: "Transaction / bank reference" },
  { value: "credit_card", label: "Card", requiresReference: false, placeholder: "Card/transaction reference" },
  { value: "upi", label: "UPI / Online", requiresReference: false, placeholder: "UPI / online reference" },
  { value: "other", label: "Other", requiresReference: false, placeholder: "Reference (optional)" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export const getPaymentMethodLabel = (value: string) =>
  PAYMENT_METHODS.find((item) => item.value === value)?.label ?? value.replace(/_/g, " ");

export const methodRequiresReference = (value?: string) =>
  PAYMENT_METHODS.find((item) => item.value === value)?.requiresReference ?? false;

export const referencePlaceholder = (value?: string) =>
  PAYMENT_METHODS.find((item) => item.value === value)?.placeholder ?? "Reference number (optional)";
