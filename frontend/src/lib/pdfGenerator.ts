import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { CompanyProfile } from '@/lib/companyProfile';

interface InvoiceData {
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  due_date: string;
  amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  prepaid_through_label?: string;
  next_billing_date?: string;
  customers: {
    name: string;
    connection_id: string;
    email?: string;
    phone: string;
    address: string;
  };
  invoice_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

interface PaymentData {
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  customers: {
    name: string;
    connection_id: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  collector?: {
    name: string;
    code?: string | null;
    phone?: string | null;
  };
  balance_after?: number;
  prepaid_through_label?: string;
}

interface ShortReceiptData extends PaymentData {
  connections?: Array<{ box_number: string; balance: number }>;
  total_balance?: number;
}

const DEFAULT_COMPANY_META = {
  name: 'Cable TV Network',
  lines: [
    '123 Business Street',
    'City, State 12345',
    'Phone: (123) 456-7890',
    'Email: info@cabletv.com',
  ],
};

const buildCompanyMeta = (company?: CompanyProfile) => {
  const name = company?.name?.trim() || DEFAULT_COMPANY_META.name;
  const metaLines = [
    company?.address?.trim(),
    company?.phone?.trim() ? `Phone: ${company.phone.trim()}` : '',
    company?.email?.trim() ? `Email: ${company.email.trim()}` : '',
  ].filter(Boolean);

  return {
    name,
    metaLines: metaLines.length ? metaLines : DEFAULT_COMPANY_META.lines,
  };
};

const addHeader = (doc: jsPDF, company?: CompanyProfile) => {
  const { name, metaLines } = buildCompanyMeta(company);

  // Company header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(name, 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  metaLines.forEach((line, idx) => {
    doc.text(line, 14, 28 + idx * 5);
  });
};

export const generateInvoicePDF = async (invoice: InvoiceData, company?: CompanyProfile) => {
  const doc = new jsPDF();
  
  addHeader(doc, company);

  // Invoice title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 200, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoice.invoice_number}`, 200, 28, { align: 'right' });
  doc.text(`Date: ${format(new Date(), 'MMM d, yyyy')}`, 200, 33, { align: 'right' });
  doc.text(`Due Date: ${format(new Date(invoice.due_date), 'MMM d, yyyy')}`, 200, 38, { align: 'right' });

  // Customer info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customers.name, 14, 62);
  doc.text(`ID: ${invoice.customers.connection_id}`, 14, 67);
  doc.text(invoice.customers.address, 14, 72);
  doc.text(`Phone: ${invoice.customers.phone}`, 14, 77);
  if (invoice.customers.email) {
    doc.text(`Email: ${invoice.customers.email}`, 14, 82);
  }

  // Billing period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Billing Period:', 14, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${format(new Date(invoice.billing_period_start), 'MMM d, yyyy')} - ${format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}`,
    14,
    100
  );

  // Items table
  const tableData = invoice.invoice_items?.map((item) => [
    item.description,
    item.quantity.toString(),
    `Rs ${item.unit_price.toFixed(2)}`,
    `Rs ${item.line_total.toFixed(2)}`,
  ]) || [];

  autoTable(doc, {
    startY: 110,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' },
    },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 110;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', 140, finalY + 15);
  doc.text(`Rs ${invoice.amount.toFixed(2)}`, 200, finalY + 15, { align: 'right' });
  
  doc.text('Discount:', 140, finalY + 22);
  doc.text(`Rs ${invoice.discount_amount.toFixed(2)}`, 200, finalY + 22, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', 140, finalY + 32);
  doc.text(`Rs ${invoice.total_amount.toFixed(2)}`, 200, finalY + 32, { align: 'right' });
  
  doc.setFontSize(10);
  doc.text('Paid:', 140, finalY + 39);
  doc.text(`Rs ${invoice.paid_amount.toFixed(2)}`, 200, finalY + 39, { align: 'right' });
  
  doc.setFontSize(12);
  const balance = invoice.total_amount - invoice.paid_amount;
  doc.text('Balance Due:', 140, finalY + 49);
  doc.text(`Rs ${balance.toFixed(2)}`, 200, finalY + 49, { align: 'right' });

  if (invoice.prepaid_through_label || invoice.next_billing_date) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = [
      invoice.prepaid_through_label ? `Prepaid until: ${invoice.prepaid_through_label}` : null,
      invoice.next_billing_date
        ? `Next billing date: ${format(new Date(invoice.next_billing_date), 'MMM d, yyyy')}`
        : null,
    ].filter(Boolean) as string[];
    lines.forEach((line, idx) => {
      doc.text(line, 14, finalY + 60 + idx * 6);
    });
  }

  // Status badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const statusY = finalY + 60 + (invoice.prepaid_through_label || invoice.next_billing_date ? 12 : 0);
  doc.text(`Status: ${invoice.status.toUpperCase().replace('_', ' ')}`, 14, statusY);

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  doc.text('For any queries, please contact us at info@cabletv.com', 105, 285, { align: 'center' });

  return doc;
};

