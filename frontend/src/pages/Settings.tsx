import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import SMSConfigForm from "@/components/SMSConfigForm";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";
import { AutomationLogCard } from "@/components/dashboard/AutomationLogCard";

const Settings = () => {
  const queryClient = useQueryClient();
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [channelFormData, setChannelFormData] = useState({
    id: "",
    name: "",
    description: "",
    monthly_amount: "",
  });
  const [setupFormData, setSetupFormData] = useState({
    id: "",
    name: "",
    price: "",
  });
  const [formData, setFormData] = useState({
    company_name: "",
    company_address: "",
    company_phone: "",
    invoice_prefix: "",
    receipt_prefix: "",
    connection_prefix: "",
  });
  const [channelPage, setChannelPage] = useState(1);
  const [setupPage, setSetupPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings", {
        params: { keys: Object.keys(formData).join(",") },
      });
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: additionalChannels } = useQuery({
    queryKey: ["additional-channels"],
    queryFn: async () => {
      const response = await apiClient.get("/additional-channels");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const { data: setupItems } = useQuery({
    queryKey: ["setup-items"],
    queryFn: async () => {
      const response = await apiClient.get("/setup-items");
      return response.data?.data ?? response.data ?? [];
    },
  });

  const channelCount = additionalChannels?.length ?? 0;
  const setupCount = setupItems?.length ?? 0;

  useEffect(() => {
    setChannelPage(1);
  }, [channelCount]);

  useEffect(() => {
    setSetupPage(1);
  }, [setupCount]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(channelCount / PAGE_SIZE) || 1);
    if (channelPage > maxPage) {
      setChannelPage(maxPage);
    }
  }, [channelPage, channelCount, PAGE_SIZE]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(setupCount / PAGE_SIZE) || 1);
    if (setupPage > maxPage) {
      setSetupPage(maxPage);
    }
  }, [setupPage, setupCount, PAGE_SIZE]);

  const channelTotalPages = Math.max(1, Math.ceil(channelCount / PAGE_SIZE) || 1);
  const channelStartIndex = (channelPage - 1) * PAGE_SIZE;
  const visibleChannels = additionalChannels?.slice(channelStartIndex, channelStartIndex + PAGE_SIZE) ?? [];
  const channelShowingFrom = channelCount === 0 ? 0 : channelStartIndex + 1;
  const channelShowingTo = Math.min(channelCount, channelStartIndex + visibleChannels.length);

  const setupTotalPages = Math.max(1, Math.ceil(setupCount / PAGE_SIZE) || 1);
  const setupStartIndex = (setupPage - 1) * PAGE_SIZE;
  const visibleSetupItems = setupItems?.slice(setupStartIndex, setupStartIndex + PAGE_SIZE) ?? [];
  const setupShowingFrom = setupCount === 0 ? 0 : setupStartIndex + 1;
  const setupShowingTo = Math.min(setupCount, setupStartIndex + visibleSetupItems.length);

  useEffect(() => {
    if (settings) {
      const settingsMap: any = {};
      settings.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });
      setFormData({ ...formData, ...settingsMap });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.put("/settings", { settings: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const channelMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        await apiClient.put(`/additional-channels/${data.id}`, {
          name: data.name,
          description: data.description,
          monthly_amount: parseFloat(data.monthly_amount),
        });
      } else {
        await apiClient.post("/additional-channels", {
          name: data.name,
          description: data.description,
          monthly_amount: parseFloat(data.monthly_amount),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additional-channels"] });
      toast.success("Channel saved successfully!");
      setChannelDialogOpen(false);
      setChannelFormData({ id: "", name: "", description: "", monthly_amount: "" });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        await apiClient.put(`/setup-items/${data.id}`, {
          name: data.name,
          price: parseFloat(data.price),
        });
      } else {
        await apiClient.post("/setup-items", {
          name: data.name,
          price: parseFloat(data.price),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setup-items"] });
      toast.success("Setup item saved successfully!");
      setSetupDialogOpen(false);
      setSetupFormData({ id: "", name: "", price: "" });
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/additional-channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["additional-channels"] });
      toast.success("Channel deleted successfully!");
    },
  });

  const deleteSetupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/setup-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setup-items"] });
      toast.success("Setup item deleted successfully!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    channelMutation.mutate(channelFormData);
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setupMutation.mutate(setupFormData);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">Configure your system preferences</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels & Setup</TabsTrigger>
          <TabsTrigger value="sms">SMS Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information will appear on invoices and receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Address</Label>
              <Input
                value={formData.company_address}
                onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                placeholder="Company Address"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Phone</Label>
              <Input
                value={formData.company_phone}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                placeholder="Contact Number"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Document Prefixes</CardTitle>
            <CardDescription>
              Configure prefixes for document numbering
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Prefix</Label>
              <Input
                value={formData.receipt_prefix}
                onChange={(e) => setFormData({ ...formData, receipt_prefix: e.target.value })}
                placeholder="RCPT"
              />
            </div>
            <div className="space-y-2">
              <Label>Connection Prefix</Label>
              <Input
                value={formData.connection_prefix}
                onChange={(e) => setFormData({ ...formData, connection_prefix: e.target.value })}
                placeholder="CBL"
              />
            </div>
          </CardContent>
        </Card>

        <AutomationLogCard />

        <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Additional Channels</CardTitle>
              <CardDescription>Manage add-on channels for customers</CardDescription>
            </div>
            <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{channelFormData.id ? "Edit" : "Add"} Channel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleChannelSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={channelFormData.name}
                      onChange={(e) => setChannelFormData({ ...channelFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={channelFormData.description}
                      onChange={(e) => setChannelFormData({ ...channelFormData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={channelFormData.monthly_amount}
                      onChange={(e) => setChannelFormData({ ...channelFormData, monthly_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setChannelDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{channelFormData.id ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelCount === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No additional channels configured.
                  </TableCell>
                </TableRow>
              )}
              {visibleChannels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{channel.description}</TableCell>
                  <TableCell>LKR{Number(channel.monthly_amount).toFixed(2)}/mo</TableCell>
                  <TableCell>
                    <span className={channel.is_active ? "text-accent" : "text-muted-foreground"}>
                      {channel.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChannelFormData({
                            id: channel.id,
                            name: channel.name,
                            description: channel.description || "",
                            monthly_amount: channel.monthly_amount.toString(),
                          });
                          setChannelDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChannelMutation.mutate(channel.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {channelCount > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${channelShowingFrom} - ${channelShowingTo}`} of {channelCount} channels
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={channelPage <= 1}
                  onClick={() => setChannelPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={channelPage >= channelTotalPages}
                  onClick={() => setChannelPage((prev) => Math.min(channelTotalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Setup Items</CardTitle>
              <CardDescription>One-time charges for new connections</CardDescription>
            </div>
            <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{setupFormData.id ? "Edit" : "Add"} Setup Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSetupSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={setupFormData.name}
                      onChange={(e) => setSetupFormData({ ...setupFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={setupFormData.price}
                      onChange={(e) => setSetupFormData({ ...setupFormData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setSetupDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{setupFormData.id ? "Update" : "Create"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setupCount === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No setup items configured.
                  </TableCell>
                </TableRow>
              )}
              {visibleSetupItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>LKR{Number(item.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={item.is_active ? "text-accent" : "text-muted-foreground"}>
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSetupFormData({
                            id: item.id,
                            name: item.name,
                            price: item.price.toString(),
                          });
                          setSetupDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSetupMutation.mutate(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {setupCount > 0 && (
            <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {`${setupShowingFrom} - ${setupShowingTo}`} of {setupCount} setup items
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  disabled={setupPage <= 1}
                  onClick={() => setSetupPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={setupPage >= setupTotalPages}
                  onClick={() => setSetupPage((prev) => Math.min(setupTotalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="sms">
        <SMSConfigForm />
      </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
