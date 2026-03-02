import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { fetchCompanyProfile } from "@/lib/companyProfile";
import { InvoicePrintTemplate } from "@/components/print/InvoicePrintTemplate";
import { ReceiptPrintTemplate } from "@/components/print/ReceiptPrintTemplate";
import type { PrintDocumentData, PrintItem } from "@/components/print/types";

const toNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeCustomer = (customer: any = {}) => ({
  name: customer?.name ?? "Customer",
  id: customer?.connection_id ?? customer?.code ?? "-",
  address: customer?.address ?? "",
  phone: customer?.phone ?? "",
  email: customer?.email ?? "",
});

const normalizeInvoiceItems = (invoice: any): PrintItem[] => {
  const rawItems = invoice?.items ?? invoice?.invoice_items ?? [];
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((item: any) => ({
    description: item?.description ?? "Item",
    qty: toNumber(item?.quantity, 1),
    unitPrice: toNumber(item?.unit_price),
    amount: toNumber(item?.line_total ?? item?.amount ?? item?.total),
  }));
};

const normalizeInvoiceDocument = (invoice: any, company: any): PrintDocumentData => {
  const items = normalizeInvoiceItems(invoice);
  const subtotal = toNumber(invoice?.amount);
  const discount = toNumber(invoice?.discount_amount);
  const total = toNumber(invoice?.total_amount ?? invoice?.amount);
  const paid = toNumber(invoice?.paid_amount);
  const balance = total - paid;

  return {
    company,
    customer: normalizeCustomer(invoice?.customer ?? invoice?.customers),
    document: {
      type: "invoice",
      number: String(invoice?.invoice_number ?? invoice?.id ?? "-"),
      date:
        invoice?.created_at ??
        invoice?.billing_period_start ??
        invoice?.updated_at ??
        new Date().toISOString(),
      dueDate: invoice?.due_date ?? invoice?.billing_period_end ?? undefined,
    },
    items,
    totals: {
      subtotal,
      discount,
      total,
      paid,
      balance,
    },
    status: String(invoice?.status ?? "unpaid"),
  };
};

const normalizeReceiptDocument = (payment: any, company: any): PrintDocumentData => {
  const amountPaid = toNumber(payment?.amount);
  const balanceAfterRaw = toNumber(payment?.balance_after, Number.NaN);
  const hasBalanceAfter = Number.isFinite(balanceAfterRaw);
  const previousBalance = hasBalanceAfter ? balanceAfterRaw + amountPaid : undefined;
  const receiptDate = payment?.payment_date ?? payment?.created_at ?? new Date().toISOString();

  return {
    company,
    customer: normalizeCustomer(payment?.customer ?? payment?.customers),
    document: {
      type: "receipt",
      number: String(payment?.receipt_number ?? payment?.id ?? "-"),
      date: receiptDate,
    },
    items: [],
    totals: {
      subtotal: amountPaid,
      discount: 0,
      total: amountPaid,
      paid: amountPaid,
      balance: hasBalanceAfter ? balanceAfterRaw : 0,
    },
    payment: {
      amountPaid,
      method: String(payment?.payment_method ?? "cash"),
      previousBalance,
      balanceAfter: hasBalanceAfter ? balanceAfterRaw : undefined,
      notes: payment?.notes ?? undefined,
      referenceNumber: payment?.reference_number ?? undefined,
    },
    status: String(payment?.status ?? "paid"),
  };
};

const INVOICE_PRINT_STYLES = `
  @page {
    size: A4;
    margin: 12mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    color: #000;
    background: #fff;
    font-family: "Segoe UI", Arial, sans-serif;
    font-size: 12px;
  }

  .print-shell {
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm;
  }

  .screen-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .invoice-page h1,
  .invoice-page h2,
  .invoice-page h3,
  .invoice-page p {
    margin: 0;
  }

  .invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 16px;
  }

  .invoice-header h1 {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .invoice-header h2 {
    font-size: 20px;
    margin-bottom: 6px;
    text-align: right;
  }

  .header-right {
    text-align: right;
    min-width: 240px;
  }

  .invoice-customer {
    border: 1px solid #000;
    padding: 10px;
    margin-bottom: 14px;
  }

  .invoice-customer h3 {
    margin-bottom: 6px;
    font-size: 13px;
  }

  .invoice-items table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
  }

  .invoice-items th,
  .invoice-items td {
    border: 1px solid #000;
    padding: 8px 6px;
    vertical-align: top;
  }

  .invoice-items th {
    text-align: left;
    font-weight: 700;
  }

  .invoice-items .number {
    text-align: right;
    white-space: nowrap;
  }

  .invoice-totals {
    margin-left: auto;
    width: min(320px, 100%);
    border: 1px solid #000;
    padding: 10px;
  }

  .totals-grid {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 12px;
  }

  .no-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  @media print {
    .no-print {
      display: none !important;
    }

    .print-shell {
      padding: 0;
      max-width: none;
    }
  }
`;

