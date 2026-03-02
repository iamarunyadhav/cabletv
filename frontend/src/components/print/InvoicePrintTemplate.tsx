import { format } from "date-fns";
import type { PrintDocumentData } from "@/components/print/types";

interface InvoicePrintTemplateProps {
  data: PrintDocumentData;
}

const formatMoney = (value: number) => `Rs ${Number(value || 0).toFixed(2)}`;

const formatDateValue = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "MMM d, yyyy");
};

export function InvoicePrintTemplate({ data }: InvoicePrintTemplateProps) {
  const hasItems = data.items.length > 0;

  return (
    <main className="invoice-page">
      <section className="invoice-header no-break">
        <div>
          <h1>{data.company.name}</h1>
          {data.company.address ? <p>{data.company.address}</p> : null}
          {data.company.phone ? <p>Phone: {data.company.phone}</p> : null}
          {data.company.email ? <p>Email: {data.company.email}</p> : null}
        </div>
        <div className="header-right">
          <h2>INVOICE</h2>
          <p>Invoice #: {data.document.number}</p>
          <p>Date: {formatDateValue(data.document.date)}</p>
          <p>Due Date: {formatDateValue(data.document.dueDate)}</p>
          <p>Status: {String(data.status || "unpaid").toUpperCase().replaceAll("_", " ")}</p>
        </div>
      </section>

      <section className="invoice-customer no-break">
        <h3>Bill To</h3>
        <p>{data.customer.name}</p>
        <p>ID: {data.customer.id}</p>
        {data.customer.address ? <p>{data.customer.address}</p> : null}
        {data.customer.phone ? <p>Phone: {data.customer.phone}</p> : null}
        {data.customer.email ? <p>Email: {data.customer.email}</p> : null}
      </section>

      <section className="invoice-items">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="number">Qty</th>
              <th className="number">Unit Price</th>
              <th className="number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {hasItems ? (
              data.items.map((item, index) => (
                <tr key={`${item.description}-${index}`}>
                  <td>{item.description}</td>
                  <td className="number">{item.qty}</td>
                  <td className="number">{formatMoney(item.unitPrice)}</td>
                  <td className="number">{formatMoney(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No invoice items</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="invoice-totals no-break">
        <div className="totals-grid">
          <span>Subtotal</span>
          <strong>{formatMoney(data.totals.subtotal)}</strong>
          <span>Discount</span>
          <strong>{formatMoney(data.totals.discount)}</strong>
          <span>Total</span>
          <strong>{formatMoney(data.totals.total)}</strong>
          <span>Paid</span>
          <strong>{formatMoney(data.totals.paid)}</strong>
          <span>Balance Due</span>
          <strong>{formatMoney(data.totals.balance)}</strong>
        </div>
      </section>
    </main>
  );
}
