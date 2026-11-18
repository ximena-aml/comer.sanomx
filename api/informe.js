import { sesionValida, pedir } from './_comun.js';

const SISTEMA = `Eres el apoyo clínico de una nutrióloga clínica mexicana (MNC). Recibes un informe médico (PDF o foto: nota médica, resumen clínico, referencia, epicrisis, hoja de alta, estudios) y extraes los datos que sirven para su historia clínica nutricional. Ella revisa todo antes de guardarlo.

Reglas:
- Usa SOLO lo que dice el documento. No inventes, no deduzcas diagnósticos que no estén escritos. Si un dato no aparece, déjalo vacío ("" o lista vacía).
- Español de México, terminología clínica, sin abreviaturas raras.
- Enfermedades: diagnósticos actuales o crónicos del paciente, cada uno con el año de diagnóstico si aparece.
- Cirugías: con fecha AAAA-MM si aparece (o AAAA-01 si solo dice el año).
- Medicamentos: solo los que el paciente toma actualmente (no los suspendidos), con dosis y frecuencia tal como vienen.
- Antecedentes heredofamiliares: solo si el informe los menciona; indica el familiar (ej. "Madre, padre").
- Laboratorios: solo si vienen resultados con valor. Usa EXACTAMENTE uno de los nombres de la lista que te dan; si un estudio no está en la lista, no lo incluyas. Valor numérico como texto, sin unidades; si dice Negativo usa "0". Fecha de toma AAAA-MM-DD si aparece.
- Fechas en formato AAAA-MM-DD. Sexo: "Femenino", "Masculino" o "".
- "resumen": 3-6 viñetas cortas con "- " para la nutrióloga: motivo del informe, diagnósticos principales, indicaciones o restricciones dietéticas del médico (líquidos, sodio, potasio, proteína, etc.), plan y pendientes relevantes para nutrición.`;

const T = { type: 'string' };
const ESQUEMA = {
  type: 'object',
  properties: {
    fecha_informe: T, origen: T, resumen: T,
    paciente: { type: 'object', properties: { fecha_nac: T, sexo: T }, required: ['fecha_nac', 'sexo'], additionalProperties: false },
    texto: {
      type: 'object',
      properties: { ahf_diabetes: T, ahf_hta: T, ahf_cancer: T, ahf_otros: T, alergias: T, hospitalizaciones: T, sx_gi: T, suplementos: T },
      required: ['ahf_diabetes', 'ahf_hta', 'ahf_cancer', 'ahf_otros', 'alergias', 'hospitalizaciones', 'sx_gi', 'suplementos'],
      additionalProperties: false
    },
    enfermedades: { type: 'array', items: { type: 'object', properties: { enf: T, anio: T }, required: ['enf', 'anio'], additionalProperties: false } },
    cirugias: { type: 'array', items: { type: 'object', properties: { cx: T, fecha: T }, required: ['cx', 'fecha'], additionalProperties: false } },
    medicamentos: { type: 'array', items: { type: 'object', properties: { med: T, dosis: T, frec: T }, required: ['med', 'dosis', 'frec'], additionalProperties: false } },
    laboratorios: {
      type: 'object',
      properties: {
        fecha: T,
        resultados: { type: 'array', items: { type: 'object', properties: { nombre: T, valor: T }, required: ['nombre', 'valor'], additionalProperties: false } }
      },
      required: ['fecha', 'resultados'], additionalProperties: false
    }
  },
  required: ['fecha_informe', 'origen', 'resumen', 'paciente', 'texto', 'enfermedades', 'cirugias', 'medicamentos', 'laboratorios'],
  additionalProperties: false
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!(await sesionValida(req))) return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
    const { base64, mediaType, parametros } = req.body || {};
    if (!base64 || !mediaType) return res.status(400).json({ error: 'Falta el archivo' });
    const bloque = mediaType.startsWith('image/')
      ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
    const texto = 'Nombres válidos de laboratorio: ' + (Array.isArray(parametros) ? parametros.join(', ') : '')
      + '\n\nExtrae los datos de este informe médico.';
    const result = await pedir(SISTEMA, [bloque, { type: 'text', text: texto }], ESQUEMA);
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
