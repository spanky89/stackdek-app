import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../api/supabaseClient';
import { useCompany } from '../context/CompanyContext';

interface AdminGuardProps {
  children: JSX.Element;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { companyId, loading: companyLoading } = useCompany();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      if (!companyId) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('is_admin')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        if (mounted) {
          setIsAdmin(data?.is_admin ?? false);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    };

    if (!companyLoading) {
      checkAdminStatus();
    }

    return () => {
      mounted = false;
    };
  }, [companyId, companyLoading]);

  if (companyLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
