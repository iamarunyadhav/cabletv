import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Cable, Receipt, IndianRupee, Activity, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";

interface CustomerDetailDialogProps {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDetailDialog = ({ customerId, open, onOpenChange }: CustomerDetailDialogProps) => {
  const queryClient = useQueryClient();
  
  const { data: customer } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}`);
      return response.data;
    },
    enabled: open,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["customer-connections", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/connections`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["customer-invoices", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/invoices`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/payments`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["customer-ledger", customerId],
    queryFn: async () => {
      const response = await apiClient.get(`/customers/${customerId}/ledger`);
      return response.data?.data ?? response.data ?? [];
    },
    enabled: open,
  });

  // Suspend/Resume mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiClient.patch(`/connections/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-connections", customerId] });
      toast.success("Connection status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleSuspend = (id: string) => {
    updateStatusMutation.mutate({ id, status: 'suspended' });
  };

  const handleResume = (id: string) => {
    updateStatusMutation.mutate({ id, status: 'active' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "outline",
      inactive: "secondary",
      suspended: "destructive",
      disconnect: "destructive",
      postpone: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getInvoiceStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      unpaid: "outline",
      partially_paid: "secondary",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.replace("_", " ")}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Customer Details</DialogTitle>
        </DialogHeader>

        {customer && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{customer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{customer.connection_id || customer.connection_number}</p>
                  </div>
                  {getStatusBadge(customer.status)}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer.phone || customer.primary_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">
                    {customer.area?.name ||
                      customer.billing_group?.area?.name ||
                      (customer as any).areas?.name ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing Group</p>
                  <p className="font-medium">{customer.billing_group?.name || (customer as any).billing_groups?.name || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{customer.address || customer.computed_address || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="connections" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connections" className="gap-2">
                  <Cable className="w-4 h-4" />
                  Connections
                </TabsTrigger>
                <TabsTrigger value="invoices" className="gap-2">
                  <Receipt className="w-4 h-4" />
                  Invoices
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <IndianRupee className="w-4 h-4" />
                  Payments
                </TabsTrigger>
                <TabsTrigger value="ledger" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Ledger
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connections" className="space-y-4">
                {connections?.map((conn) => (
                  <Card key={conn.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">Box #{conn.box_number}</CardTitle>
                          <p className="text-sm text-muted-foreground">{conn.package?.name || (conn as any).packages?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(conn.status)}
                          {conn.status === 'active' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSuspend(conn.id)}
                              disabled={updateStatusMutation.isPending}
                              className="gap-1"
                            >
                              <Pause className="w-3 h-3" />
                              Suspend
                            </Button>
                          )}
                          {(conn.status as string) === 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResume(conn.id)}
                              disabled={updateStatusMutation.isPending}
                              className="gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Base Package</span>
                        <span className="font-medium">LKR{Number(conn.package?.price || (conn as any).packages?.price || 0).toFixed(2)}/mo</span>
                      </div>
                      {conn.additional_channels?.length || conn.connection_additional_channels?.length ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Additional Channels</p>
                          {(conn.additional_channels || conn.connection_additional_channels || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.name || item.additional_channels?.name}</span>
                              <span>
                                LKR{Number(item.monthly_amount || item.additional_channels?.monthly_amount || 0).toFixed(2)}/mo
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="pt-3 border-t flex justify-between">
                        <span className="font-medium">Current Balance</span>
                        <span className={`font-bold ${conn.current_balance > 0 ? 'text-destructive' : 'text-accent'}`}>
                          LKR{Number(conn.current_balance || 0).toFixed(2)}
                        </span>
                      </div>
                      {conn.prepaid_through_label ? (
                        <div className="flex justify-end">
                          <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
                            Prepaid until {conn.prepaid_through_label}
                          </Badge>
                        </div>
                      ) : Number(conn.credit_balance || 0) > 0 ? (
                        <div className="flex justify-end">
                          <Badge variant="outline" className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700">
                            Credit LKR{Number(conn.credit_balance).toFixed(2)}
                          </Badge>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="invoices">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(invoice.billing_period_start), "MMM d")} - {format(new Date(invoice.billing_period_end), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>LKR{Number(invoice.total_amount).toFixed(2)}</TableCell>
                        <TableCell>LKR{Number(invoice.paid_amount).toFixed(2)}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="payments">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                        <TableCell>{format(new Date(payment.payment_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-accent font-medium">LKR{Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{payment.payment_method}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="ledger">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger?.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell><Badge variant="outline">{entry.type}</Badge></TableCell>
                        <TableCell className="text-sm">{entry.description}</TableCell>
                        <TableCell className={entry.type === 'charge' ? 'text-destructive' : 'text-accent'}>
                          {entry.type === 'charge' ? '+' : '-'}LKR{Number(entry.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">LKR{Number(entry.balance_after).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