const smallHeader = (doc: jsPDF, title: string, company?: CompanyProfile) => {
  const { name, metaLines } = buildCompanyMeta(company);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(name, 40, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  metaLines.forEach((line, idx) => doc.text(line, 40, 12 + idx * 4, { align: 'center' }));

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 24, { align: 'center' });
};

export const generateThermalInvoicePDF = async (invoice: InvoiceData, company?: CompanyProfile) => {
  const doc = new jsPDF({ unit: 'mm', format: [80, 180] });
  smallHeader(doc, 'INVOICE', company);

  let y = 32;
  doc.setFontSize(8);
  doc.text(`Invoice #: ${invoice.invoice_number}`, 6, y); y += 4;
  doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd')}`, 6, y); y += 4;
  doc.text(`Due: ${format(new Date(invoice.due_date), 'yyyy-MM-dd')}`, 6, y); y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Customer', 6, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customers.name, 6, y); y += 4;
  doc.text(`ID: ${invoice.customers.connection_id}`, 6, y); y += 4;
  doc.text(invoice.customers.phone, 6, y); y += 4;
  doc.text(invoice.customers.address || '', 6, y); y += 6;

  const items = invoice.invoice_items?.map((item) => [
    item.description,
    String(item.quantity),
    item.unit_price.toFixed(2),
    item.line_total.toFixed(2),
  ]) ?? [];

  autoTable(doc, {
    startY: y,
    margin: { left: 4, right: 4 },
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: items,
    styles: { fontSize: 8 },
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 10, halign: 'right' },
      2: { cellWidth: 12, halign: 'right' },
      3: { cellWidth: 12, halign: 'right' },
    },
  });

  y = (doc as any).lastAutoTable?.finalY || y;
  y += 4;
  const balance = invoice.total_amount - invoice.paid_amount;
  const totals = [
    ['Subtotal', invoice.amount],
    ['Discount', invoice.discount_amount],
    ['Total', invoice.total_amount],
    ['Paid', invoice.paid_amount],
    ['Balance', balance],
  ];
  doc.setFont('helvetica', 'bold');
  totals.forEach(([label, val]) => {
    doc.text(label as string, 34, y);
    doc.text(`Rs ${(val as number).toFixed(2)}`, 74, y, { align: 'right' });
    y += 4;
  });

  doc.setFontSize(8);
  doc.text(`Status: ${invoice.status}`, 6, y + 2);
  if (invoice.prepaid_through_label) {
    doc.text(`Prepaid until: ${invoice.prepaid_through_label}`, 6, y + 6);
    y += 4;
  }
  if (invoice.next_billing_date) {
    doc.text(
      `Next billing date: ${format(new Date(invoice.next_billing_date), 'yyyy-MM-dd')}`,
      6,
      y + 10,
    );
  }
  doc.text('Thank you for your payment.', 40, y + 8, { align: 'center' });

  return doc;
};

export const generateReceiptPDF = async (payment: PaymentData, company?: CompanyProfile) => {
  const doc = new jsPDF();
  
  addHeader(doc, company);

  // Receipt title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', 200, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt #: ${payment.receipt_number}`, 200, 28, { align: 'right' });
  doc.text(`Date: ${format(new Date(payment.payment_date), 'MMM d, yyyy HH:mm')}`, 200, 33, { align: 'right' });

  // Customer info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Received From:', 14, 55);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(payment.customers.name, 14, 62);
  doc.text(`ID: ${payment.customers.connection_id}`, 14, 67);
  doc.text(payment.customers.address, 14, 72);
  doc.text(`Phone: ${payment.customers.phone}`, 14, 77);
  if (payment.customers.email) {
    doc.text(`Email: ${payment.customers.email}`, 14, 82);
  }

  // Payment details box
  const boxY = 100;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.rect(14, boxY, 182, 60);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Details', 20, boxY + 10);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid:', 20, boxY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Rs ${payment.amount.toFixed(2)}`, 190, boxY + 22, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Method:', 20, boxY + 35);
  doc.text(payment.payment_method.replace('_', ' ').toUpperCase(), 190, boxY + 35, { align: 'right' });

  let detailY = boxY + 45;

  if (payment.collector) {
    doc.text('Collected By:', 20, detailY);
    const collectorLabel = `${payment.collector.name}${payment.collector.code ? ` (#${payment.collector.code})` : ''}`;
    doc.text(collectorLabel, 190, detailY, { align: 'right' });
    detailY += 10;
  }

  if (payment.reference_number) {
    doc.text('Reference Number:', 20, detailY);
    doc.text(payment.reference_number, 190, detailY, { align: 'right' });
    detailY += 10;
  }

  if (payment.notes) {
    doc.text('Notes:', 20, detailY);
    const splitNotes = doc.splitTextToSize(payment.notes, 150);
    doc.text(splitNotes, 20, detailY + 7);
  }

  if (typeof payment.balance_after === "number") {
    doc.text('Balance After:', 20, detailY + 18);
    doc.text(`Rs ${payment.balance_after.toFixed(2)}`, 190, detailY + 18, { align: 'right' });
    const previous = payment.balance_after + payment.amount;
    doc.text('Previous Balance:', 20, detailY + 28);
    doc.text(`Rs ${previous.toFixed(2)}`, 190, detailY + 28, { align: 'right' });
  }
  if (typeof payment.balance_after === "number" && payment.balance_after < 0 && payment.prepaid_through_label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Prepaid until: ${payment.prepaid_through_label}`, 20, detailY + 38);
  }

  // Status stamp
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('PAID', 105, 190, { align: 'center' });

  // Footer
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated receipt and does not require a signature.', 105, 230, { align: 'center' });
  doc.text('Please keep this receipt for your records.', 105, 235, { align: 'center' });
  doc.text('Thank you for your payment!', 105, 245, { align: 'center' });

  return doc;
};

