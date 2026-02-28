import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Accounts from "./pages/Accounts";
import CustomerDetail from "./pages/CustomerDetail";
import BillingGroups from "./pages/BillingGroups";
import Packages from "./pages/Packages";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Areas from "./pages/Areas";
import Connections from "./pages/Connections";
import Suspensions from "./pages/Suspensions";
import Reports from "./pages/Reports";
import QuickPOS from "./pages/QuickPOS";
import Suppliers from "./pages/Suppliers";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import JobLogs from "./pages/JobLogs";
import SetupItems from "./pages/SetupItems";
import Agents from "./pages/Agents";
import SMSAnalytics from "./pages/SMSAnalytics";
import SMSManagement from "./pages/SMSManagement";
import Receipt from "./pages/Receipt";
import ImportLegacyData from "./pages/ImportLegacyData";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/receipt/:receiptNumber" element={<Receipt />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="quick-pos" element={<QuickPOS />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="connections" element={<Connections />} />
              <Route path="suspensions" element={<Suspensions />} />
              <Route path="agents" element={<Agents />} />
              <Route path="areas" element={<Areas />} />
              <Route path="billing-groups" element={<BillingGroups />} />
              <Route path="packages" element={<Packages />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="users" element={<Users />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="job-logs" element={<JobLogs />} />
              <Route path="reports" element={<Reports />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="setup-items" element={<SetupItems />} />
              <Route path="sms-analytics" element={<SMSAnalytics />} />
              <Route path="sms-management" element={<SMSManagement />} />
              <Route path="import-legacy" element={<ImportLegacyData />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
