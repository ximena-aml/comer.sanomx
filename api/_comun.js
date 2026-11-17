// Piezas compartidas por las funciones de IA (los archivos con "_" no se publican como función)
import Anthropic from '@anthropic-ai/sdk';

// Mismos datos públicos que usa index.html (la clave anon es pública por diseño)
const SUPABASE_URL = 'https://ggnurbdefdkbtvxhfkxf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbnVyYmRlZmRrYnR2eGhma3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MDM3MjYsImV4cCI6MjEwNTI3OTcyNn0.c2ZmBl8a-e1vECmkLZz6jVbgM4mYXDnM2ELXJyhXg3I';

const client = new Anthropic();

// Solo la cuenta de Ximena puede usar estas funciones (evita que extraños gasten su crédito)
export async function sesionValida(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return false;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, Authorization: auth } });
  return r.ok;
}

// Pide a Claude; con esquema devuelve el objeto ya leído, sin esquema devuelve texto.
// Con buscar=true puede consultar internet (guías vigentes) y entonces el JSON viene dentro del texto.
export async function pedir(system, texto, esquema, buscar) {
  const output_config = { effort: 'medium' };
  if (esquema && !buscar) output_config.format = { type: 'json_schema', schema: esquema };
  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: texto }]
  };
  if (buscar) params.tools = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 6 }];
  let msg;
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    msg = await client.beta.messages.stream(params).finalMessage();
    if (msg.stop_reason !== 'pause_turn') break;
    params.messages = [params.messages[0], { role: 'assistant', content: msg.content }];
  }
  if (msg.stop_reason === 'refusal') throw new Error('La IA no pudo generar esta parte. Inténtalo de nuevo o escríbela a mano.');
  if (msg.stop_reason === 'max_tokens') throw new Error('La respuesta salió demasiado larga. Inténtalo de nuevo.');
  const txt = msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!esquema) return txt;
  if (!buscar) return JSON.parse(txt);
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('La IA no devolvió el formato esperado. Inténtalo de nuevo.');
  return JSON.parse(txt.slice(a, b + 1));
}

export function datos(nombre, obj) {
  return nombre + ':\n' + JSON.stringify(obj || {}, null, 1);
}

export const CITAR_GUIAS = 'Si en los datos viene "requerimientos_guias" (revisión de guías de práctica clínica que la nutrióloga ya validó), úsala para energía y macronutrientes y cita entre paréntesis la guía y el año que respaldan cada cifra, ej. (ADA Standards of Care 2026).';
