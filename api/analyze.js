export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { base64, mediaType, tipo } = req.body;
    if (!base64 || !mediaType || !tipo) return res.status(400).json({ error: 'Faltan parámetros' });
    const isImage = mediaType.startsWith('image/');
    const contentBlock = isImage
      ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
      : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
    let prompt = '';
    if (tipo === 'inbody') {
      prompt = 'Este es un reporte InBody. Extrae: peso, estatura, imc, porc_grasa, grasa_visceral, masa_muscular, masa_grasa, agua_total, bmr_inbody, seg_brazo_derecho_grasa, seg_brazo_derecho_magra, seg_brazo_izquierdo_grasa, seg_brazo_izquierdo_magra, seg_tronco_grasa, seg_tronco_magra, seg_pierna_derecha_grasa, seg_pierna_derecha_magra, seg_pierna_izquierda_grasa, seg_pierna_izquierda_magra. Responde SOLO con JSON.';
    } else if (tipo === 'labs') {
      prompt = 'Este es un laboratorio clinico. Extrae todos los parametros. Usa exactamente estos nombres: Glucosa, Insulina basal, HbA1c, HOMA-IR, Colesterol total, HDL, LDL, VLDL, Trigliceridos, Creatinina, BUN, Urea, Acido urico, Filtrado glomerular, TGO (AST), TGP (ALT), Fosfatasa alcalina, GGT, Bilirrubina total, Bilirrubina directa, Bilirrubina indirecta, Proteinas totales, Albumina, Globulinas, TSH, T3, T4, T3 libre, T4 libre, Vitamina D, Vitamina B12, Acido folico, Hierro serico, Ferritina, Transferrina, Saturacion de transferrina, Zinc, Magnesio, Calcio, Fosforo, Sodio serico, Potasio serico, Cloro serico, Hemoglobina, Hematocrito, Leucocitos, Plaquetas. Si el lab dice Sodio o Sodio serico, ponlo como Sodio serico. Responde SOLO con JSON sin markdown.';
    } else {
      return res.status(400).json({ error: 'Tipo no valido' });
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }] })
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
