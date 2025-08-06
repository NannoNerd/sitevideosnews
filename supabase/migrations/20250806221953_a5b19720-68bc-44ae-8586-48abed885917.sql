-- Insert sample categories
INSERT INTO public.categories (name, slug) VALUES 
('Engenharia', 'engenharia'),
('Crypto', 'crypto'),
('Música', 'musica'),
('Motivacional', 'motivacional')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample posts for different categories
INSERT INTO public.posts (title, slug, content, excerpt, category_id, author_id, published, published_at, views_count, likes_count, comments_count) VALUES 
('Inovações em Inteligência Artificial para Engenharia', 'inovacoes-ia-engenharia', 
 'A inteligência artificial está revolucionando o campo da engenharia de formas inimagináveis. Desde a otimização de processos até a criação de materiais mais resistentes, a IA está moldando o futuro da construção e design.

Principais aplicações:
- Análise preditiva de falhas estruturais
- Otimização de materiais através de machine learning
- Automatização de processos de design
- Simulações complexas em tempo real

Esta evolução promete tornar a engenharia mais eficiente, sustentável e inovadora.', 
 'A inteligência artificial está revolucionando o campo da engenharia de formas inimagináveis...', 
 (SELECT id FROM categories WHERE slug = 'engenharia' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now(), 156, 23, 8),

('Bitcoin: Análise do Mercado Atual e Perspectivas', 'bitcoin-analise-mercado-2024',
 'O mercado de criptomoedas continua em constante evolução. O Bitcoin, como a primeira e maior criptomoeda, mantém sua posição de destaque no cenário financeiro global.

Fatores que influenciam o preço:
- Adoção institucional crescente
- Regulamentações governamentais
- Mudanças na oferta e demanda
- Eventos macroeconômicos

Investidores devem sempre considerar os riscos e fazer suas próprias pesquisas antes de tomar decisões financeiras.',
 'O mercado de criptomoedas continua em constante evolução...',
 (SELECT id FROM categories WHERE slug = 'crypto' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '1 day', 289, 45, 12),

('A Evolução da Música Digital e Streaming', 'evolucao-musica-digital-streaming',
 'A indústria musical passou por transformações dramáticas nas últimas décadas. O streaming revolucionou como consumimos música e como artistas distribuem seu trabalho.

Impactos do streaming:
- Democratização da distribuição musical
- Mudanças nos padrões de consumo
- Novos modelos de monetização
- Descoberta de novos talentos

Plataformas como Spotify, Apple Music e YouTube Music mudaram para sempre o panorama musical.',
 'A indústria musical passou por transformações dramáticas...',
 (SELECT id FROM categories WHERE slug = 'musica' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '2 days', 178, 34, 6),

('5 Hábitos Que Transformarão Sua Produtividade', '5-habitos-produtividade',
 'A produtividade não é sobre trabalhar mais horas, mas sobre trabalhar de forma mais inteligente. Aqui estão cinco hábitos comprovados que podem transformar sua eficiência.

1. **Planejamento matinal**: Dedique 10 minutos toda manhã para organizar suas prioridades
2. **Técnica Pomodoro**: Trabalhe em blocos focados de 25 minutos
3. **Elimine distrações**: Identifique e remova fatores que quebram sua concentração
4. **Exercício regular**: Atividade física melhora o foco e energia mental
5. **Sono de qualidade**: 7-8 horas de sono são essenciais para performance cognitiva

Implemente um hábito por vez para mudanças duradouras.',
 'A produtividade não é sobre trabalhar mais horas...',
 (SELECT id FROM categories WHERE slug = 'motivacional' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '3 days', 412, 67, 15)

ON CONFLICT (slug) DO NOTHING;

-- Insert sample videos
INSERT INTO public.videos (title, slug, description, youtube_url, youtube_video_id, category_id, author_id, published, published_at, views_count, likes_count, comments_count, duration) VALUES 
('Como Construir uma Casa Sustentável', 'construir-casa-sustentavel',
 'Neste vídeo, exploramos técnicas avançadas de construção sustentável, desde a escolha de materiais até sistemas de energia renovável.',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 'dQw4w9WgXcQ',
 (SELECT id FROM categories WHERE slug = 'engenharia' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '4 hours', 234, 28, 5, '12:45'),

('Entendendo DeFi: O Futuro das Finanças', 'entendendo-defi-futuro-financas',
 'Uma explicação completa sobre finanças descentralizadas (DeFi) e como elas estão mudando o sistema financeiro tradicional.',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 'dQw4w9WgXcQ',
 (SELECT id FROM categories WHERE slug = 'crypto' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '1 day', 456, 89, 23, '18:30'),

('Produção Musical em Home Studio', 'producao-musical-home-studio',
 'Aprenda a montar seu próprio estúdio caseiro e produzir música de qualidade profissional com equipamentos acessíveis.',
 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
 'dQw4w9WgXcQ',
 (SELECT id FROM categories WHERE slug = 'musica' LIMIT 1),
 (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1),
 true, now() - interval '2 days', 189, 42, 8, '15:20')

ON CONFLICT (slug) DO NOTHING;