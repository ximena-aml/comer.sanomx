export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { base64, mediaType, tipo } = req.body;
    if (!base64 || !mediaType || !tipo) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const isImage = mediaType.startsWith('image/');
    const contentBlock = isImage
      ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };

    let prompt = '';
    if (tipo === 'inbody') {
      prompt = 'Este es un reporte InBody. Extrae los siguientes valores: peso (kg), estatura (cm), IMC, porcentaje de grasa corporal, grasa visceral (nivel numérico), masa muscular esquelética (kg), masa grasa (kg), agua corporal total (L), BMR o metabolismo basal (kcal). También extrae composición por segmentos si aparece: masa grasa y masa magra de brazo derecho, brazo izquierdo, tronco, pierna derecha, pierna izquierda. Responde SOLO con JSON con estas keys exactas: peso, estatura, imc, porc_grasa, grasa_visceral, masa_muscular, masa_grasa, agua_total, bmr_inbody, seg_brazo_derecho_grasa, seg_brazo_derecho_magra, seg_brazo_izquierdo_grasa, seg_brazo_izquierdo_magra, seg_tronco_grasa, seg_tronco_magra, seg_pierna_derecha_grasa, seg_pierna_derecha_magra, seg_pierna_izquierda_grasa, seg_pierna_izquierda_magra. Sin texto adicional ni markdown.';
    } else if (tipo === 'labs') {
      prompt = 'Este es un laboratorio clínico. Extrae TODOS los parámetros que aparezcan. Busca especialmente estos y usa exactamente estos nombres como keys del JSON: Glucosa, Insulina basal, HbA1c, HOMA-IR, Colesterol total, HDL, LDL, VLDL, Triglicéridos, Creatinina, BUN, Urea, Ácido úrico, Filtrado glomerular, TGO (AST), TGP (ALT), Fosfatasa alcalina, GGT, Bilirrubina total, Bilirrubina directa, Bilirrubina indirecta, Proteínas totales, Albúmina, Globulinas, TSH, T3, T4, T3 libre, T4 libre, Vitamina D, Vitamina B12, Ácido fólico, Hierro sérico, Ferritina, Transferrina, Saturación de transferrina, Zinc, Magnesio, Calcio, Fósforo, Sodio sérico, Potasio sérico, Cloro sérico, Hemoglobina, Hematocrito, Leucocitos, Plaquetas, Glucosa en orina, Proteínas en orina, pH urinario, Densidad urinaria, Microalbuminuria, Creatinina en orina, Índice albúmina/creatinina. Si el laboratorio dice Sodio sérico, úsalo como "Sodio sérico". Si dice solo Sodio, úsalo también como "Sodio sérico". Lo mismo para Potasio sérico y Cloro sérico. Responde SOLO con JSON. Sin texto adicional ni markdown.';
    } else {
      return res.status(400).json({ error: 'Tipo no válido' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error de API' });

    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return res.status(200).json({ result: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
