import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/common/Money";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Connection,
  CustomerChargesVsPaymentsPoint,
  Invoice,
  Payment,
} from "@/types/customer";
import { printShortPaymentReceiptDocument } from "@/lib/printHelpers";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { Printer, Send } from "lucide-react";

interface CustomerOverviewTabProps {
  customerId: string;
  customerName: string;
  connections: Connection[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  chartData: CustomerChargesVsPaymentsPoint[];
}

export function CustomerOverviewTab({
  customerId,
  customerName,
  connections,
  recentInvoices,
  recentPayments,
  chartData,
}: CustomerOverviewTabProps) {
  const { toast } = useToast();

  const totalOutstanding = connections.reduce(
    (sum, conn) => sum + (Number(conn.connectionBalance) || 0),
    0,
  );

  const handlePrint = async (paymentId: string) => {
    try {
      await printShortPaymentReceiptDocument(paymentId, {
        connections,
        totalBalance: totalOutstanding,
      });
    } catch (error) {
      toast({
        title: "Unable to print receipt",
        description: (error as Error).message ?? "Failed to generate receipt PDF.",
        variant: "destructive",
      });
    }
  };

  const handleSendSms = async (payment: Payment) => {
    try {
      const receipt = payment.receiptNumber || payment.id;
      const message = `Hi ${customerName},
Receipt: ${receipt}
Date: ${format(new Date(payment.date), "dd/MM/yyyy")}
Amount: LKR ${payment.amount.toFixed(2)}
Method: ${payment.method}
Outstanding (all): LKR ${totalOutstanding.toFixed(2)}
Thank you!`;

      await apiClient.post("/sms/send", {
        customers: [customerId],
        message,
        type: "payment_receipt",
      });

      toast({ title: "Receipt SMS sent" });
    } catch (error) {
      toast({
        title: "Unable to send SMS",
        description: (error as Error).message ?? "SMS delivery failed.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Active Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length === 0 && (
              <p className="text-sm text-muted-foreground">No connections configured.</p>
            )}

            {connections.map((connection) => {
              const setupTotal = connection.setupItems.reduce(
                (sum, item) => sum + item.price,
                0
              );
              const additionalFee = connection.additionalChannels.reduce(
                (sum, item) => sum + item.monthlyAmount,
                0
              );
              const monthlyTotal = connection.monthlyAmount + additionalFee;

              return (
                <div
                  key={connection.id}
                  className="rounded-lg border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold">{connection.boxNumber}</div>
                      <p className="text-sm text-muted-foreground">{connection.packageName}</p>
                    </div>
                    <StatusBadge status={connection.status} />
                  </div>

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Monthly Charge</dt>
                      <dd>
                        <Money amount={monthlyTotal} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Balance</dt>
                      <dd>
                        <Money amount={connection.connectionBalance} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Setup Cost</dt>
                      <dd>
                        <Money amount={setupTotal} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Billing Cycle</dt>
                      <dd>{connection.billingCycle || "Group default"}</dd>
                    </div>
                  </dl>

                  {connection.additionalChannels.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {connection.additionalChannels.map((channel) => (
                        <Badge key={channel.id} variant="outline" className="text-xs">
                          {channel.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Charges vs Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="charges" barSize={20} fill="#0ea5e9" name="Charges" />
                  <Line
                    type="monotone"
                    dataKey="payments"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Payments"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.slice(0, 5).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium text-sm">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">
                      {invoice.period ||
                        format(new Date(invoice.date), invoice.type === "monthly" ? "MMM yyyy" : "dd MMM")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={invoice.balanceDue} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} className="text-xs" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.slice(0, 5).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {format(new Date(payment.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{payment.method}</TableCell>
                    <TableCell className="text-right">
                      <Money amount={payment.amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePrint(payment.id)}
                          title="Print receipt"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="sr-only">Print</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSendSms(payment)}
                          title="Send SMS"
                        >
                          <Send className="h-4 w-4" />
                          <span className="sr-only">Send SMS</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
