import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerOverviewTab } from "@/components/customer/tabs/CustomerOverviewTab";
import { CustomerConnectionsTab } from "@/components/customer/tabs/CustomerConnectionsTab";
import { CustomerLedgerTab } from "@/components/customer/tabs/CustomerLedgerTab";
import { CustomerInvoicesTab } from "@/components/customer/tabs/CustomerInvoicesTab";
import { CustomerPaymentsTab } from "@/components/customer/tabs/CustomerPaymentsTab";
import { CustomerActivityTab } from "@/components/customer/tabs/CustomerActivityTab";
import {
  Connection,
  CustomerChargesVsPaymentsPoint,
  Invoice,
  Payment,
} from "@/types/customer";

interface CustomerTabsProps {
  customerId: string;
  customerName: string;
  connections: Connection[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
  chargesVsPayments: CustomerChargesVsPaymentsPoint[];
  onAddPaymentClick: () => void;
  onConnectionUpdated?: () => void;
}

export function CustomerTabs({
  customerId,
  customerName,
  connections,
  recentInvoices,
  recentPayments,
  chargesVsPayments,
  onAddPaymentClick,
  onConnectionUpdated,
}: CustomerTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="connections">Connections</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <CustomerOverviewTab
          customerId={customerId}
          customerName={customerName}
          connections={connections}
          recentInvoices={recentInvoices}
          recentPayments={recentPayments}
          chartData={chargesVsPayments}
        />
      </TabsContent>

      <TabsContent value="connections">
        <CustomerConnectionsTab
          customerId={customerId}
          connections={connections}
          onConnectionUpdated={onConnectionUpdated}
        />
      </TabsContent>

      <TabsContent value="ledger">
        <CustomerLedgerTab customerId={customerId} connections={connections} />
      </TabsContent>

      <TabsContent value="invoices">
        <CustomerInvoicesTab
          customerId={customerId}
          connections={connections.map((connection) => ({
            id: connection.id,
            boxNumber: connection.boxNumber,
          }))}
        />
      </TabsContent>

      <TabsContent value="payments">
        <CustomerPaymentsTab customerId={customerId} onAddPayment={onAddPaymentClick} />
      </TabsContent>

      <TabsContent value="activity">
        <CustomerActivityTab customerId={customerId} />
      </TabsContent>
    </Tabs>
  );
}
