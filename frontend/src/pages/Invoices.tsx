import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Pencil, Trash2, Download, Printer, Ticket } from "lucide-react";
import { toast } from "sonner";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";
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
import { generateInvoicePDF, downloadPDF, printPDF, generateThermalInvoicePDF } from "@/lib/pdfGenerator";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

const Invoices = () => {
  const queryClient = useQueryClient();
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const response = await apiClient.get("/invoices");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const totalInvoices = invoices?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [totalInvoices]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleInvoices = invoices?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalInvoices === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalInvoices, startIndex + visibleInvoices.length);

  const buildInvoicePayload = (invoice: any) => {
    const customer = invoice.customer || invoice.customers || {};
    return {
      ...invoice,
      billing_period_start: invoice.billing_period_start || invoice.period_start,
      billing_period_end: invoice.billing_period_end || invoice.period_end,
      customers: {
        name: customer.name || "Customer",
        connection_id: customer.connection_id || "N/A",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      },
      invoice_items: invoice.invoice_items || invoice.items || [],
    };
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted successfully");
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  const handleDeleteClick = (invoice: any) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete.id);
    }
  };

  const handleDownloadPDF = async (invoice: any) => {
    try {
      const doc = await generateInvoicePDF(buildInvoicePayload(invoice));
      downloadPDF(doc, `invoice-${invoice.invoice_number}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    }
  };

  const handlePrintPDF = async (invoice: any) => {
    try {
      const doc = await generateInvoicePDF(buildInvoicePayload(invoice));
      printPDF(doc);
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    }
  };

  const handleThermalPrint = async (invoice: any) => {
    try {
      const doc = await generateThermalInvoicePDF(buildInvoicePayload(invoice));
      printPDF(doc);
    } catch (error) {
      toast.error("Failed to generate thermal invoice");
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      unpaid: "outline",
      partially_paid: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
        <p className="text-muted-foreground mt-2">View and manage customer invoices</p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
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
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.customer?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {invoice.customer?.connection_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(invoice.billing_period_start), "MMM d")} -{" "}
                      {format(new Date(invoice.billing_period_end), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      Rs {Number(invoice.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      Rs {Number(invoice.paid_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.due_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadPDF(invoice)}
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrintPDF(invoice)}
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleThermalPrint(invoice)}
                          title="Thermal / Small bill"
                        >
                          <Ticket className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingInvoice(invoice)}
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(invoice)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {totalInvoices === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No invoices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalInvoices > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalInvoices} invoices
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

      {editingInvoice && (
        <EditInvoiceDialog
          invoice={editingInvoice}
          open={!!editingInvoice}
          onOpenChange={(open) => !open && setEditingInvoice(null)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceToDelete?.invoice_number}? This action cannot be undone.
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

export default Invoices;
