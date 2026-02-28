import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Filter } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/common/DataTable";
import { Money } from "@/components/common/Money";
import { useCustomerLedger } from "@/hooks/queries/customer";
import { Connection, LedgerEntry, LedgerFilters } from "@/types/customer";
import { useToast } from "@/hooks/use-toast";

interface CustomerLedgerTabProps {
  customerId: string;
  connections: Connection[];
}

const typeOptions = [
  { label: "Charges", value: "charge" },
  { label: "Payments", value: "payment" },
  { label: "Adjustments", value: "adjustment" },
];

export function CustomerLedgerTab({ customerId, connections }: CustomerLedgerTabProps) {
  const [filters, setFilters] = useState<LedgerFilters>({ types: [] });
  const { toast } = useToast();
  const { data, isLoading } = useCustomerLedger(customerId, filters);

  const columns: DataTableColumn<LedgerEntry>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (row) => new Date(row.date).toLocaleString(),
      },
      {
        key: "type",
        header: "Type",
        cell: (row) => row.type.toUpperCase(),
      },
      {
        key: "description",
        header: "Description",
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.description}</span>
            <span className="text-xs text-muted-foreground">{row.reference}</span>
          </div>
        ),
      },
      {
        key: "memo",
        header: "Note",
        cell: (row) => row.memo || "—",
      },
      {
        key: "connection",
        header: "Connection",
        cell: (row) => row.connectionBoxNumber || "All",
      },
      {
        key: "debit",
        header: "Debit",
        className: "text-right",
        cell: (row) => (row.debit ? <Money amount={row.debit} /> : "-"),
      },
      {
        key: "credit",
        header: "Credit",
        className: "text-right",
        cell: (row) => (row.credit ? <Money amount={row.credit} showSign /> : "-"),
      },
      {
        key: "balance",
        header: "Balance",
        className: "text-right",
        cell: (row) => <Money amount={row.balanceAfter} />,
      },
    ],
    []
  );

  const toggleType = (value: string) => {
    setFilters((current) => {
      const types = current.types || [];
      return {
        ...current,
        types: types.includes(value)
          ? types.filter((item) => item !== value)
          : [...types, value],
      };
    });
  };

  const updateFilter = (key: keyof LedgerFilters, value?: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const exportLedger = () => {
    if (!data?.entries?.length) {
      toast({
        title: "Nothing to export",
        description: "No ledger entries match the selected filters.",
      });
      return;
    }

    const headers = ["Date", "Type", "Description", "Note", "Connection", "Debit", "Credit", "Balance"];
    const rows = data.entries.map((entry) => [
      new Date(entry.date).toISOString(),
      entry.type,
      entry.description,
      entry.memo || "",
      entry.connectionBoxNumber || "All",
      entry.debit ? entry.debit.toFixed(2) : "",
      entry.credit ? entry.credit.toFixed(2) : "",
      entry.balanceAfter.toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = value ?? "";
            if (typeof stringValue === "string" && stringValue.includes(",")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `customer-${customerId}-ledger.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search description or reference"
          className="max-w-xs"
          value={filters.search || ""}
          onChange={(event) => updateFilter("search", event.target.value)}
        />

        <Input
          type="date"
          value={filters.from || ""}
          onChange={(event) => updateFilter("from", event.target.value)}
        />
        <Input
          type="date"
          value={filters.to || ""}
          onChange={(event) => updateFilter("to", event.target.value)}
        />

        <Select
          value={filters.connectionId || "all"}
          onValueChange={(value) => updateFilter("connectionId", value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Connection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Connections</SelectItem>
            {connections.map((connection) => (
              <SelectItem key={connection.id} value={connection.id}>
                {connection.boxNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Type
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {typeOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={filters.types?.includes(option.value)}
                onCheckedChange={() => toggleType(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" className="ml-auto gap-2" onClick={exportLedger}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase">Current Balance</p>
          <Money amount={data?.currentBalance || 0} className="text-xl font-semibold" />
        </div>
        <div className="text-sm text-muted-foreground">
          {data?.entries.length || 0} entries
        </div>
      </div>

      <DataTable
        data={data?.entries}
        columns={columns}
        isLoading={isLoading}
        getRowId={(row) => row.id}
        emptyState="No ledger entries found for the selected filters."
      />
    </div>
  );
}
