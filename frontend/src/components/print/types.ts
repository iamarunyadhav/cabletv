export interface PrintCompany {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface PrintCustomer {
  name: string;
  id: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface PrintDocumentMeta {
  type: "invoice" | "receipt";
  number: string;
  date: string;
  dueDate?: string;
}

export interface PrintItem {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface PrintTotals {
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  balance: number;
}

export interface PrintPayment {
  amountPaid: number;
  method: string;
  previousBalance?: number;
  balanceAfter?: number;
  notes?: string;
  referenceNumber?: string;
}

export interface PrintDocumentData {
  company: PrintCompany;
  customer: PrintCustomer;
  document: PrintDocumentMeta;
  items: PrintItem[];
  totals: PrintTotals;
  payment?: PrintPayment;
  status: string;
}
