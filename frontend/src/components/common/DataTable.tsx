import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[] | undefined;
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  getRowId?: (row: T, index: number) => string | number;
  className?: string;
}

export function DataTable<T>({
  data = [],
  columns,
  isLoading,
  emptyState,
  getRowId,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {typeof column.header === "string" ? (
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {column.header}
                  </span>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <TableCell key={`${column.key}-${index}`} className={column.className}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-sm py-10">
                {emptyState || "No records found"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={String(getRowId?.(row, index) ?? index)}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
