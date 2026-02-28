import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/apiClient";
import {
  PAYMENT_METHODS,
  PaymentMethodValue,
  methodRequiresReference,
  referencePlaceholder,
} from "@/constants/paymentMethods";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

interface InvoiceAllocation {
  invoiceId: string;
  invoiceNumber: string;
  balance: number;
  allocatedAmount: number;
}

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  total_amount: number | string;
  paid_amount: number | string;
  due_date: string;
}

interface CustomerConnection {
  id: string;
  box_number: string;
}

const AddPaymentDialog = ({ open, onOpenChange, customerId, customerName }: AddPaymentDialogProps) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodValue>("cash");
  const [notes, setNotes] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  const { data: unpaidInvoices = [] } = useQuery<UnpaidInvoice[]>({
    queryKey: ["unpaid-invoices", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/invoices`, {
        params: { status: "unpaid,partially_paid" },
      });
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const { data: connections = [] } = useQuery<CustomerConnection[]>({
    queryKey: ["customer-connections-for-payment", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/connections`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      amount: number;
      method: string;
      referenceNumber: string;
      notes: string;
      allocations: InvoiceAllocation[];
      connectionId: string | null;
    }) => {
      const payload = {
        customer_id: customerId,
        connection_id: paymentData.connectionId,
        amount: paymentData.amount,
        payment_method: paymentData.method,
        reference_number: paymentData.referenceNumber || null,
        notes: paymentData.notes || null,
        allocations: paymentData.allocations.map((alloc) => ({
          invoice_id: alloc.invoiceId,
          amount: alloc.allocatedAmount,
        })),
      };

      const response = await apiClient.post("/payments", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-detail"] });
      queryClient.invalidateQueries({ queryKey: ["customer-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["customer-connections"] });
      queryClient.invalidateQueries({ queryKey: ["unpaid-invoices"] });
      toast.success("Payment recorded successfully!");
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  const handleClose = () => {
    setAmount("");
    setMethod("cash");
    setReferenceNumber("");
    setNotes("");
    setAllocations([]);
    setSelectedInvoices(new Set());
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
    if (totalAllocated > paymentAmount) {
      toast.error("Total allocated amount cannot exceed payment amount");
      return;
    }

    const trimmedReference = referenceNumber.trim();
    if (methodRequiresReference(method) && !trimmedReference) {
      toast.error("Cheque payments require a cheque number");
      return;
    }

    createPaymentMutation.mutate({
      amount: paymentAmount,
      method,
      referenceNumber: trimmedReference,
      notes,
      allocations: allocations.filter(a => a.allocatedAmount > 0),
      connectionId: connections?.[0]?.id || null,
    });
  };

  const handleInvoiceToggle = (invoice: UnpaidInvoice) => {
    const updated = new Set(selectedInvoices);
    if (updated.has(invoice.id)) {
      updated.delete(invoice.id);
      setAllocations((prev) => prev.filter((a) => a.invoiceId !== invoice.id));
    } else {
      updated.add(invoice.id);
      const remainingBalance = Number(invoice.total_amount) - Number(invoice.paid_amount);
      setAllocations((prev) => [
        ...prev,
        {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          balance: remainingBalance,
          allocatedAmount: 0,
        },
      ]);
    }
    setSelectedInvoices(new Set(updated));
  };

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const newAmount = parseFloat(value) || 0;
    setAllocations((prev) =>
      prev.map((alloc) =>
        alloc.invoiceId === invoiceId
          ? { ...alloc, allocatedAmount: Math.min(newAmount, alloc.balance) }
          : alloc,
      ),
    );
  };

  const autoAllocate = () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0 || !unpaidInvoices.length) return;

    let remaining = paymentAmount;
    const newAllocations: InvoiceAllocation[] = [];
    const newSelected = new Set<string>();

    for (const invoice of unpaidInvoices) {
      if (remaining <= 0) break;
      const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
      const allocateAmount = Math.min(remaining, balance);

      newAllocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        balance,
        allocatedAmount: allocateAmount,
      });

      remaining -= allocateAmount;
      newSelected.add(invoice.id);
    }

    setAllocations(newAllocations);
    setSelectedInvoices(newSelected);
  };

  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
  const unallocated = (parseFloat(amount) || 0) - totalAllocated;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment - {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select value={method} onValueChange={(value: any) => setMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {method !== "cash" && (
            <div className="space-y-2">
              <Label>
                Reference / Cheque Number{" "}
                {methodRequiresReference(method) ? <span className="text-destructive">*</span> : null}
              </Label>
              <Input
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={referencePlaceholder(method)}
                required={methodRequiresReference(method)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment notes..."
              rows={2}
            />
          </div>

          {unpaidInvoices.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Allocate to Invoices (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={autoAllocate}>
                  Auto Allocate
                </Button>
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-right">Allocate Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidInvoices.map((invoice) => {
                      const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
                      const allocation = allocations.find(a => a.invoiceId === invoice.id);
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInvoices.has(invoice.id)}
                              onCheckedChange={() => handleInvoiceToggle(invoice)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">LKR{balance.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {selectedInvoices.has(invoice.id) && (
                              <Input
                                type="number"
                                step="0.01"
                                value={allocation?.allocatedAmount || ""}
                                onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                                placeholder="0.00"
                                className="w-32 ml-auto"
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <p className="text-xl font-bold">LKR{totalAllocated.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unallocated</p>
                  <p className="text-xl font-bold text-amber-600">LKR{unallocated.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPaymentMutation.isPending}>
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPaymentDialog;
