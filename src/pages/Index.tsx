import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Feed from '@/components/Feed';

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = searchParams.get('category');
  
  useEffect(() => {
    // Se não tem categoria, redirecionar para engenharia por padrão
    if (!category) {
      navigate('/?category=engenharia', { replace: true });
    }
  }, [category, navigate]);
  
  return <Feed />;
};

export default Index;
