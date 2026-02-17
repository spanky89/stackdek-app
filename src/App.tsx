import { useEffect, useState } from "react";
import { supabase } from "./api/supabaseClient";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { CompanyProvider } from "./context/CompanyContext";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import JobStackPage from "./pages/JobStack";
import RequestListPage from "./pages/RequestList";
import ClientProfilePage from "./pages/ClientProfile";
import ClientListPage from "./pages/ClientList";
import ClientDetailPage from "./pages/ClientDetail";
import CreateClientPage from "./pages/CreateClient";
import JobListPage from "./pages/JobList";
import JobDetailPage from "./pages/JobDetail";
import QuoteListPage from "./pages/QuoteList";
import QuoteDetailPage from "./pages/QuoteDetail";
import CreateQuotePage from "./pages/CreateQuote";
import CreateJobPage from "./pages/CreateJob";
import CreateRequestPage from "./pages/CreateRequest";
import InvoiceListPage from "./pages/InvoiceList";
import InvoiceDetailPage from "./pages/InvoiceDetail";
import CreateInvoicePage from "./pages/CreateInvoice";
import ClientEditPage from "./pages/ClientEditPage";
import JobEditPage from "./pages/JobEditPage";
import QuoteEditPage from "./pages/QuoteEditPage";
import QuotePublicViewPage from "./pages/QuotePublicView";
import AccountPage from "./pages/Account";
import SettingsPage from "./pages/Settings";
import BillingSettingsPage from "./pages/BillingSettings";
import RequestDetailPage from "./pages/RequestDetail";
import TaskListPage from "./pages/TaskList";
import CreateTaskPage from "./pages/CreateTask";
import TaskDetailPage from "./pages/TaskDetail";
import TaskEditPage from "./pages/TaskEdit";
import AdminPage from "./pages/Admin";
import AdminUserDetailPage from "./pages/AdminUserDetail";
import AdminGuard from "./components/AdminGuard";

/** Minimal session hook (no external libs) */
function useSupabaseSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Awaited<
    ReturnType<typeof supabase.auth.getSession>
  >["data"]["session"]>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session };
}

/** Auth callback handler for OAuth redirects */
function AuthCallbackPage() {
  const nav = useNavigate();

  useEffect(() => {
    // Supabase automatically parses the callback URL
    // Redirect to home after OAuth login
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        nav("/home", { replace: true });
      } else {
        nav("/login", { replace: true });
      }
    };

    // Give Supabase a moment to process the callback
    setTimeout(checkSession, 1000);
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-neutral-600">Processing authentication…</p>
    </div>
  );
}

/** Route guard with CompanyProvider */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { loading, session } = useSupabaseSession();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Checking session…</p>
      </div>
    );
  }
  return session ? <CompanyProvider>{children}</CompanyProvider> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/:id"
          element={
            <ProtectedRoute>
              <ClientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/:id/profile"
          element={
            <ProtectedRoute>
              <ClientProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/:id/edit"
          element={
            <ProtectedRoute>
              <ClientEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/create"
          element={
            <ProtectedRoute>
              <CreateClientPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobStackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request/create"
          element={
            <ProtectedRoute>
              <CreateRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/request/:id"
          element={
            <ProtectedRoute>
              <RequestDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/create"
          element={
            <ProtectedRoute>
              <CreateTaskPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:id"
          element={
            <ProtectedRoute>
              <TaskDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:id/edit"
          element={
            <ProtectedRoute>
              <TaskEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job/:id"
          element={
            <ProtectedRoute>
              <JobDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job/:id/edit"
          element={
            <ProtectedRoute>
              <JobEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/job/create"
          element={
            <ProtectedRoute>
              <CreateJobPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes"
          element={
            <ProtectedRoute>
              <QuoteListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes/create"
          element={
            <ProtectedRoute>
              <CreateQuotePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quote/:id"
          element={
            <ProtectedRoute>
              <QuoteDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quote/:id/edit"
          element={
            <ProtectedRoute>
              <QuoteEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotes/view/:id"
          element={<QuotePublicViewPage />}
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice/:id"
          element={
            <ProtectedRoute>
              <InvoiceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/create"
          element={
            <ProtectedRoute>
              <CreateInvoicePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/billing"
          element={
            <ProtectedRoute>
              <BillingSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminGuard>
                <AdminPage />
              </AdminGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/user/:id"
          element={
            <ProtectedRoute>
              <AdminGuard>
                <AdminUserDetailPage />
              </AdminGuard>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
