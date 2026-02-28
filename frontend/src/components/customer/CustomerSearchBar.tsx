import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";

export interface CustomerSearchResult {
  id: string;
  name: string;
  connection_id?: string;
  phone?: string;
  address?: string;
  status?: string;
  current_balance?: number;
  area?: { id: string; name: string; code?: string } | null;
  billing_group?: { id: string; name: string; area?: { id: string; name: string; code?: string } } | null;
}

interface CustomerSearchBarProps {
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSelect: (customer: CustomerSearchResult) => void;
  defaultScope?: string;
}

const scopeOptions = [
  { value: "all", label: "All fields" },
  { value: "name", label: "Customer name" },
  { value: "connection_id", label: "Customer ID" },
  { value: "phone", label: "Phone" },
  { value: "area", label: "Area" },
  { value: "billing_group", label: "Billing group" },
];

export function CustomerSearchBar({
  label,
  placeholder = "Search by name, ID, phone, area or billing group",
  autoFocus,
  onSelect,
  defaultScope = "all",
}: CustomerSearchBarProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(defaultScope);
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const minChars = 1;

  useEffect(() => {
    if (query.trim().length < minChars) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.get("/customers/search", {
          params: { q: query.trim(), scope, limit: 20 },
          signal: controller.signal,
        });
        const rows = response.data?.data ?? response.data ?? [];
        setResults(rows);
        setOpen(true);
        setHighlightIndex(rows.length ? 0 : -1);
      } catch (error) {
        if (!(error as any)?.name?.includes("Abort")) {
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, scope]);

  const selectCustomer = (customer: CustomerSearchResult) => {
    onSelect(customer);
    setQuery(customer.name || "");
    setOpen(false);
  };

  const visible = useMemo(() => open && (results.length > 0 || loading || query.trim().length >= minChars), [
    open,
    results,
    loading,
    query,
  ]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!visible || (!results.length && !loading)) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (results.length ? (prev + 1) % results.length : prev));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => (results.length ? (prev - 1 + results.length) % results.length : prev));
    }
    if (event.key === "Enter" && highlightIndex >= 0 && results[highlightIndex]) {
      event.preventDefault();
      selectCustomer(results[highlightIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-2">
          <Select value={scope} onValueChange={(value) => setScope(value)}>
            <SelectTrigger aria-label="Select search field">
              <SelectValue placeholder="Field" />
            </SelectTrigger>
            <SelectContent>
              {scopeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => results.length && setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="pl-10"
              autoFocus={autoFocus}
            />
            {query && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                  setHighlightIndex(-1);
                  inputRef.current?.focus();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {visible && (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-lg">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            )}

            {!loading && results.length === 0 && query.trim().length >= minChars && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found.</div>
            )}

            <div className="max-h-80 divide-y overflow-auto">
              {results.map((customer, index) => (
                <button
                  key={customer.id}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left transition hover:bg-muted",
                    highlightIndex === index ? "bg-muted" : ""
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCustomer(customer)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-tight">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {customer.connection_id ? `${customer.connection_id} · ` : ""}
                        {customer.phone || "No phone"}
                      </div>
                      {customer.address && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{customer.address}</div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap justify-end gap-1">
                        {(customer.area || customer.billing_group?.area) && (
                          <Badge variant="outline" className="text-[11px]">
                            {customer.area?.code ||
                              customer.billing_group?.area?.code ||
                              customer.area?.name ||
                              customer.billing_group?.area?.name}
                          </Badge>
                        )}
                        {customer.billing_group && (
                          <Badge variant="secondary" className="text-[11px]">
                            {customer.billing_group.name}
                          </Badge>
                        )}
                        {customer.status && (
                          <Badge
                            variant={customer.status === "active" ? "default" : "destructive"}
                            className="text-[11px]"
                          >
                            {customer.status}
                          </Badge>
                        )}
                      </div>
                      {typeof customer.current_balance === "number" && (
                        <div className="text-xs text-muted-foreground">
                          Balance: LKR {customer.current_balance.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
