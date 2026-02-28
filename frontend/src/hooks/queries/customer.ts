import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { apiClient } from "@/lib/apiClient";
import { resolvePaymentDateTime } from "@/lib/paymentDate";
import {
  Customer,
  CustomerActivityResponse,
  CustomerChargesVsPaymentsPoint,
  CustomerDetailResponse,
  CustomerStats,
  Invoice,
  InvoiceLineItem,
  LedgerEntry,
  LedgerFilters,
  ListFilters,
  Payment,
  PaymentAllocation,
  Connection,
  SmsLog,
  SuspensionHistory,
} from "@/types/customer";

const formatMoney = (value?: number | null) => Number(value || 0);

const getPaymentDateValue = (payment: any) =>
  resolvePaymentDateTime(payment) ?? payment.payment_date ?? payment.created_at;

const buildMonthMap = (
  values: { date: string; amount: number }[],
  target: Map<string, { charges: number; payments: number }>,
  key: "charges" | "payments"
) => {
  values.forEach((entry) => {
    const monthKey = dayjs(entry.date).format("YYYY-MM");
    const bucket = target.get(monthKey) ?? { charges: 0, payments: 0 };
    bucket[key] += entry.amount;
    target.set(monthKey, bucket);
  });
};

const buildChargesVsPayments = (
  invoices: any[],
  payments: any[]
): CustomerChargesVsPaymentsPoint[] => {
  const monthMap = new Map<string, { charges: number; payments: number }>();
  buildMonthMap(
    invoices.map((invoice) => ({
      date: invoice.billing_period_start || invoice.created_at,
      amount: formatMoney(invoice.total_amount),
    })),
    monthMap,
    "charges"
  );
  buildMonthMap(
    payments.map((payment) => ({
      date: getPaymentDateValue(payment),
      amount: formatMoney(payment.amount),
    })),
    monthMap,
    "payments"
  );

  const sortedKeys = Array.from(monthMap.keys()).sort();
  return sortedKeys.slice(-12).map((key) => {
    const bucket = monthMap.get(key)!;
    return {
      month: dayjs(key).format("MMM YYYY"),
      charges: bucket.charges,
      payments: bucket.payments,
    };
  });
};

const deriveInvoiceType = (items?: any[]): string => {
  if (!items || items.length === 0) {
    return "monthly";
  }
  const primary = items[0]?.type || "";
  if (primary.toLowerCase().includes("setup")) {
    return "setup";
  }
  return "monthly";
};

const mapInvoiceLineItems = (items?: any[]): InvoiceLineItem[] =>
  (items || []).map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    amount: item.line_total,
  }));

const mapInvoices = (rawInvoices: any[]): Invoice[] =>
  rawInvoices.map((invoice) => {
    const lineItems = mapInvoiceLineItems(invoice.invoice_items);
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      type: deriveInvoiceType(invoice.invoice_items),
      date: invoice.created_at,
      period: invoice.billing_period_start
        ? `${dayjs(invoice.billing_period_start).format("MMM DD")} - ${dayjs(
            invoice.billing_period_end
          ).format("MMM DD, YYYY")}`
        : undefined,
      connectionBoxNumber: invoice.connections?.box_number || undefined,
      subtotal: formatMoney(invoice.amount),
      paymentsApplied: formatMoney(invoice.paid_amount),
      balanceDue: formatMoney(invoice.total_amount) - formatMoney(invoice.paid_amount),
      status: invoice.status,
      pdfUrl: invoice.pdf_url || undefined,
      lineItems,
    };
  });

const mapPayments = (rawPayments: any[]): Payment[] =>
  rawPayments.map((payment) => {
    const allocations: PaymentAllocation[] =
      payment.payment_allocations?.map((allocation: any) => {
        const invoice = allocation.invoice || allocation.invoices;
        return {
          invoiceId: allocation.invoice_id,
          invoiceNumber: invoice?.invoice_number || "",
          period: invoice?.billing_period_start
            ? `${dayjs(invoice.billing_period_start).format("MMM DD")} - ${dayjs(
                invoice.billing_period_end
              ).format("MMM DD, YYYY")}`
            : undefined,
          amount: formatMoney(allocation.amount),
          balanceBefore:
            formatMoney(invoice?.total_amount) -
            formatMoney(invoice?.paid_amount),
        };
      }) || [];

    return {
      id: payment.id,
      receiptNumber: payment.receipt_number,
      date: getPaymentDateValue(payment),
      amount: formatMoney(payment.amount),
      method: payment.payment_method,
      referenceNumber: payment.reference_number || undefined,
      connectionBoxNumber: payment.connections?.box_number || undefined,
      notes: payment.notes,
      allocations,
      pdfUrl: payment.receipt_url || undefined,
    };
  });