const RECEIPT_PRINT_STYLES = `
  @page {
    size: 80mm auto;
    margin: 3mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    color: #000;
    background: #fff;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 12px;
    line-height: 1.2;
  }

  .print-shell {
    width: 80mm;
    max-width: 80mm;
    margin: 0 auto;
    padding: 0;
    overflow: hidden;
  }

  .screen-controls {
    display: flex;
    gap: 8px;
    margin: 8px 0;
    width: 100%;
  }

  .receipt-page {
    width: 80mm;
    max-width: 80mm;
    overflow: hidden;
  }

  .receipt {
    width: 74mm;
    max-width: 74mm;
    margin: 0 auto;
  }

  .receipt h1,
  .receipt h2,
  .receipt p {
    margin: 0;
  }

  .receipt h1 {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 2px;
  }

  .receipt h2 {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .receipt .label {
    font-weight: 700;
    margin-bottom: 2px;
  }

  .separator {
    margin: 5px 0;
    letter-spacing: -0.2px;
  }

  .receipt-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .receipt-footer {
    margin-top: 4px;
  }

  .receipt-footer .thanks {
    margin-top: 4px;
    font-weight: 700;
  }

  .no-break {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .feed {
    height: 25mm;
    min-height: 25mm;
  }

  @media screen {
    body {
      background: #efefef;
    }

    .print-shell {
      background: #fff;
      border: 1px solid #d7d7d7;
      margin-top: 12px;
      padding: 8px 0;
    }
  }

  @media print {
    .no-print {
      display: none !important;
    }

    body {
      width: 80mm;
      margin: 0;
      overflow: hidden;
    }
  }
`;

export default function PrintDocument() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const [printTriggered, setPrintTriggered] = useState(false);

  const isValidType = type === "invoice" || type === "receipt";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["print-document", type, id],
    queryFn: async () => {
      if (!isValidType || !id) {
        throw new Error("Invalid print request. Missing type or id.");
      }

      const [response, company] = await Promise.all([
        apiClient.get(type === "invoice" ? `/invoices/${id}` : `/payments/${id}`),
        fetchCompanyProfile(),
      ]);

      const payload = response.data?.data ?? response.data;

      if (!payload) {
        throw new Error("Document not found.");
      }

      if (type === "invoice") {
        return normalizeInvoiceDocument(payload, company);
      }

      return normalizeReceiptDocument(payload, company);
    },
    enabled: Boolean(isValidType && id),
    retry: false,
  });

  useEffect(() => {
    const handleAfterPrint = () => {
      if (!window.opener) return;
      window.setTimeout(() => {
        window.close();
      }, 300);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    if (!data || isLoading || printTriggered) return;
    setPrintTriggered(true);
    const timer = window.setTimeout(() => {
      window.print();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [data, isLoading, printTriggered]);

  const styles = useMemo(() => {
    if (type === "receipt") return RECEIPT_PRINT_STYLES;
    return INVOICE_PRINT_STYLES;
  }, [type]);

  if (!isValidType || !id) {
    return (
      <div className="p-6">
        <h2>Invalid print request</h2>
        <p>Use /print?type=invoice&id=... or /print?type=receipt&id=...</p>
      </div>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="print-shell">
        <div className="screen-controls no-print">
          <Button onClick={() => window.print()}>Print</Button>
          <Button variant="outline" onClick={() => window.close()}>
            Close
          </Button>
        </div>

        {isLoading ? <p>Loading document...</p> : null}
        {isError ? (
          <p>
            {(error as Error)?.message || "Failed to load print document."}
          </p>
        ) : null}
        {!isLoading && !isError && data ? (
          type === "invoice" ? (
            <InvoicePrintTemplate data={data} />
          ) : (
            <ReceiptPrintTemplate data={data} />
          )
        ) : null}
      </div>
    </>
  );
}
