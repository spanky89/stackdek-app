import { useEffect, useState } from "react";
import { supabase } from "./api/supabaseClient";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import LandingPage from "./pages/Landing";
import HomePage from "./pages/Home";
import JobStackPage from "./pages/JobStack";
import ClientProfilePage from "./pages/ClientProfile";
import ClientListPage from "./pages/ClientList";
import ClientDetailPage from "./pages/ClientDetail";
import JobListPage from "./pages/JobList";
import JobDetailPage from "./pages/JobDetail";
import QuoteListPage from "./pages/QuoteList";
import QuoteDetailPage from "./pages/QuoteDetail";
import InvoiceListPage from "./pages/InvoiceList";
import CreateInvoicePage from "./pages/CreateInvoice";
import ClientEditPage from "./pages/ClientEditPage";
import JobEditPage from "./pages/JobEditPage";
import QuoteEditPage from "./pages/QuoteEditPage";
import SettingsPage from "./pages/Settings";

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

/** Login page (email/password) */
function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        return;
      }
      nav("/home", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <img src="/logo-symbol.png" alt="StackDek" className="h-8 w-auto" />
          <h1 className="text-2xl font-bold">StackDek</h1>
        </div>
        <p className="text-sm text-neutral-600 mb-6">Sign in to your account</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button
            className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm text-neutral-600 mt-4">
          Don't have an account?{" "}
          <button onClick={() => nav("/")} className="text-blue-600 hover:underline font-medium">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

/** Route guard */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { loading, session } = useSupabaseSession();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Checking session…</p>
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
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
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobListPage />
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
          path="/quotes"
          element={
            <ProtectedRoute>
              <QuoteListPage />
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
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoiceListPage />
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
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
