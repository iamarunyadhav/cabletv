import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomerSearchBar, CustomerSearchResult } from "@/components/customer/CustomerSearchBar";
import { CustomerSummaryHeader } from "@/components/customer/CustomerSummaryHeader";
import { AccountAdjustmentsPanel } from "@/components/customer/AccountAdjustmentsPanel";
import { RightPosPanel } from "@/components/customer/RightPosPanel";
import { useCustomer } from "@/hooks/queries/customer";

const QuickPOS = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCustomerPreview, setSelectedCustomerPreview] = useState<CustomerSearchResult | null>(null);
  const [posSignal, setPosSignal] = useState(0);

  const {
    data: accountData,
    isLoading,
    isError,
    refetch,
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
          <h1 className="text-2xl font-semibold">Quick POS</h1>
          <p className="text-sm text-muted-foreground">Collect payments and opening balances from one screen.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Search Customer
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
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCustomerId ? (
        isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load customer</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              There was an error fetching this customer.
              <Button size="sm" variant="outline" onClick={() => refetch()} className="ml-4 gap-1">
                <RefreshCcw className="h-4 w-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : accountData ? (
          <CustomerSummaryHeader
            customer={accountData.customer}
            stats={accountData.stats}
            connections={accountData.connections}
            onSendSMS={() => {}}
            onAddPayment={handleAddPaymentClick}
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
          <CardContent className="space-y-3 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Customer summary</p>
                <p className="text-xs text-muted-foreground">Select a customer to populate this preview.</p>
              </div>
              <Badge variant="outline">Preview</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="text-lg font-semibold text-muted-foreground">LKR 0.00</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-lg font-semibold text-muted-foreground">0</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Last Payment</p>
                <p className="text-lg font-semibold text-muted-foreground">—</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All cards stay visible; choosing a customer will instantly replace this preview with live data.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_450px]">
        <AccountAdjustmentsPanel
          className="sticky top-20 h-fit"
          customerId={selectedCustomerId || undefined}
          connections={accountData?.connections || []}
          onSuccess={() => refetch()}
        />

        <div className="sticky top-20" id="pos-panel">
          {selectedCustomerId && accountData ? (
            <RightPosPanel
              customerId={selectedCustomerId}
              connections={accountData.connections}
              unpaidInvoices={accountData.unpaidInvoices}
              onPaymentSuccess={() => refetch()}
              openSignal={posSignal}
              showAdjustments={false}
            />
          ) : (
            <Card className="border-2 border-dashed shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a customer to open the POS panel.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickPOS;
