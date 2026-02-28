import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCustomerActivity } from "@/hooks/queries/customer";
import { ListFilters } from "@/types/customer";
import { StatusBadge } from "@/components/common/StatusBadge";

interface CustomerActivityTabProps {
  customerId: string;
}

const smsTypes = [
  "friendly",
  "disconnect",
  "invoice",
  "payment",
  "custom",
  "suspend",
  "resume",
];

export function CustomerActivityTab({ customerId }: CustomerActivityTabProps) {
  const [filters, setFilters] = useState<ListFilters>({});
  const { data, isLoading } = useCustomerActivity(customerId, filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          type="date"
          value={filters.from || ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value || undefined }))}
        />
        <Input
          type="date"
          value={filters.to || ""}
          onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value || undefined }))}
        />
        <Select
          value={filters.type || "all"}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, type: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="SMS Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {smsTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">SMS Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && data?.smsLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No SMS logs found.
                    </TableCell>
                  </TableRow>
                )}
                {data?.smsLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.sentAt).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{log.type}</TableCell>
                    <TableCell>{log.phone}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} className="text-xs" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">System Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Connection</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Loading events...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && data?.events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No events recorded.
                    </TableCell>
                  </TableRow>
                )}
                {data?.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{new Date(event.occurredAt).toLocaleString()}</TableCell>
                    <TableCell>{event.description}</TableCell>
                    <TableCell>{event.user || "System"}</TableCell>
                    <TableCell>{event.connectionBoxNumber || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
