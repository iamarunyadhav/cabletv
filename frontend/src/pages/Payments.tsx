import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Pencil, Trash2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { EditPaymentDialog } from "@/components/EditPaymentDialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateReceiptPDF, downloadPDF } from "@/lib/pdfGenerator";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { getPaymentMethodLabel } from "@/constants/paymentMethods";
import { fetchCompanyProfile } from "@/lib/companyProfile";
import { resolvePaymentDateTime } from "@/lib/paymentDate";
import { printInvoiceDocument, printPaymentReceiptDocument } from "@/lib/printHelpers";

const Payments = () => {
  const queryClient = useQueryClient();
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ from?: string; to?: string; method?: string }>({});
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: companyProfile } = useQuery({
    queryKey: ["company-profile"],
    queryFn: fetchCompanyProfile,
  });

  const { data: paymentResponse, isLoading } = useQuery({
    queryKey: ["payments", filters, page],
    queryFn: async () => {
          const response = await apiClient.get("/payments", {
            params: {
              from: filters.from || undefined,
              to: filters.to || undefined,
              method: filters.method || undefined,
              per_page: PAGE_SIZE,
              page,
            },
          });

      const data = response.data?.data ?? response.data ?? [];
      const meta = response.data?.meta;

      if (meta) {
        return { data, meta };
      }

      return {
        data,
        meta: {
          current_page: page,
          last_page: 1,
          per_page: PAGE_SIZE,
          total: data.length,
          from: data.length ? 1 : 0,
          to: data.length,
        },
      };
    },
  });

  const payments = paymentResponse?.data ?? [];
  const meta = paymentResponse?.meta;
  const totalPayments = meta?.total ?? payments.length ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, (meta?.last_page ?? Math.ceil(totalPayments / PAGE_SIZE)) || 1),
    [meta?.last_page, totalPayments],
  );

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visiblePayments = payments ?? [];
  const showingFrom = meta?.from ?? (totalPayments === 0 ? 0 : (page - 1) * PAGE_SIZE + 1);
  const showingTo = meta?.to ?? Math.min(totalPayments, (page - 1) * PAGE_SIZE + visiblePayments.length);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Payment deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete payment");
    },
  });

  const handleDeleteClick = (payment: any) => {
    setPaymentToDelete(payment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (paymentToDelete) {
      deleteMutation.mutate(paymentToDelete.id);
    }
  };

  const formatPaymentDate = (payment: any) => {
    const resolvedDate = resolvePaymentDateTime(payment);
    if (!resolvedDate) {
      return "-";
    }

    const parsedDate = new Date(resolvedDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return format(parsedDate, "MMM d, yyyy HH:mm");
  };

  const buildReceiptPayload = (payment: any) => {
    const customer = payment.customer || payment.customers || {};
    return {
      ...payment,
      payment_date: resolvePaymentDateTime(payment) || new Date().toISOString(),
      customers: {
        name: customer.name || "Customer",
        connection_id: customer.connection_id || payment.connection?.box_number || "N/A",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      },
      collector: payment.payment_agent
        ? {
            name: payment.payment_agent.name,
            code: payment.payment_agent.code,
            phone: payment.payment_agent.phone,
          }
        : undefined,
    };
  };

  const handleDownloadReceipt = async (payment: any) => {
    try {
      const company = companyProfile ?? (await fetchCompanyProfile());
      const doc = await generateReceiptPDF(buildReceiptPayload(payment), company);
      downloadPDF(doc, `receipt-${payment.receipt_number}.pdf`);
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate receipt");
      console.error(error);
    }
  };

  const handlePrintReceipt = async (payment: any) => {
    try {
      await printPaymentReceiptDocument(payment.id);
    } catch (error) {
      toast.error("Failed to print receipt");
      console.error(error);
    }
  };

  const resolveLinkedInvoiceId = (payment: any): string | null => {
    const allocations = payment?.allocations;
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return null;
    }

    const first = allocations[0];
    return first?.invoice_id ?? first?.invoiceId ?? first?.invoice?.id ?? null;
  };

  const handlePrintLinkedInvoice = async (payment: any) => {
    const linkedInvoiceId = resolveLinkedInvoiceId(payment);
    if (!linkedInvoiceId) {
      toast.error("No invoice linked to this payment.");
      return;
    }

    try {
      await printInvoiceDocument(linkedInvoiceId);
    } catch (error) {
      toast.error("Failed to print linked invoice");
      console.error(error);
    }
  };

  const getMethodBadge = (method: string) => {
    return <Badge variant="outline">{getPaymentMethodLabel(method)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground mt-2">Track customer payments and receipts</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <CardTitle>All Payments</CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.from || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value || undefined }))}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.to || ""}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value || undefined }))}
                  className="w-48"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Method</label>
                <select
                  className="w-48 rounded border px-3 py-2 text-sm"
                  value={filters.method || "all"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      method: e.target.value === "all" ? undefined : e.target.value,
                    }))
                  }
                >
                  <option value="all">All Methods</option>
                  {["cash", "bank", "cheque", "online", "credit_card", "other"].map((method) => (
                    <option key={method} value={method}>
                      {getPaymentMethodLabel(method)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setPage(1)} disabled={isLoading}>
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    setPage(1);
                  }}
                  disabled={isLoading || (!filters.from && !filters.to && !filters.method)}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Connection / Purpose</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Collector</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Reference / Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.customer?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.customer?.connection_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.connection ? (
                        <div className="font-medium">{payment.connection.box_number || "Connection"}</div>
                      ) : (
                        <span className="text-muted-foreground">All Connections / General</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-accent">
                      Rs {Number(payment.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{getMethodBadge(payment.payment_method)}</TableCell>
                    <TableCell className="text-sm">
                      {payment.payment_agent ? (
                        <div className="space-y-0.5">
                          <div className="font-medium">{payment.payment_agent.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {payment.payment_agent.code ? `#${payment.payment_agent.code}` : payment.payment_agent.phone || ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Counter / System</span>
                      )}
                    </TableCell>
                    <TableCell>{formatPaymentDate(payment)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[240px]">
                      {payment.reference_number?.trim() || payment.notes?.trim() ? (
                        <div className="space-y-1">
                          {payment.reference_number?.trim() && (
                            <div className="text-foreground">Ref: {payment.reference_number}</div>
                          )}
                          {payment.notes?.trim() && <div>{payment.notes}</div>}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadReceipt(payment)}
                          title="Download Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" title="Print options">
                              <Printer className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrintReceipt(payment)}>
                              Print Receipt (80mm)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!resolveLinkedInvoiceId(payment)}
                              onClick={() => handlePrintLinkedInvoice(payment)}
                            >
                              Print Invoice (A4)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPayment(payment)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(payment)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {totalPayments === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalPayments > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalPayments} payments
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingPayment && (
        <EditPaymentDialog
          payment={editingPayment}
          open={!!editingPayment}
          onOpenChange={(open) => !open && setEditingPayment(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete payment {paymentToDelete?.receipt_number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;