export const generateThermalReceiptPDF = async (payment: PaymentData, company?: CompanyProfile) => {
  const doc = new jsPDF({ unit: 'mm', format: [80, 140] });
  smallHeader(doc, 'PAYMENT RECEIPT', company);

  let y = 32;
  doc.setFontSize(8);
  doc.text(`Receipt #: ${payment.receipt_number}`, 6, y); y += 4;
  doc.text(`Date: ${format(new Date(payment.payment_date), 'yyyy-MM-dd HH:mm')}`, 6, y); y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Customer', 6, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(payment.customers.name, 6, y); y += 4;
  doc.text(`ID: ${payment.customers.connection_id}`, 6, y); y += 4;
  doc.text(payment.customers.phone, 6, y); y += 4;
  doc.text(payment.customers.address || '', 6, y); y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment', 6, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount: Rs ${payment.amount.toFixed(2)}`, 6, y); y += 4;
  doc.text(`Method: ${payment.payment_method}`, 6, y); y += 4;
  if (payment.reference_number) {
    doc.text(`Ref: ${payment.reference_number}`, 6, y); y += 4;
  }
  if (payment.collector?.name) {
    doc.text(`Collector: ${payment.collector.name}`, 6, y); y += 4;
  }
  if (payment.notes) {
    doc.text(`Notes: ${payment.notes}`, 6, y); y += 6;
  }
  if (typeof payment.balance_after === "number") {
    doc.text(`Balance after: Rs ${payment.balance_after.toFixed(2)}`, 6, y); y += 4;
    const prevBalance = payment.balance_after + payment.amount;
    doc.text(`Prev bal: Rs ${prevBalance.toFixed(2)}`, 6, y); y += 4;
  }
  if (typeof payment.balance_after === "number" && payment.balance_after < 0 && payment.prepaid_through_label) {
    doc.text(`Prepaid until: ${payment.prepaid_through_label}`, 6, y); y += 4;
  }

  doc.setFontSize(8);
  doc.text('Thank you!', 40, y + 6, { align: 'center' });

  return doc;
};

export const generateShortReceiptPDF = async (payment: ShortReceiptData, company?: CompanyProfile) => {
  const doc = new jsPDF({ unit: 'mm', format: [80, 160] });
  smallHeader(doc, 'PAYMENT RECEIPT', company);

  let y = 32;
  doc.setFontSize(8);
  doc.text(`Receipt #: ${payment.receipt_number}`, 6, y); y += 4;
  doc.text(`Date: ${format(new Date(payment.payment_date), 'yyyy-MM-dd HH:mm')}`, 6, y); y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text(`Hi ${payment.customers.name}`, 6, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${payment.customers.connection_id}`, 6, y); y += 4;
  if (payment.customers.phone) {
    doc.text(payment.customers.phone, 6, y); y += 4;
  }
  y += 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Payment', 6, y); y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Amount: Rs ${payment.amount.toFixed(2)}`, 6, y); y += 4;
  doc.text(`Method: ${payment.payment_method}`, 6, y); y += 4;

  if (typeof payment.balance_after === 'number') {
    doc.text(`Balance after: Rs ${payment.balance_after.toFixed(2)}`, 6, y); y += 4;
  }

  if (payment.prepaid_through_label && typeof payment.balance_after === 'number' && payment.balance_after < 0) {
    doc.text(`Prepaid until: ${payment.prepaid_through_label}`, 6, y); y += 4;
  }

  if (payment.connections?.length) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Connections', 6, y); y += 4;
    doc.setFont('helvetica', 'normal');
    payment.connections.forEach((conn) => {
      doc.text(`${conn.box_number}: Rs ${conn.balance.toFixed(2)}`, 6, y);
      y += 4;
    });
  }

  if (typeof payment.total_balance === 'number') {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total balance: Rs ${payment.total_balance.toFixed(2)}`, 6, y); y += 4;
  }

  doc.setFontSize(8);
  doc.text('Thank you!', 40, 150, { align: 'center' });

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const printPDF = (doc: jsPDF) => {
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
