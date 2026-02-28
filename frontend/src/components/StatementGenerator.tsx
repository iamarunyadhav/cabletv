import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface StatementGeneratorProps {
  customer: any;
  ledgerEntries: any[];
  invoices: any[];
  payments: any[];
  connections: any[];
}

export const StatementGenerator = ({
  customer,
  ledgerEntries,
  invoices,
  payments,
  connections,
}: StatementGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const generateStatementPDF = () => {
    try {
      const doc = new jsPDF();
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      // Filter data by date range
      const filteredLedger = ledgerEntries?.filter((entry) => {
        const entryDate = new Date(entry.created_at);
        return entryDate >= startDate && entryDate <= endDate;
      }) || [];

      const filteredInvoices = invoices?.filter((invoice) => {
        const invoiceDate = new Date(invoice.created_at);
        return invoiceDate >= startDate && invoiceDate <= endDate;
      }) || [];

      const filteredPayments = payments?.filter((payment) => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate >= startDate && paymentDate <= endDate;
      }) || [];

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Account Statement", 14, 20);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Statement Period: ${format(startDate, "MMM d, yyyy")} - ${format(endDate, "MMM d, yyyy")}`, 14, 28);
      doc.text(`Generated: ${format(new Date(), "MMM d, yyyy HH:mm")}`, 14, 33);

      // Customer Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Information", 14, 45);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${customer.name}`, 14, 52);
      doc.text(`ID: ${customer.connection_id}`, 14, 57);
      doc.text(`Phone: ${customer.phone}`, 14, 62);
      doc.text(`Address: ${customer.address}`, 14, 67);
      const areaName =
        customer.area?.name || customer.billing_group?.area?.name || customer.areas?.name || "";
      if (areaName) {
        doc.text(`Area: ${areaName}`, 14, 72);
      }

      // Connections Summary
      let currentY = 82;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Active Connections", 14, currentY);
      currentY += 7;

      if (connections && connections.length > 0) {
        const connectionData = connections.map((conn: any) => [
          conn.box_number,
          conn.package?.name || conn.packages?.name || "N/A",
          conn.status,
          `Rs ${Number(conn.current_balance || 0).toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Box Number", "Package", "Status", "Balance"]],
          body: connectionData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No connections found", 14, currentY);
        currentY += 10;
      }

      // Ledger Entries
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Transaction History (Ledger)", 14, currentY);
      currentY += 7;

      if (filteredLedger.length > 0) {
        const ledgerData = filteredLedger.map((entry: any) => [
          format(new Date(entry.created_at), "MMM d, yyyy"),
          entry.type,
          entry.description || "-",
          `Rs ${Number(entry.amount).toFixed(2)}`,
          `Rs ${Number(entry.balance_after).toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Date", "Type", "Description", "Amount", "Balance"]],
          body: ledgerData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No transactions in selected period", 14, currentY);
        currentY += 10;
      }

      // Invoices
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Invoices", 14, currentY);
      currentY += 7;

      if (filteredInvoices.length > 0) {
        const invoiceData = filteredInvoices.map((invoice: any) => [
          invoice.invoice_number,
          format(new Date(invoice.created_at), "MMM d, yyyy"),
          invoice.status,
          `Rs ${Number(invoice.total_amount).toFixed(2)}`,
          `Rs ${Number(invoice.paid_amount).toFixed(2)}`,
          `Rs ${(Number(invoice.total_amount) - Number(invoice.paid_amount)).toFixed(2)}`,
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Invoice #", "Date", "Status", "Total", "Paid", "Balance"]],
          body: invoiceData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No invoices in selected period", 14, currentY);
        currentY += 10;
      }

      // Payments
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Payments Received", 14, currentY);
      currentY += 7;

      if (filteredPayments.length > 0) {
        const paymentData = filteredPayments.map((payment: any) => [
          payment.receipt_number,
          format(new Date(payment.payment_date), "MMM d, yyyy"),
          payment.payment_method.replace("_", " ").toUpperCase(),
          `Rs ${Number(payment.amount).toFixed(2)}`,
          payment.notes || "-",
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [["Receipt #", "Date", "Method", "Amount", "Notes"]],
          body: paymentData,
          theme: "striped",
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text("No payments in selected period", 14, currentY);
        currentY += 10;
      }

      // Summary
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      const totalCharges = filteredLedger
        .filter((e: any) => e.type === "charge")
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const totalPayments = filteredPayments.reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      );

      const currentBalance = connections?.reduce(
        (sum: number, c: any) => sum + Number(c.current_balance || 0),
        0
      ) || 0;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, currentY);
      currentY += 7;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Charges (Period): Rs ${totalCharges.toFixed(2)}`, 14, currentY);
      currentY += 6;
      doc.text(`Total Payments (Period): Rs ${totalPayments.toFixed(2)}`, 14, currentY);
      currentY += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`Current Outstanding Balance: Rs ${currentBalance.toFixed(2)}`, 14, currentY);

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Thank you for your business!", 105, 285, { align: "center" });

      return doc;
    } catch (error) {
      console.error("Error generating statement:", error);
      toast.error("Failed to generate statement");
      return null;
    }
  };

  const handleDownload = () => {
    const doc = generateStatementPDF();
    if (doc) {
      doc.save(
        `statement_${customer.connection_id}_${format(new Date(), "yyyyMMdd")}.pdf`
      );
      toast.success("Statement downloaded successfully");
    }
  };

  const handlePrint = () => {
    const doc = generateStatementPDF();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Generate Statement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Customer Statement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
