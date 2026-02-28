import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { EditBillingGroupDialog } from "@/components/EditBillingGroupDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

const BillingGroups = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    billing_start_day: 1,
    billing_end_day: 10,
    grace_days: 5,
    friendly_reminder_days: 2,
    disconnect_notice_days: 7,
    maximum_debit_balance: 5000,
    description: "",
    area_id: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: groups, isLoading } = useQuery({
    queryKey: ["billing-groups"],
    queryFn: async () => {
      const response = await apiClient.get("/billing-groups");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const totalGroups = groups?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalGroups / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [totalGroups]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleGroups = groups?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalGroups === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalGroups, startIndex + visibleGroups.length);

  const { data: areas } = useQuery({
    queryKey: ["areas", "options"],
    queryFn: async () => {
      const response = await apiClient.get("/areas");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post("/billing-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-groups"] });
      toast.success("Billing group created successfully!");
      setOpen(false);
      setFormData({
        name: "",
        billing_start_day: 1,
        billing_end_day: 10,
        grace_days: 5,
        friendly_reminder_days: 2,
        disconnect_notice_days: 7,
        maximum_debit_balance: 5000,
        description: "",
        area_id: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/billing-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-groups"] });
      toast.success("Billing group deleted successfully!");
      setDeleteGroupId(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
      setDeleteGroupId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.area_id) {
      toast.error("Please select an area for this billing group.");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing Groups</h2>
          <p className="text-muted-foreground mt-2">Manage billing cycles and schedules</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Billing Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Group A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Area *</Label>
                <Select value={formData.area_id} onValueChange={(value) => setFormData({ ...formData, area_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Start Day *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billing_start_day}
                    onChange={(e) => setFormData({ ...formData, billing_start_day: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Day *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billing_end_day}
                    onChange={(e) => setFormData({ ...formData, billing_end_day: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grace Days *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.grace_days}
                    onChange={(e) => setFormData({ ...formData, grace_days: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Friendly Reminder (days) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.friendly_reminder_days}
                    onChange={(e) => setFormData({ ...formData, friendly_reminder_days: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disconnect Notice (days) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.disconnect_notice_days}
                    onChange={(e) => setFormData({ ...formData, disconnect_notice_days: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Debit Balance (LKR) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maximum_debit_balance}
                    onChange={(e) => setFormData({ ...formData, maximum_debit_balance: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>All Billing Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Billing Schedule</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      Day {group.billing_start_day} to {group.billing_end_day}
                    </TableCell>
                    <TableCell>{group.grace_days} days</TableCell>
                    <TableCell>{group.customer_count || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {group.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditGroupId(group.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteGroupId(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {totalGroups === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No billing groups found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalGroups > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalGroups} billing groups
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditBillingGroupDialog
        groupId={editGroupId}
        open={!!editGroupId}
        onOpenChange={(open) => !open && setEditGroupId(null)}
      />

      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => !open && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Billing Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this billing group? This action cannot be undone.
              Groups with existing customers cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupId && deleteMutation.mutate(deleteGroupId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingGroups;
