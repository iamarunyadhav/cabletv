import { apiClient } from "@/lib/apiClient";
import {
  generateInvoicePDF,
  generateReceiptPDF,
  generateShortReceiptPDF,
  printPDF,
} from "@/lib/pdfGenerator";
import { fetchCompanyProfile } from "@/lib/companyProfile";
import { Connection } from "@/types/customer";

const normalizeCustomer = (customer: any = {}) => ({
  name: customer?.name ?? "Customer",
  connection_id: customer?.connection_id ?? customer?.code ?? "-",
  email: customer?.email ?? "",
  phone: customer?.phone ?? "",
  address: customer?.address ?? "",
});

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const printInvoiceDocument = async (invoiceId: string) => {
  const [response, company] = await Promise.all([
    apiClient.get(`/invoices/${invoiceId}`),
    fetchCompanyProfile(),
  ]);
  const invoice = response.data?.data ?? response.data;
  const connection = invoice?.connection ?? invoice?.connections;

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const doc = await generateInvoicePDF({
    invoice_number: invoice.invoice_number,
    billing_period_start:
      invoice.billing_period_start ??
      invoice.period_start ??
      invoice.periodStart ??
      invoice.created_at ??
      new Date().toISOString(),
    billing_period_end:
      invoice.billing_period_end ??
      invoice.period_end ??
      invoice.periodEnd ??
      invoice.created_at ??
      new Date().toISOString(),
    due_date:
      invoice.due_date ??
      invoice.billing_period_end ??
      invoice.billing_period_start ??
      new Date().toISOString(),
    amount: toNumber(invoice.amount),
    discount_amount: toNumber(invoice.discount_amount),
    total_amount: toNumber(invoice.total_amount ?? invoice.amount),
    paid_amount: toNumber(invoice.paid_amount),
    status: invoice.status ?? "unpaid",
    prepaid_through_label: connection?.prepaid_through_label ?? undefined,
    next_billing_date: connection?.next_billing_date ?? undefined,
    customers: normalizeCustomer(invoice.customer),
    invoice_items: (invoice.items ?? []).map((item: any) => ({
      description: item.description ?? "",
      quantity: toNumber(item.quantity, 1),
      unit_price: toNumber(item.unit_price),
      line_total: toNumber(item.line_total ?? item.amount),
    })),
  }, company);

  printPDF(doc);
};

export const printPaymentReceiptDocument = async (paymentId: string) => {
  const [response, company] = await Promise.all([
    apiClient.get(`/payments/${paymentId}`),
    fetchCompanyProfile(),
  ]);
  const payment = response.data?.data ?? response.data;
  const connection = payment?.connection ?? payment?.connections;

  if (!payment) {
    throw new Error("Payment not found");
  }

  const doc = await generateReceiptPDF({
    receipt_number: payment.receipt_number ?? payment.id,
    payment_date: payment.payment_date ?? payment.created_at ?? new Date().toISOString(),
    amount: toNumber(payment.amount),
    payment_method: payment.payment_method ?? "cash",
    reference_number: payment.reference_number ?? undefined,
    notes: payment.notes ?? undefined,
    customers: normalizeCustomer(payment.customer),
    balance_after: toNumber(payment.balance_after),
    prepaid_through_label: connection?.prepaid_through_label ?? undefined,
    collector: payment.payment_agent
      ? {
          name: payment.payment_agent.name ?? "Collector",
          code: payment.payment_agent.code ?? undefined,
          phone: payment.payment_agent.phone ?? undefined,
        }
      : undefined,
  }, company);

  printPDF(doc);
};

export const printShortPaymentReceiptDocument = async (
  paymentId: string,
  summary?: { connections?: Connection[]; totalBalance?: number },
) => {
  const [response, company] = await Promise.all([
    apiClient.get(`/payments/${paymentId}`),
    fetchCompanyProfile(),
  ]);
  const payment = response.data?.data ?? response.data;
  const connection = payment?.connection ?? payment?.connections;

  if (!payment) {
    throw new Error("Payment not found");
  }

  const connections = (summary?.connections ?? []).map((conn) => ({
    box_number: conn.boxNumber,
    balance: Number(conn.connectionBalance || 0),
  }));
  const totalBalance =
    summary?.totalBalance ??
    connections.reduce((sum, conn) => sum + Number(conn.balance || 0), 0);

  const doc = await generateShortReceiptPDF({
    receipt_number: payment.receipt_number ?? payment.id,
    payment_date: payment.payment_date ?? payment.created_at ?? new Date().toISOString(),
    amount: toNumber(payment.amount),
    payment_method: payment.payment_method ?? "cash",
    reference_number: payment.reference_number ?? undefined,
    notes: payment.notes ?? undefined,
    customers: normalizeCustomer(payment.customer),
    balance_after: toNumber(payment.balance_after),
    prepaid_through_label: connection?.prepaid_through_label ?? undefined,
    connections,
    total_balance: totalBalance,
    collector: payment.payment_agent
      ? {
          name: payment.payment_agent.name ?? "Collector",
          code: payment.payment_agent.code ?? undefined,
          phone: payment.payment_agent.phone ?? undefined,
        }
      : undefined,
  }, company);

  printPDF(doc);
};
