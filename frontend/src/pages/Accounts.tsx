import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Users } from "lucide-react";
import { CustomerAccountLayout } from "@/components/customer/CustomerAccountLayout";
import { useCustomer } from "@/hooks/queries/customer";
import SendSMSDialogSingle from "@/components/SendSMSDialogSingle";
import { Badge } from "@/components/ui/badge";
import { CustomerSearchBar, CustomerSearchResult } from "@/components/customer/CustomerSearchBar";

const Accounts = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomerPreview, setSelectedCustomerPreview] = useState<CustomerSearchResult | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [posSignal, setPosSignal] = useState(0);

  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
    refetch: refetchAccount,
  } = useCustomer(selectedCustomerId || undefined);

  const handleAddPaymentClick = () => {
    setPosSignal((signal) => signal + 1);
    const panel = document.getElementById("pos-panel");
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer Accounts</h1>
          <p className="text-sm text-muted-foreground">Search for a customer to view their 360 POS workspace.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Select Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CustomerSearchBar
            label="Search & Select"
            onSelect={(customer) => {
              setSelectedCustomerId(customer.id);
              setSelectedCustomerPreview(customer);
            }}
          />

          {selectedCustomerPreview && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{selectedCustomerPreview.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomerPreview.connection_id} - {selectedCustomerPreview.phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCustomerPreview.area && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCustomerPreview.area.code || selectedCustomerPreview.area.name}
                    </Badge>
                  )}
                  {selectedCustomerPreview.billing_group && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedCustomerPreview.billing_group.name}
                    </Badge>
                  )}
                  {selectedCustomerPreview.status && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {selectedCustomerPreview.status}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomerId ? (
        accountLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        ) : accountError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load account</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              There was an error fetching this customer's account. Please retry.
              <Button size="sm" variant="outline" onClick={() => refetchAccount()} className="ml-4 gap-1">
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : accountData ? (
          <CustomerAccountLayout
            customerId={selectedCustomerId}
            data={accountData}
            onSendSMS={() => setSmsDialogOpen(true)}
            onAddPaymentClick={handleAddPaymentClick}
            onPaymentSuccess={() => refetchAccount()}
            paymentPanelSignal={posSignal}
          />
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No data found for the selected customer.
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-8">
            <p className="font-semibold">Workspace preview</p>
            <p className="text-sm text-muted-foreground">
              Components stay visible. Pick a customer to load live balances, ledger, invoices, and POS panel instantly.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Current balance: LKR 0.00
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Invoices: 0 | Payments: 0
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Ledger & POS panel ready
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCustomerId && accountData?.customer && (
        <SendSMSDialogSingle
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          customerId={accountData.customer.id}
          name={accountData.customer.name}
          phone={accountData.customer.phone}
        />
      )}
    </div>
  );
};

export default Accounts;
