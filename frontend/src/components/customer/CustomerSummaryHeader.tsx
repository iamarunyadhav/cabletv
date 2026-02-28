import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/common/Money";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PermissionGate } from "@/components/common/PermissionGate";
import { Connection, Customer, CustomerStats } from "@/types/customer";
import { format } from "date-fns";
import {
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
} from "lucide-react";

interface CustomerSummaryHeaderProps {
  customer: Customer;
  stats: CustomerStats;
  connections?: Connection[];
  onSendSMS: () => void;
  onAddPayment: () => void;
  onEditCustomer?: () => void;
  onExportLedger?: () => void;
  onViewHistory?: () => void;
}

export function CustomerSummaryHeader({
  customer,
  stats,
  connections = [],
  onSendSMS,
  onAddPayment,
  onEditCustomer,
  onExportLedger,
  onViewHistory,
}: CustomerSummaryHeaderProps) {
  const lastPayment = stats.lastPayment;
  const prepaidConnections =
    connections.filter(
      (connection) => (connection.prepaidMonths ?? 0) > 0 || (connection.creditBalance ?? 0) > 0,
    );

  return (
    <Card className="border-2 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
                {customer.code && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {customer.code}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <a href={`tel:${customer.phone}`} className="flex items-center gap-2 hover:text-primary">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </a>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{customer.address || "Address not provided"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(customer.area || customer.billingGroup?.area) && (
                <Badge variant="outline" className="text-xs">
                  {customer.area?.name || customer.billingGroup?.area?.name}
                </Badge>
              )}
              {customer.billingGroup && (
                <Badge variant="outline" className="text-xs">
                  {customer.billingGroup.name}
                </Badge>
              )}
              <StatusBadge
                status={customer.aggregateStatus || customer.status}
                className="text-xs"
              />
            </div>

            {prepaidConnections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prepaidConnections.map((connection) => {
                  const hasMonths = (connection.prepaidMonths ?? 0) > 0 && connection.prepaidThroughLabel;
                  return (
                    <Badge
                      key={connection.id}
                      variant="outline"
                      className="text-xs border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      {connection.boxNumber ? `${connection.boxNumber}: ` : ""}
                      {hasMonths
                        ? `Prepaid until ${connection.prepaidThroughLabel} (${connection.prepaidMonths} months)`
                        : "Credit "}
                      {!hasMonths && <Money amount={connection.creditBalance || 0} />}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-full max-w-xl space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <Money amount={stats.currentBalance} className="text-lg font-semibold" />
              </div>
              <div className="rounded-lg border bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <div className="text-lg font-semibold">{stats.totalInvoices}</div>
                <Money amount={stats.totalInvoiceAmount} className="text-xs" />
              </div>
              <div className="rounded-lg border bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">Total Payments</p>
                <Money amount={stats.totalPayments} className="text-lg font-semibold" />
              </div>
              <div className="rounded-lg border bg-muted/70 p-3">
                <p className="text-xs text-muted-foreground">Last Payment</p>
                {lastPayment ? (
                  <>
                    <Money amount={lastPayment.amount} className="text-sm font-semibold" />
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(lastPayment.date), "MMM dd, yyyy")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No payments yet</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <PermissionGate required="sms.send">
                <Button onClick={onSendSMS} variant="outline" className="flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send SMS
                </Button>
              </PermissionGate>
              <PermissionGate required="payments.create">
                <Button onClick={onAddPayment} className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment
                </Button>
              </PermissionGate>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEditCustomer}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Customer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExportLedger}>
                    <Printer className="mr-2 h-4 w-4" />
                    Export Ledger CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onViewHistory}>
                    View Disconnect/Suspension History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
