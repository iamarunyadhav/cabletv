import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { CheckCircle2, Download, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { Money } from "@/components/common/Money";
import { Skeleton } from "@/components/ui/skeleton";

const printStyles = `
  @media print {
    @page {
      margin: 2cm;
    }
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .print\\:hidden {
      display: none !important;
    }
  }
`;

export default function Receipt() {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();

  const { data: receiptData, isLoading } = useQuery({
    queryKey: ["receipt", receiptNumber],
    queryFn: async () => {
      const response = await apiClient.get(`/payments/receipt/${receiptNumber}`);
      return response.data;
    },
    enabled: !!receiptNumber,
  });

  const payment = receiptData?.payment;
  const companySettings = receiptData?.company;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <ReceiptIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Receipt Not Found</h2>
              <p className="text-muted-foreground">
                The receipt {receiptNumber} could not be found.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const customer = payment.customers as any;
  const connection = (payment.connection ?? payment.connections) as any;
  const prepaidLabel = connection?.prepaid_through_label;
  const balanceAfter = typeof payment.balance_after === "number" ? payment.balance_after : null;
  const methodLabels: Record<string, string> = {
    cash: "Cash",
    cheque: "Cheque",
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
    upi: "UPI / Online",
    other: "Other",
  };

  return (
    <>
      <style>{printStyles}</style>
      <div className="min-h-screen bg-background p-4 md:p-8 print:p-0">
        <div className="mx-auto max-w-2xl space-y-4 print:space-y-2">
        {/* Header Actions - Hidden on print */}
        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Receipt Card */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="text-center space-y-4 print:pb-4">
            {/* Company Info */}
            <div>
              <h1 className="text-2xl font-bold print:text-3xl">
                {companySettings?.company_name || "Cable TV Service"}
              </h1>
              {companySettings?.company_address && (
                <p className="text-sm text-muted-foreground mt-1">
                  {companySettings.company_address}
                </p>
              )}
              {companySettings?.company_phone && (
                <p className="text-sm text-muted-foreground">
                  Tel: {companySettings.company_phone}
                </p>
              )}
            </div>

            <Separator />

            {/* Receipt Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle className="text-xl">Payment Receipt</CardTitle>
              </div>
              <Badge variant="outline" className="text-base px-4 py-1">
                {payment.receipt_number}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 print:space-y-4">
            {/* Customer Details */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                Customer Details
              </h3>
              <div className="space-y-1">
                <p className="font-semibold text-lg">{customer.name}</p>
                {connection?.box_number && (
                  <p className="text-sm">Box: {connection.box_number}</p>
                )}
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
                {customer.email && (
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {format(new Date(payment.payment_date), "dd MMM yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">
                    {methodLabels[payment.payment_method] || payment.payment_method}
                  </p>
                </div>
              </div>

              {payment.reference_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{payment.reference_number}</p>
                </div>
              )}

              {payment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{payment.notes}</p>
                </div>
              )}

              {balanceAfter !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Balance After</p>
                  <p className="font-medium">
                    <Money amount={balanceAfter} />
                  </p>
                </div>
              )}

              {balanceAfter !== null && balanceAfter < 0 && prepaidLabel && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Prepaid until {prepaidLabel}
                </div>
              )}
            </div>

            <Separator />

            {/* Amount Section */}
            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Amount Paid</p>
              <p className="text-4xl font-bold text-primary">
                <Money amount={payment.amount} />
              </p>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Thank you for your payment!
              </p>
              <p className="text-xs text-muted-foreground">
                Receipt generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}
              </p>
              <p className="text-xs text-muted-foreground italic">
                This is a computer-generated receipt and does not require a signature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
