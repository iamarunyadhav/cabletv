import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserCog } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEFAULT_PAGE_SIZE } from "@/constants/pagination";

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
  roles?: Array<{ role: string }>;
}

const Users = () => {
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;

  // Fetch all users with their profiles and roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get("/users");
      return response.data.users as UserProfile[];
    },
  });
  const totalUsers = users?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE) || 1);

  useEffect(() => {
    setPage(1);
  }, [totalUsers]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleUsers = users?.slice(startIndex, startIndex + PAGE_SIZE) ?? [];
  const showingFrom = totalUsers === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(totalUsers, startIndex + visibleUsers.length);

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiClient.post(`/users/${userId}/roles`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role assigned successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign role");
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiClient.delete(`/users/${userId}/roles/${role}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role removed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove role");
    },
  });

  const handleAddRole = (userId: string) => {
    const role = selectedRoles[userId];
    if (!role) {
      toast.error("Please select a role");
      return;
    }
    addRoleMutation.mutate({ userId, role });
    setSelectedRoles({ ...selectedRoles, [userId]: "" });
  };

  const handleRemoveRole = (userId: string, role: string) => {
    removeRoleMutation.mutate({ userId, role });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "cashier":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <UserCog className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Current Roles</TableHead>
              <TableHead>Assign Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((roleObj: any) => (
                        <Badge
                          key={roleObj.role}
                          variant={getRoleBadgeVariant(roleObj.role)}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => handleRemoveRole(user.id, roleObj.role)}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          {roleObj.role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No roles</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Select
                      value={selectedRoles[user.id] || ""}
                      onValueChange={(value) =>
                        setSelectedRoles({ ...selectedRoles, [user.id]: value })
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAddRole(user.id)}
                      disabled={addRoleMutation.isPending}
                    >
                      {addRoleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalUsers === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        )}
        {totalUsers > 0 && (
          <div className="flex flex-col gap-4 border-t pt-4 mt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {`${showingFrom} - ${showingTo}`} of {totalUsers} users
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
      </Card>
    </div>
  );
};

export default Users;
