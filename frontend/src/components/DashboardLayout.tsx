import { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, Cable, LayoutDashboard, Users, Calendar, Package, Settings, LogOut, Receipt, CreditCard, MapPin, BarChart3, Radio, UserCog, AlertTriangle, Shield, Wrench, UserPlus2, Wallet, MessageSquare, Database, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);

  const handleLogout = async () => {
    try {
      setIsProcessingLogout(true);
      await logout();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to log out");
    } finally {
      setIsProcessingLogout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: ShoppingBag, label: "Quick POS", path: "/dashboard/quick-pos" },
    { icon: BarChart3, label: "Accounts", path: "/dashboard/accounts" },
    { icon: Users, label: "Customers", path: "/dashboard/customers" },
    { icon: Radio, label: "Connections", path: "/dashboard/connections" },
    { icon: AlertTriangle, label: "Suspensions", path: "/dashboard/suspensions" },
    { icon: MapPin, label: "Areas", path: "/dashboard/areas" },
    { icon: Receipt, label: "Invoices", path: "/dashboard/invoices" },
    { icon: CreditCard, label: "Payments", path: "/dashboard/payments" },
    { icon: Wallet, label: "Suppliers", path: "/dashboard/suppliers" },
    { icon: UserPlus2, label: "Agents", path: "/dashboard/agents" },
    { icon: Calendar, label: "Billing Groups", path: "/dashboard/billing-groups" },
    { icon: Package, label: "Packages", path: "/dashboard/packages" },
    { icon: Wrench, label: "Setup Items", path: "/dashboard/setup-items" },
    { icon: UserCog, label: "Users", path: "/dashboard/users" },
    { icon: Shield, label: "Audit Logs", path: "/dashboard/audit-logs" },
    { icon: Activity, label: "Job Logs", path: "/dashboard/job-logs" },
    { icon: BarChart3, label: "Reports", path: "/dashboard/reports" },
    { icon: MessageSquare, label: "SMS Management", path: "/dashboard/sms-management" },
    { icon: BarChart3, label: "SMS Analytics", path: "/dashboard/sms-analytics" },
    { icon: Database, label: "Data Import/Export", path: "/dashboard/import-legacy" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card shadow-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Cable className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">CableTV Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )}
                onClick={() => navigate(item.path)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-card shadow-sm">
          <div className="h-full px-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Cable TV Management Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {user?.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2" disabled={isProcessingLogout}>
                <LogOut className="w-4 h-4" />
                {isProcessingLogout ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
