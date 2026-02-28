import { CustomerSummaryHeader } from "@/components/customer/CustomerSummaryHeader";
import { CustomerTabs } from "@/components/customer/CustomerTabs";
import { RightPosPanel } from "@/components/customer/RightPosPanel";
import { CustomerDetailResponse } from "@/types/customer";

interface CustomerAccountLayoutProps {
  customerId: string;
  data: CustomerDetailResponse;
  onSendSMS: () => void;
  onAddPaymentClick: () => void;
  onPaymentSuccess?: () => void;
  onConnectionUpdated?: () => void;
  paymentPanelSignal?: number;
}

export function CustomerAccountLayout({
  customerId,
  data,
  onSendSMS,
  onAddPaymentClick,
  onPaymentSuccess,
  onConnectionUpdated,
  paymentPanelSignal,
}: CustomerAccountLayoutProps) {
  return (
    <div className="space-y-6">
      <CustomerSummaryHeader
        customer={data.customer}
        stats={data.stats}
        connections={data.connections}
        onSendSMS={onSendSMS}
        onAddPayment={onAddPaymentClick}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
        <CustomerTabs
          customerId={customerId}
          customerName={data.customer.name}
          connections={data.connections}
          recentInvoices={data.recentInvoices}
          recentPayments={data.recentPayments}
          chargesVsPayments={data.chargesVsPayments}
            onAddPaymentClick={onAddPaymentClick}
            onConnectionUpdated={onConnectionUpdated}
          />
        </div>

        <RightPosPanel
          customerId={customerId}
          connections={data.connections}
          unpaidInvoices={data.unpaidInvoices}
          openSignal={paymentPanelSignal}
          onPaymentSuccess={onPaymentSuccess}
        />
      </div>
    </div>
  );
}
