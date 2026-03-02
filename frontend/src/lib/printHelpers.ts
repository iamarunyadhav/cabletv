import { Connection } from "@/types/customer";
import { openPrintWindow } from "@/lib/printWindow";

export const printInvoiceDocument = async (invoiceId: string) => {
  openPrintWindow({ type: "invoice", id: invoiceId });
};

export const printPaymentReceiptDocument = async (paymentId: string) => {
  openPrintWindow({ type: "receipt", id: paymentId });
};

export const printShortPaymentReceiptDocument = async (
  paymentId: string,
  _summary?: { connections?: Connection[]; totalBalance?: number },
) => {
  openPrintWindow({ type: "receipt", id: paymentId });
};
