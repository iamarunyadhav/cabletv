import { format } from "date-fns";
import type { PrintDocumentData } from "@/components/print/types";

interface ReceiptPrintTemplateProps {
  data: PrintDocumentData;
}

const formatMoney = (value: number) => `Rs ${Number(value || 0).toFixed(2)}`;

const formatDateTimeValue = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "yyyy-MM-dd HH:mm");
};

const normalizeMethod = (value?: string) =>
  String(value || "cash")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toUpperCase();

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="receipt-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ReceiptPrintTemplate({ data }: ReceiptPrintTemplateProps) {
  const method = normalizeMethod(data.payment?.method);
  const previousBalance =
    typeof data.payment?.previousBalance === "number" ? data.payment?.previousBalance : undefined;
  const balanceAfter =
    typeof data.payment?.balanceAfter === "number" ? data.payment?.balanceAfter : undefined;

  return (
    <main className="receipt-page">
      <section className="receipt">
        <div className="no-break">
          <h1>{data.company.name}</h1>
          {data.company.address ? <p>{data.company.address}</p> : null}
          {data.company.phone ? <p>Phone: {data.company.phone}</p> : null}
          {data.company.email ? <p>Email: {data.company.email}</p> : null}
        </div>

        <p className="separator">--------------------------------</p>
        <div className="no-break">
          <h2>PAYMENT RECEIPT</h2>
          <p>Receipt #: {data.document.number}</p>
          <p>Date: {formatDateTimeValue(data.document.date)}</p>
        </div>

        <p className="separator">--------------------------------</p>
        <div className="no-break">
          <p className="label">Customer</p>
          <p>{data.customer.name}</p>
          <p>ID: {data.customer.id}</p>
          {data.customer.address ? <p>{data.customer.address}</p> : null}
          {data.customer.phone ? <p>{data.customer.phone}</p> : null}
        </div>

        <p className="separator">--------------------------------</p>
        <div className="no-break">
          <p className="label">Payment Details</p>
          <Row label="Amount Paid" value={formatMoney(data.payment?.amountPaid ?? data.totals.paid)} />
          <Row label="Method" value={method} />
          {previousBalance !== undefined ? (
            <Row label="Previous Bal" value={formatMoney(previousBalance)} />
          ) : null}
          {balanceAfter !== undefined ? (
            <Row label="Balance After" value={formatMoney(balanceAfter)} />
          ) : null}
          {data.payment?.referenceNumber ? <p>Ref: {data.payment.referenceNumber}</p> : null}
          {data.payment?.notes ? <p>Notes: {data.payment.notes}</p> : null}
        </div>

        <p className="separator">--------------------------------</p>
        <div className="receipt-footer no-break">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>Please keep this receipt for your records.</p>
          <p className="thanks">Thank you for your payment!</p>
        </div>

        <div className="feed" aria-hidden="true" />
      </section>
    </main>
  );
}
