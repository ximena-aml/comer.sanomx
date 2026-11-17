import { sesionValida, pedir, CITAR_GUIAS } from './_comun.js';

const SISTEMA = `Eres el apoyo clínico de una nutrióloga clínica mexicana (MNC) que trabaja con el Proceso de Atención Nutricia (NCPT). Recibes datos de un paciente en JSON: historia clínica, mediciones InBody, laboratorios y plan SMAE. Ella revisa y corrige todo antes de guardarlo.

Reglas:
- Español de México, terminología clínica.
- Diagnósticos PES: hasta 3, del más prioritario al menos prioritario. Usa el código NCPT y el término en español (dominios NI ingesta, NC clínico, NB conductual-ambiental; NO otro). Ejemplo: "NI-1.3 Ingesta energética excesiva".
- La etiología es la causa raíz que la intervención nutricia puede modificar.
- Los signos y síntomas son datos medibles u observados del expediente, con su valor cuando exista. Nunca repitas el problema en los signos/síntomas.
- Usa solo los datos recibidos. No inventes valores. Si falta un dato importante para sostener un diagnóstico, anótalo en "faltantes".
- Las etiquetas de "normal" del InBody no son verdad clínica. El GET viene calculado con Mifflin-St Jeor por factor de actividad y de estrés.
- Equivalentes SMAE: verduras 25 kcal, frutas 60, cereales 70, leguminosas 120, AOA 75, leche 110, aceites 45, azúcares 40.
- Estilo de nota hospitalaria: breve, viñetas con "- ", abreviaturas clínicas comunes, sin saludos ni relleno.
- Evaluación: datos antropométricos, bioquímicos, clínicos y dietéticos relevantes (formato ABCD).
- Intervención: prescripción nutricia (energía, macronutrientes, plan), educación y consejería, coordinación si aplica.
- Monitoreo y evaluación: indicadores concretos, meta y cuándo revisarlos.
- ` + CITAR_GUIAS;

const SISTEMA_EXTENSA = `Eres el apoyo clínico de una nutrióloga clínica mexicana (MNC). Convierte su nota ADIME breve en un informe para el médico tratante: español de México, redacción profesional en párrafos, sin viñetas. Estructura: motivo de envío y resumen del caso, evaluación nutricia, diagnóstico nutricio (PES), plan de intervención y seguimiento propuesto. Respeta exactamente los datos y diagnósticos de la nota; no agregues datos nuevos. No incluyas saludo, despedida ni firma: la nutrióloga los agrega.`;

const ESQUEMA = {
  type: 'object',
  properties: {
    pes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          problema: { type: 'string' },
          etiologia: { type: 'string' },
          signos: { type: 'string' }
        },
        required: ['codigo', 'problema', 'etiologia', 'signos'],
        additionalProperties: false
      }
    },
    evaluacion: { type: 'string' },
    intervencion: { type: 'string' },
    monitoreo: { type: 'string' },
    faltantes: { type: 'array', items: { type: 'string' } }
  },
  required: ['pes', 'evaluacion', 'intervencion', 'monitoreo', 'faltantes'],
  additionalProperties: false
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!(await sesionValida(req))) return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
    const { modo, contexto, nota } = req.body || {};
    if (modo === 'pes') {
      if (!contexto) return res.status(400).json({ error: 'Faltan datos del paciente' });
      const texto = 'Datos del paciente:\n' + JSON.stringify(contexto, null, 1)
        + '\n\nPropón los diagnósticos PES priorizados y la nota ADIME.';
      const result = await pedir(SISTEMA, texto, ESQUEMA);
      result.pes = (result.pes || []).slice(0, 3);
      return res.status(200).json({ result });
    }
    if (modo === 'extensa') {
      if (!nota) return res.status(400).json({ error: 'Falta la nota' });
      const texto = 'Datos del paciente:\n' + JSON.stringify(contexto || {}, null, 1)
        + '\n\nNota ADIME revisada por la nutrióloga:\n' + JSON.stringify(nota, null, 1);
      const result = await pedir(SISTEMA_EXTENSA, texto, null);
      return res.status(200).json({ result });
    }
    return res.status(400).json({ error: 'Modo no valido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
