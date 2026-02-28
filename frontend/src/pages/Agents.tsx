import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, UserPlus, Pencil, Trash2 } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

const typeOptions = [
  { label: "Agent", value: "agent" },
  { label: "Employee", value: "employee" },
  { label: "Customer", value: "customer" },
  { label: "Other", value: "other" },
];

const Agents = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [deleteAgent, setDeleteAgent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    agent_type: "agent",
    phone: "",
    email: "",
  });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: agents, isLoading } = useQuery({
    queryKey: ["payment-agents"],
    queryFn: async () => {
      const response = await apiClient.get("/payment-agents");
      return response.data?.data ?? response.data ?? [];
    },
  });
  const totalAgents = agents?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalAgents / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [totalAgents]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleAgents = agents?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalAgents === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalAgents, startIndex + visibleAgents.length);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingAgent) {
        await apiClient.put(`/payment-agents/${editingAgent.id}`, {
          name: payload.name,
          code: payload.code.toUpperCase(),
          agent_type: payload.agent_type,
          phone: payload.phone,
          email: payload.email,
        });
      } else {
        await apiClient.post("/payment-agents", {
          name: payload.name,
          code: payload.code.toUpperCase(),
          agent_type: payload.agent_type,
          phone: payload.phone,
          email: payload.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-agents"] });
      toast.success(`Agent ${editingAgent ? "updated" : "created"} successfully`);
      setDialogOpen(false);
      setEditingAgent(null);
      setFormData({ name: "", code: "", agent_type: "agent", phone: "", email: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to save agent");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/payment-agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-agents"] });
      toast.success("Agent deleted successfully");
      setDeleteAgent(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Unable to delete agent");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Agent code is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const openCreateDialog = () => {
    setEditingAgent(null);
    setFormData({ name: "", code: "", agent_type: "agent", phone: "", email: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (agent: any) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name || "",
      code: agent.code || "",
      agent_type: agent.agent_type || "agent",
      phone: agent.phone || "",
      email: agent.email || "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collectors / Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage users who collect payments on behalf of the business.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Payment Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAgents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="font-mono text-sm">{agent.code}</TableCell>
                    <TableCell>{agent.agent_type}</TableCell>
                    <TableCell>{agent.phone || "�"}</TableCell>
                    <TableCell>{agent.email || "�"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(agent)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteAgent(agent)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!totalAgents && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No agents found. Add your first collector.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {!isLoading && totalAgents > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${showingFrom} - ${showingTo}`} of {totalAgents} agents
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit Agent" : "Add Agent"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Collector name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })
                  }
                  placeholder="e.g., AGT-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.agent_type} onValueChange={(value) => setFormData({ ...formData, agent_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact number"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Optional email"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAgent} onOpenChange={(open) => !open && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteAgent?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAgent && deleteMutation.mutate(deleteAgent.id)} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Agents;
