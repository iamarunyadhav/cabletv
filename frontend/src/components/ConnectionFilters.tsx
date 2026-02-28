import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface ConnectionFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  areaId?: string;
  status?: string;
  packageId?: string;
  dueThreshold?: number;
}

export const ConnectionFilters = ({ onFilterChange }: ConnectionFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({});

  const { data: areas = [] } = useQuery({
    queryKey: ["areas-filter"],
    queryFn: async () => {
      const response = await apiClient.get("/areas");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["packages-filter"],
    queryFn: async () => {
      const response = await apiClient.get("/packages", { params: { active: true } });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const handleFilterUpdate = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Area</Label>
            <Select 
              value={filters.areaId || ""} 
              onValueChange={(value) => handleFilterUpdate("areaId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Areas" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map((area) => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select 
              value={filters.status || ""} 
              onValueChange={(value) => handleFilterUpdate("status", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="disconnect">Disconnected</SelectItem>
                <SelectItem value="postpone">Postponed</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Package</Label>
            <Select 
              value={filters.packageId || ""} 
              onValueChange={(value) => handleFilterUpdate("packageId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Packages" />
              </SelectTrigger>
              <SelectContent>
                {packages?.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Min Due Balance</Label>
            <Input
              type="number"
              step="100"
              placeholder="e.g., 1000"
              value={filters.dueThreshold || ""}
              onChange={(e) => handleFilterUpdate("dueThreshold", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
