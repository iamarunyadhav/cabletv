import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomerAccountLayout } from "@/components/customer/CustomerAccountLayout";
import { useCustomer } from "@/hooks/queries/customer";
import SendSMSDialogSingle from "@/components/SendSMSDialogSingle";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [posSignal, setPosSignal] = useState(0);
  const { data, isLoading, isError, refetch } = useCustomer(id);

  const handleAddPaymentClick = () => {
    setPosSignal((signal) => signal + 1);
    const panel = document.getElementById("pos-panel");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const qs = location.search || "";
            navigate(`/dashboard/customers${qs}`);
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">Customer Account</h1>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load customer</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            There was an error connecting to the backend. Please retry.
            <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-4">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {data && id && (
        <CustomerAccountLayout
          customerId={id}
          data={data}
          onSendSMS={() => setSmsDialogOpen(true)}
          onAddPaymentClick={handleAddPaymentClick}
          onPaymentSuccess={() => refetch()}
          paymentPanelSignal={posSignal}
        />
      )}

      {data?.customer && (
        <SendSMSDialogSingle
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          customerId={data.customer.id}
          name={data.customer.name}
          phone={data.customer.phone}
        />
      )}
    </div>
  );
}
