import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Feed from '@/components/Feed';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Feed />;
};

export default Index;
