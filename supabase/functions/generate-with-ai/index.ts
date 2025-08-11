import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

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
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt: string | undefined = body?.prompt;

    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "prompt" é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openRouterApiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper to call DeepSeek with a model
    const callDeepSeek = async (model: string) => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': req.headers.get('origin') || 'https://opbtbgtzinpysokwfaqn.supabase.co',
          'X-Title': 'Ivo Fernandes News - AI Generator',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente técnico que gera comandos e scripts para ferramentas de engenharia (AutoCAD, Revit, SAP2000, MATLAB, Python para engenharia, etc.). Responda SEMPRE em português do Brasil, com passos claros, listas numeradas e trechos de código/comandos em blocos markdown. Inclua observações de segurança quando aplicável.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });

      let rawText = '';
      let json: any = null;
      try {
        rawText = await res.text();
        json = rawText ? JSON.parse(rawText) : null;
      } catch { /* keep rawText */ }

      if (!res.ok) {
        const message = json?.error?.message || json?.message || rawText || 'Erro ao chamar o provedor de IA';
        return {
          ok: false as const,
          status: res.status,
          error: {
            provider: 'openrouter',
            status: res.status,
            message,
            raw: json ?? rawText
          }
        };
      }

      const data = json;
      const messageObj = data?.choices?.[0]?.message ?? {};

      // OpenRouter pode retornar o conteúdo como string OU como array de segmentos
      // (ex.: DeepSeek R1: [{ type: 'reasoning', text: '...' }, { type: 'output_text', text: '...' }])
      let reasoning = '';
      let contentText = '';
      const msgContent: any = messageObj?.content;

      if (Array.isArray(msgContent)) {
        const toLower = (v: any) => (typeof v === 'string' ? v.toLowerCase() : v);
        const reasoningParts = msgContent
          .filter((p: any) => toLower(p?.type) === 'reasoning' || toLower(p?.type) === 'thinking')
          .map((p: any) => p?.text)
          .filter(Boolean);
        const outputParts = msgContent
          .filter((p: any) => toLower(p?.type) === 'output_text' || toLower(p?.type) === 'text')
          .map((p: any) => p?.text)
          .filter(Boolean);
        reasoning = reasoningParts.join('\n');
        contentText = outputParts.join('\n');
      } else if (typeof msgContent === 'string') {
        contentText = msgContent;
      }

      // Alguns provedores retornam reasoning_content como string separada
      if (!reasoning && typeof (messageObj as any)?.reasoning_content === 'string') {
        reasoning = (messageObj as any).reasoning_content;
      }

      const finalText = [reasoning, contentText]
        .filter((s) => s && String(s).trim().length > 0)
        .join('\n\n');

      return { ok: true as const, data, generatedText: finalText };
    };

    // Try Reasoner first, then fallback to chat model if permission/model error
    const primary = await callDeepSeek('deepseek/deepseek-r1-0528:free');

    if (!primary.ok && [400, 401, 403, 404].includes(primary.status)) {
      console.error('[OpenRouter primary error]', primary.error);
      const fallback = await callDeepSeek('deepseek/deepseek-chat:free');
      if (!fallback.ok) {
        console.error('[OpenRouter fallback error]', fallback.error);
        return new Response(JSON.stringify({ error: fallback.error }), {
          status: fallback.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ generatedText: fallback.generatedText, provider: 'deepseek/deepseek-chat:free' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!primary.ok) {
      console.error('[DeepSeek error]', primary.error);
      return new Response(JSON.stringify({ error: primary.error }), {
        status: primary.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ generatedText: primary.generatedText, provider: 'deepseek/deepseek-r1-0528:free' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in generate-with-ai function:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro inesperado no Edge Function' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
