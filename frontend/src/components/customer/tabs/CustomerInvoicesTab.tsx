import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, Printer, Send } from "lucide-react";
import { useCustomerInvoices } from "@/hooks/queries/customer";
import { Invoice, ListFilters } from "@/types/customer";
import { Money } from "@/components/common/Money";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { PermissionGate } from "@/components/common/PermissionGate";
import { apiClient } from "@/lib/apiClient";
import { printInvoiceDocument } from "@/lib/printHelpers";

interface CustomerInvoicesTabProps {
  customerId: string;
  connections: { id: string; boxNumber: string }[];
}

const statusOptions = ["draft", "pending", "paid", "overdue"];
const typeOptions = ["monthly", "setup"];

export function CustomerInvoicesTab({ customerId, connections }: CustomerInvoicesTabProps) {
  const [filters, setFilters] = useState<ListFilters>({ perPage: 10, page: 1 });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();
  const { data, isLoading } = useCustomerInvoices(customerId, filters);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);

  const invoices = data?.data || [];
  const meta = data?.meta;

  const handleExport = () => {
    if (!invoices.length) {
      toast({
        title: "Nothing to export",
        description: "No invoices match the selected filters.",
      });
      return;
    }

    const headers = [
      "Invoice",
      "Date",
      "Period",
      "Connection",
      "Subtotal",
      "Payments",
      "Balance",
      "Status",
    ];
    const rows = invoices.map((invoice) => [
      invoice.invoiceNumber,
      new Date(invoice.date).toISOString(),
      invoice.period || "",
      invoice.connectionBoxNumber || "All",
      invoice.subtotal.toFixed(2),
      invoice.paymentsApplied.toFixed(2),
      invoice.balanceDue.toFixed(2),
      invoice.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            if (value.includes(",")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `customer-${customerId}-invoices.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const sendInvoiceSms = async (invoice: Invoice) => {
    try {
      await apiClient.post("/sms/send", {
        customers: [customerId],
        message: `Invoice ${invoice.invoiceNumber} balance LKR ${invoice.balanceDue.toFixed(
          2
        )}. Please settle before due date.`,
        type: "invoice",
      });
      toast({ title: "SMS queued", description: `Invoice ${invoice.invoiceNumber} SMS queued.` });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send invoice SMS";
      toast({
        title: "SMS failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      setPrintingInvoiceId(invoiceId);
      await printInvoiceDocument(invoiceId);
    } catch (error: any) {
      toast({
        title: "Unable to print invoice",
        description: error?.message ?? "Failed to load invoice PDF.",
        variant: "destructive",
      });
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const filtersRow = (
    <div className="flex flex-wrap gap-3">
      <Input
        type="date"
        value={filters.from || ""}
        onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value || undefined }))}
      />
      <Input
        type="date"
        value={filters.to || ""}
        onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value || undefined }))}
      />
      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, status: value === "all" ? undefined : value }))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.type || "all"}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, type: value === "all" ? undefined : value }))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {typeOptions.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.connectionId || "all"}
        onValueChange={(value) =>
          setFilters((prev) => ({
            ...prev,
            connectionId: value === "all" ? undefined : value,
          }))
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Connection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Connections</SelectItem>
          {connections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.boxNumber}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" className="ml-auto gap-2" onClick={handleExport}>
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {filtersRow}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date / Period</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Payments</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  Loading invoices...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                  No invoices found for selected filters.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell className="capitalize">{invoice.type}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{new Date(invoice.date).toLocaleDateString()}</span>
                    {invoice.period && (
                      <span className="text-xs text-muted-foreground">{invoice.period}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{invoice.connectionBoxNumber || "All"}</TableCell>
                <TableCell className="text-right">
                  <Money amount={invoice.subtotal} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={invoice.paymentsApplied} />
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={invoice.balanceDue} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} className="text-xs" />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(invoice)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePrintInvoice(invoice.id)}
                    disabled={printingInvoiceId === invoice.id}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </Button>
                  <PermissionGate required="sms.send">
                    <Button variant="ghost" size="icon" onClick={() => sendInvoiceSms(invoice)}>
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send SMS</span>
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta?.total ? (
        <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {meta.from} - {meta.to} of {meta.total} invoices
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={(filters.page ?? 1) >= (meta.last_page ?? 1)}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  page: Math.min(meta?.last_page ?? (prev.page ?? 1), (prev.page ?? 1) + 1),
                }))
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p>{selectedInvoice.period || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Connection</p>
                  <p>{selectedInvoice.connectionBoxNumber || "All"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.lineItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <Money amount={item.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-2 text-sm sm:items-end">
                <div className="flex w-full max-w-xs justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <Money amount={selectedInvoice.subtotal} />
                </div>
                <div className="flex w-full max-w-xs justify-between">
                  <span className="text-muted-foreground">Payments Applied</span>
                  <Money amount={selectedInvoice.paymentsApplied} />
                </div>
                <div className="flex w-full max-w-xs justify-between text-base font-semibold">
                  <span>Balance Due</span>
                  <Money amount={selectedInvoice.balanceDue} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
