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
import { Eye, Printer } from "lucide-react";
import { useCustomerPayments } from "@/hooks/queries/customer";
import { ListFilters, Payment } from "@/types/customer";
import { Money } from "@/components/common/Money";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { printPaymentReceiptDocument } from "@/lib/printHelpers";
import { PAYMENT_METHODS, getPaymentMethodLabel } from "@/constants/paymentMethods";

interface CustomerPaymentsTabProps {
  customerId: string;
  onAddPayment: () => void;
}

export function CustomerPaymentsTab({ customerId, onAddPayment }: CustomerPaymentsTabProps) {
  const [filters, setFilters] = useState<ListFilters>({ perPage: 10, page: 1 });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { data, isLoading } = useCustomerPayments(customerId, filters);
  const { toast } = useToast();
  const [printingPaymentId, setPrintingPaymentId] = useState<string | null>(null);
  const payments = data?.data || [];
  const meta = data?.meta;

  const handlePrintPayment = async (paymentId: string) => {
    try {
      setPrintingPaymentId(paymentId);
      await printPaymentReceiptDocument(paymentId);
    } catch (error: any) {
      toast({
        title: "Unable to print receipt",
        description: error?.message ?? "Failed to load receipt PDF.",
        variant: "destructive",
      });
    } finally {
      setPrintingPaymentId(null);
    }
  };

  return (
    <div className="space-y-4">
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
          value={filters.method || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              page: 1,
              method: value === "all" ? undefined : value,
            }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <PermissionGate required="payments.create">
            <Button onClick={onAddPayment}>Add Payment</Button>
          </PermissionGate>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Allocations</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Loading payments...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  No payments found.
                </TableCell>
              </TableRow>
            )}
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{new Date(payment.date).toLocaleString()}</TableCell>
                <TableCell>
                  <Money amount={payment.amount} />
                </TableCell>
                <TableCell>{getPaymentMethodLabel(payment.method)}</TableCell>
                <TableCell>{payment.connectionBoxNumber || "All"}</TableCell>
                <TableCell className="max-w-xs">
                  {payment.allocations?.length ? (
                    <div className="text-xs text-muted-foreground">
                      {payment.allocations.map((allocation) => (
                        <div key={allocation.invoiceId}>
                          {allocation.invoiceNumber} ({allocation.amount})
                        </div>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {payment.referenceNumber || payment.notes ? (
                    <div className="space-y-1">
                      {payment.referenceNumber && <div className="text-foreground">Ref: {payment.referenceNumber}</div>}
                      {payment.notes && <div>{payment.notes}</div>}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedPayment(payment)}>
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePrintPayment(payment.id)}
                    disabled={printingPaymentId === payment.id}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="sr-only">Print</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {meta?.total ? (
        <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {meta.from} - {meta.to} of {meta.total} payments
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

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment {selectedPayment?.receiptNumber || selectedPayment?.id}</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{new Date(selectedPayment.date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p>{getPaymentMethodLabel(selectedPayment.method)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <Money amount={selectedPayment.amount} />
                </div>
                <div>
                  <p className="text-muted-foreground">Connection</p>
                  <p>{selectedPayment.connectionBoxNumber || "All"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reference</p>
                  <p>{selectedPayment.referenceNumber || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Allocations</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPayment.allocations?.map((allocation) => (
                      <TableRow key={allocation.invoiceId}>
                        <TableCell>
                          {allocation.invoiceNumber}
                          {allocation.period && (
                            <span className="block text-xs text-muted-foreground">
                              {allocation.period}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Money amount={allocation.amount} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {!selectedPayment.allocations?.length && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                          Not allocated
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div>
                <p className="text-muted-foreground">Notes</p>
                <p>{selectedPayment.notes || "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
