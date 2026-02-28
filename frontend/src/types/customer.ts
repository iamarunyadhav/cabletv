export interface Area {
  id: string;
  name: string;
}

export interface BillingGroup {
  id: string;
  name: string;
  area?: Area | null;
}

export interface Customer {
  id: string;
  code?: string;
  connectionId?: string;
  name: string;
  phone: string;
  nic?: string;
  address: string;
  status: string;
  area?: Area | null;
  billingGroup?: BillingGroup | null;
  aggregateStatus?: string;
  currentBalance: number;
  agreementNumber?: string | null;
}

export interface CustomerStats {
  currentBalance: number;
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPayments: number;
  lastPayment?: Payment;
}

export interface AdditionalChannel {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface SetupItem {
  id: string;
  name: string;
  price: number;
}

export interface Connection {
  id: string;
  boxNumber: string;
  status: string;
  packageName: string;
  packageType: "base" | "special";
  monthlyAmount: number;
  additionalChannels: AdditionalChannel[];
  setupItems: SetupItem[];
  connectionBalance: number;
  creditBalance?: number;
  prepaidMonths?: number;
  prepaidThroughDate?: string | null;
  prepaidThroughLabel?: string | null;
  nextBillingDate?: string | null;
  monthlyCharge?: number;
  billingCycle?: string;
  postponeStart?: string | null;
  postponeEnd?: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "setup" | "monthly" | string;
  date: string;
  period?: string;
  connectionBoxNumber?: string | null;
  subtotal: number;
  paymentsApplied: number;
  balanceDue: number;
  status: string;
  pdfUrl?: string;
  lineItems?: InvoiceLineItem[];
}

export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  period?: string;
  amount: number;
  balanceBefore: number;
}

export interface Payment {
  id: string;
  receiptNumber?: string;
  date: string;
  amount: number;
  method: string;
  referenceNumber?: string | null;
  connectionBoxNumber?: string | null;
  notes?: string | null;
  allocations?: PaymentAllocation[];
  pdfUrl?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: "charge" | "payment" | "adjustment" | string;
  description: string;
  connectionBoxNumber?: string | null;
  reference?: string | null;
  memo?: string | null;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export interface SmsLog {
  id: string;
  type: string;
  phone: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface SuspensionHistory {
  id: string;
  description: string;
  occurredAt: string;
  user?: string | null;
  connectionBoxNumber?: string | null;
}

export interface CustomerChargesVsPaymentsPoint {
  month: string;
  charges: number;
  payments: number;
}

export interface CustomerDetailResponse {
  customer: Customer;
  stats: CustomerStats;
  connections: Connection[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  unpaidInvoices: Invoice[];
  chargesVsPayments: CustomerChargesVsPaymentsPoint[];
}

export interface LedgerFilters {
  from?: string;
  to?: string;
  types?: string[];
  connectionId?: string;
  search?: string;
}

export interface ListFilters {
  from?: string;
  to?: string;
  status?: string;
  type?: string;
  method?: string;
  connectionId?: string;
  page?: number;
  perPage?: number;
}

export interface CustomerActivityResponse {
  smsLogs: SmsLog[];
  events: SuspensionHistory[];
}
