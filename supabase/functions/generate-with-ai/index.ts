import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safely parse body
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt: string | undefined = body?.prompt;
    console.log('Received prompt:', prompt);

    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "prompt" é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Calling OpenAI API...');

    // Call OpenAI ChatGPT API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14', // Using the reliable GPT-4.1 model
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado que gera conteúdo de alta qualidade em português do Brasil. Responda sempre de forma clara, objetiva e útil. Para conteúdo técnico, inclua passos detalhados e exemplos práticos quando apropriado.'
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    let rawText = '';
    let json: any = null;
    
    try {
      rawText = await response.text();
      console.log('OpenAI raw response:', rawText);
      json = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return new Response(JSON.stringify({ error: 'Erro ao processar resposta da IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, json);
      const errorMessage = json?.error?.message || 'Erro ao chamar a API do ChatGPT';
      return new Response(JSON.stringify({ 
        error: errorMessage,
        status: response.status 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const generatedText = json?.choices?.[0]?.message?.content || '';
    console.log('Generated text:', generatedText);

    if (!generatedText) {
      return new Response(JSON.stringify({ error: 'Nenhum conteúdo foi gerado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      generatedText: generatedText.trim(),
      provider: 'openai-gpt-4.1'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-with-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Erro inesperado no Edge Function',
      details: error?.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