const mapConnections = (rows: any[]): Connection[] =>
  rows.map((row) => {
    const pkg = row.package ?? row.packages ?? null;
    return {
      id: row.id,
      boxNumber: row.box_number,
      status: row.status,
      packageName: pkg?.name || "Custom Package",
      packageType: "base",
      monthlyAmount: row.special_amount ?? pkg?.price ?? 0,
      additionalChannels:
        row.additional_channels?.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          monthlyAmount: channel.monthly_amount || 0,
        })) ||
        row.connection_additional_channels?.map((cac: any) => ({
          id: cac.additional_channels?.id || cac.id,
          name: cac.additional_channels?.name || "",
          monthlyAmount: cac.additional_channels?.monthly_amount || 0,
        })) ||
        [],
      setupItems:
        row.setup_items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price ?? 0,
        })) ||
        row.connection_setup_items?.map((item: any) => ({
          id: item.setup_items?.id || item.id,
          name: item.setup_items?.name || "",
          price: item.price_snapshot ?? item.setup_items?.price ?? 0,
        })) ||
        [],
      connectionBalance: row.current_balance || 0,
      creditBalance: row.credit_balance ?? undefined,
      prepaidMonths: row.prepaid_months ?? undefined,
      prepaidThroughDate: row.prepaid_through_date ?? undefined,
      prepaidThroughLabel: row.prepaid_through_label ?? undefined,
      nextBillingDate: row.next_billing_date ?? undefined,
      monthlyCharge: row.monthly_charge ?? undefined,
      billingCycle: undefined,
      postponeStart: row.postpone_start,
      postponeEnd: row.postpone_end,
      suspendedAt: row.suspended_at,
      suspensionReason: row.suspension_reason,
    };
  });

const buildCustomerStats = (connections: Connection[], invoices: any[], payments: any[]): CustomerStats => {
  const currentBalance = connections.reduce((sum, conn) => sum + conn.connectionBalance, 0);
  const totalInvoices = invoices.length;
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + formatMoney(inv.total_amount), 0);
  const totalPayments = payments.reduce((sum, payment) => sum + formatMoney(payment.amount), 0);
  const lastPayment = payments[0]
    ? {
        id: payments[0].id,
        amount: formatMoney(payments[0].amount),
        date: getPaymentDateValue(payments[0]),
        method: payments[0].payment_method,
        connectionBoxNumber: undefined,
        allocations: [],
        notes: payments[0].notes || undefined,
        receiptNumber: payments[0].receipt_number,
        receiptUrl: undefined,
      }
    : undefined;

  return {
    currentBalance,
    totalInvoices,
    totalInvoiceAmount,
    totalPayments,
    lastPayment,
  };
};

const mapCustomer = (row: any, currentBalance: number): Customer => {
  const area = row.area ?? row.areas;
  const billingGroup = row.billing_group ?? row.billing_groups;
  return {
    id: row.id,
    code: row.connection_id || undefined,
    connectionId: row.connection_id || undefined,
    name: row.name,
    phone: row.phone,
    address: row.address,
    status: row.status,
    aggregateStatus: row.status,
    agreementNumber: row.agreement_number || undefined,
    area: area
      ? {
          id: area.id,
          name: area.name,
        }
      : null,
    billingGroup: billingGroup
      ? {
          id: billingGroup.id,
          name: billingGroup.name,
        }
      : null,
    currentBalance,
  };
};

export const useCustomer = (id?: string) =>
  useQuery({
    queryKey: ["customer", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) {
        throw new Error("Customer id is required");
      }

      const [customerRes, connectionsRes, invoicesRes, paymentsRes] = await Promise.all([
        apiClient.get(`/customers/${id}`),
        apiClient.get(`/customers/${id}/connections`),
        apiClient.get(`/customers/${id}/invoices`),
        apiClient.get(`/customers/${id}/payments`),
      ]);

      const customerRow = customerRes.data?.data ?? customerRes.data;
      const connectionRows = connectionsRes.data?.data ?? connectionsRes.data ?? [];
      const invoiceRows = invoicesRes.data?.data ?? invoicesRes.data ?? [];
      const paymentRows = paymentsRes.data?.data ?? paymentsRes.data ?? [];

      const formattedConnections = mapConnections(connectionRows || []);
      const stats = buildCustomerStats(formattedConnections, invoiceRows || [], paymentRows || []);

      const customer = mapCustomer(customerRow, stats.currentBalance);

      const recentInvoices = mapInvoices((invoiceRows || []).slice(0, 5));
      const recentPayments = mapPayments((paymentRows || []).slice(0, 5));
      const unpaidInvoices = mapInvoices(
        (invoiceRows || []).filter(
          (invoice) => invoice.status !== "paid" && formatMoney(invoice.total_amount) > formatMoney(invoice.paid_amount)
        )
      );

      const chargesVsPayments = buildChargesVsPayments(invoiceRows || [], paymentRows || []);

      const response: CustomerDetailResponse = {
        customer,
        stats,
        connections: formattedConnections,
        recentInvoices,
        recentPayments,
        unpaidInvoices,
        chargesVsPayments,
      };

      return response;
    },
  });

