import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface EditAreaDialogProps {
  areaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditAreaDialog = ({ areaId, open, onOpenChange }: EditAreaDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  useEffect(() => {
    if (areaId && open) {
      const fetchArea = async () => {
        try {
          const response = await apiClient.get(`/areas/${areaId}`);
          const data = response.data?.data ?? response.data;
          if (data) {
            setFormData({
              name: data.name || "",
              code: data.code || "",
              description: data.description || "",
            });
          }
        } catch (error: any) {
          toast.error(error.message || "Unable to load area");
        }
      };
      fetchArea();
    }
  }, [areaId, open]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiClient.put(`/areas/${areaId}`, {
        name: data.name,
        description: data.description,
        code: data.code.toUpperCase(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
      toast.success("Area updated successfully!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Area name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Area code is required");
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Area</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Area Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Hatton, Dickoya"
            />
          </div>
          <div className="space-y-2">
            <Label>Area Code *</Label>
            <Input
              value={formData.code}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
                })
              }
              placeholder="e.g., HT"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Area"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