interface LedgerResponse {
  entries: LedgerEntry[];
  currentBalance: number;
}

export const useCustomerLedger = (customerId?: string, filters?: LedgerFilters) =>
  useQuery({
    queryKey: ["customer-ledger", customerId, filters],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (!customerId) {
        throw new Error("Customer id is required");
      }

      const params: Record<string, any> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = dayjs(filters.to).endOf("day").toISOString();
      if (filters?.types?.length) params.types = filters.types.join(",");
      if (filters?.connectionId) params.connection_id = filters.connectionId;
      if (filters?.search) params.search = filters.search;

      const response = await apiClient.get(`/customers/${customerId}/ledger`, { params });
      const data = response.data?.data ?? response.data ?? [];

      const entries: LedgerEntry[] = (data || []).map((entry) => ({
        id: entry.id,
        date: entry.created_at,
        type: entry.type,
        description: entry.description || "",
        memo: entry.memo || null,
        connectionBoxNumber: entry.connection?.box_number || undefined,
        reference: entry.reference_id || undefined,
        debit: entry.amount > 0 ? formatMoney(entry.amount) : 0,
        credit: entry.amount < 0 ? Math.abs(formatMoney(entry.amount)) : 0,
        balanceAfter: entry.balance_after,
      }));

      return {
        entries,
        currentBalance: entries[0]?.balanceAfter || 0,
      } as LedgerResponse;
    },
  });

export const useCustomerInvoices = (customerId?: string, filters?: ListFilters) =>
  useQuery({
    queryKey: ["customer-invoices", customerId, filters],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (!customerId) throw new Error("Customer id is required");

      const params: Record<string, any> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      if (filters?.status) params.status = filters.status;
      if (filters?.connectionId) params.connection_id = filters.connectionId;
      if (filters?.page) params.page = filters.page;
      if (filters?.perPage) params.per_page = filters.perPage;

      const response = await apiClient.get(`/customers/${customerId}/invoices`, { params });
      const data = response.data?.data ?? response.data ?? [];
      const meta = response.data?.meta;

      let invoices = mapInvoices(data);
      if (filters?.type) {
        invoices = invoices.filter((invoice) => invoice.type === filters.type);
      }

      return { data: invoices, meta };
    },
  });

export const useCustomerPayments = (customerId?: string, filters?: ListFilters) =>
  useQuery({
    queryKey: ["customer-payments", customerId, filters],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (!customerId) throw new Error("Customer id is required");

      const params: Record<string, any> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      if (filters?.method) params.method = filters.method;
      if (filters?.page) params.page = filters.page;
      if (filters?.perPage) params.per_page = filters.perPage;

      const response = await apiClient.get(`/customers/${customerId}/payments`, { params });
      const data = response.data?.data ?? response.data ?? [];
      const meta = response.data?.meta;

      return { data: mapPayments(data), meta };
    },
  });

export const useCustomerActivity = (customerId?: string, filters?: ListFilters) =>
  useQuery({
    queryKey: ["customer-activity", customerId, filters],
    enabled: Boolean(customerId),
    queryFn: async () => {
      if (!customerId) throw new Error("Customer id is required");

      const params: Record<string, any> = {};
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = dayjs(filters.to).endOf("day").toISOString();
      if (filters?.type) params.type = filters.type;

      const response = await apiClient.get(`/customers/${customerId}/activity`, { params });
      const payload = response.data?.data ?? response.data ?? {};
      const sms = payload.smsLogs ?? payload.sms ?? [];
      const events = payload.events ?? [];

      const smsLogs: SmsLog[] =
        (sms || []).map((log) => ({
          id: log.id,
          type: log.type,
          phone: log.phone,
          message: log.message,
          status: log.status,
          sentAt: log.sent_at,
        })) || [];

      const history: SuspensionHistory[] =
        (events || []).map((historyItem) => ({
          id: historyItem.id,
          description: `${historyItem.action} (${historyItem.reason || "n/a"})`,
          occurredAt: historyItem.performed_at,
          user: historyItem.performed_by,
          connectionBoxNumber: historyItem.connections?.box_number || undefined,
        })) || [];

      const activityResponse: CustomerActivityResponse = {
        smsLogs,
        events: history,
      };

      return activityResponse;
    },
  });
