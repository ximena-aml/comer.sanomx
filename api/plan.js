import { sesionValida, pedir, datos, CITAR_GUIAS } from './_comun.js';

const BASE = `Eres el apoyo clínico de una nutrióloga clínica mexicana (MNC, marca COMER.SANO MX). Ella revisa y corrige todo antes de entregarlo. Español de México, tuteo cálido con el paciente. Usa solo los datos recibidos; no inventes valores del paciente.`;

const PROTOCOLOS = {
  fodmap: `Bajo en FODMAP (fase de eliminación): avena siempre "libre de gluten"; lácteos deslactosados; sin ajo ni cebolla (sabor con sal, limón, cilantro, comino, orégano); leguminosas solo de lata enjuagadas y en porción pequeña, o fuera; aguacate máximo 1/8 de pieza por comida; nada de miel, polioles, inulina ni jarabe de maíz.`,
  renal: `Renal: aplica exactamente los límites que indique la nutrióloga (potasio, fósforo, sodio, proteína, líquidos). No inventes límites. Prefiere alimentos bajos en potasio y fósforo, evita productos procesados con aditivos de fósforo y sustitutos de sal con potasio; si hay restricción de potasio, sugiere remojo/doble cocción de verduras y tubérculos.`,
  bariatrico: `Bariátrico: respeta la fase posquirúrgica que indique la nutrióloga (textura y volumen). Porciones pequeñas, proteína primero, líquidos separados de los sólidos (30 min antes y después), masticar muy bien, sin azúcares simples ni bebidas con gas.`,
  dg: `Diabetes gestacional: hidratos de carbono complejos y con fibra, repartidos en todos los tiempos y siempre acompañados de proteína; colación nocturna si está en la distribución; sin jugos, refrescos ni azúcares añadidos.`,
  embarazo: `Embarazo: inocuidad alimentaria (solo lácteos pasteurizados, carne, pollo, pescado y huevo bien cocidos, embutidos solo calientes, pescados bajos en mercurio, lavar y desinfectar frutas y verduras), cafeína baja.`
};

function reglasProtocolos(ajustes) {
  const sel = (ajustes && ajustes.protocolos) || {};
  const r = Object.keys(sel).filter(k => sel[k] && PROTOCOLOS[k]).map(k => {
    const det = (ajustes.detalles || {})[k];
    return '- ' + PROTOCOLOS[k] + (det ? ' Indicación de la nutrióloga: ' + det : '');
  });
  return r.length ? '\nProtocolos de este paciente:\n' + r.join('\n') : '';
}

const COCINA = {
  poco: 'Casi no cocina: sin estufa o solo sartén, comal o microondas. Nada de licuar, hornear ni preparar salsas. Atajos como arroz de bolsa para microondas o huevos cocidos desde antes.',
  basico: 'Cocina lo básico: recetas caseras de 4-5 ingredientes y 1-2 pasos cortos.',
  gusta: 'Le gusta cocinar: puede haber recetas un poco más elaboradas, siempre caseras y con ingredientes de súper normal.'
};

const REGLAS_RECETAS = `Reglas de las recetas:
- Sencillas y caseras mexicanas, con ingredientes de súper normal; nada caro ni "gourmet" (salmón ahumado, overnight oats…).
- Una sola fuente de proteína por receta. Nunca omelette de pollo.
- Respeta lo que no le gusta, lo que le cae mal y sus alergias: quítalos por completo.
- Cada receta debe cuadrar EXACTO con las porciones de su celda usando los equivalentes SMAE: no metas grupos que no estén en ese tiempo y no te pases ni te quedes corto. Las verduras son libres en cantidad pero respeta al menos las indicadas.
- Cantidades en medidas caseras: T = taza, C = cucharada, c = cucharadita, Pza = pieza; gramos para carnes y quesos.
- En cada ingrediente indica a qué grupo SMAE pertenece y cuántos equivalentes aporta (grupo "libre" para condimentos, especias, limón, sal, agua). Un ingrediente que aporta a dos grupos (ej. leche con grasa) va en su grupo principal.
- Preparación en prosa breve, 1-2 frases.`;

const GRUPOS = ['verduras', 'frutas', 'cereales', 'leguminosas', 'aoa', 'leche', 'aceites', 'azucares', 'libre'];

const ESQ_MENU = {
  type: 'object',
  properties: {
    opciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          ingredientes: {
            type: 'array',
            items: {
              type: 'object',
              properties: { texto: { type: 'string' }, grupo: { type: 'string', enum: GRUPOS }, porciones: { type: 'number' } },
              required: ['texto', 'grupo', 'porciones'], additionalProperties: false
            }
          },
          preparacion: { type: 'string' }
        },
        required: ['nombre', 'ingredientes', 'preparacion'], additionalProperties: false
      }
    }
  },
  required: ['opciones'], additionalProperties: false
};

const ESQ_EQUIV = {
  type: 'object',
  properties: {
    equivalentes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          grupo: { type: 'string', enum: GRUPOS.slice(0, 8) },
          alimentos: {
            type: 'array',
            items: {
              type: 'object',
              properties: { alimento: { type: 'string' }, porcion: { type: 'string' }, color: { type: 'string', enum: ['', 'libre', 'porcion', 'evitar'] } },
              required: ['alimento', 'porcion', 'color'], additionalProperties: false
            }
          }
        },
        required: ['grupo', 'alimentos'], additionalProperties: false
      }
    },
    comer_fuera: { type: 'array', items: { type: 'string' } },
    generales: {
      type: 'array',
      items: { type: 'object', properties: { tema: { type: 'string' }, puntos: { type: 'array', items: { type: 'string' } } }, required: ['tema', 'puntos'], additionalProperties: false }
    }
  },
  required: ['equivalentes', 'comer_fuera', 'generales'], additionalProperties: false
};

const ESQ_ESPERAR = {
  type: 'object',
  properties: {
    etapas: {
      type: 'array',
      items: { type: 'object', properties: { plazo: { type: 'string' }, texto: { type: 'string' }, respaldo: { type: 'string' } }, required: ['plazo', 'texto', 'respaldo'], additionalProperties: false }
    },
    nota: { type: 'string' }
  },
  required: ['etapas', 'nota'], additionalProperties: false
};

const ESQ_EDU = {
  type: 'object',
  properties: {
    temas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titulo: { type: 'string' }, por_que: { type: 'string' }, prioridad: { type: 'string', enum: ['hoy', 'siguiente', 'despues'] }, contenido: { type: 'string' } },
        required: ['titulo', 'por_que', 'prioridad', 'contenido'], additionalProperties: false
      }
    }
  },
  required: ['temas'], additionalProperties: false
};

const AREAS_ID = ['ali', 'mov', 'sue', 'men', 'con', 'sus', 'gra'];
const ESQ_AREAS = {
  type: 'object',
  properties: {
    areas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string', enum: AREAS_ID },
          recs: {
            type: 'array',
            items: { type: 'object', properties: { texto: { type: 'string' }, accion: { type: 'string' } }, required: ['texto', 'accion'], additionalProperties: false }
          }
        },
        required: ['area', 'recs'], additionalProperties: false
      }
    }
  },
  required: ['areas'], additionalProperties: false
};

const AREAS = `${BASE}
Escribe recomendaciones personalizadas para la app del paciente "Mi Rueda", que trabaja 7 áreas del estilo de vida (Medicina del Estilo de Vida): ali Alimentación, mov Movimiento, sue Sueño, men Salud mental, con Conexión, sus Alcohol y tabaco, gra Gratitud.
- 2-3 recomendaciones por área, ESPECÍFICAS para este paciente según su historia (sueño, actividad física, tabaco, alcohol, estrés, con quién come, horarios, diagnósticos, protocolos). Si un área no aplica (ej. no fuma ni toma), da 1 recomendación para mantenerlo.
- "texto": 1-2 frases cortas, tuteo, cálido, concreto; qué hacer y por qué en pocas palabras.
- "accion": versión corta (máximo 60 caracteres) que el paciente pueda marcar como hecha cada día, escrita en pasado y primera persona, como "Caminé 20 minutos o más" o "Dejé el celular 30 minutos antes de dormir". Vacía "" si no es algo diario.
- Lenguaje SIN GÉNERO: nada de "acompañada", "sentado", "listo"; reescribe la frase para no marcar género. Sin emojis, sin "rayos", sin "lista de cotejo".
- Evidencia: actividad física OMS 2020 (150-300 min moderada por semana y fuerza 2 días); pasos: meta 7,000 al día, no 10,000; sueño adulto 7 horas o más (AASM/SRS); alcohol: OMS, ningún nivel es seguro; tabaco: dejarlo por completo; gratitud: evidencia modesta, no prometas resultados.
- En Alimentación no recomiendes leguminosas y no repitas el menú; enfócate en hábitos (horarios, comer sin pantallas, agua simple, verdura). Si el paciente debe limitar líquidos (renal o cardiaco), no recomiendes aumentar el agua.`;

const GUIAS = `${BASE}
Tu tarea: revisar los requerimientos de energía y nutrimentos de este paciente con la evidencia MÁS RECIENTE de guías de práctica clínica.
- Busca en internet la versión vigente de las guías que apliquen a su caso (según diagnósticos, edad, embarazo, cirugía, función renal, actividad física, objetivo). Ejemplos: ADA Standards of Care, KDIGO, ESPEN, ASMBS/IFSO, ACOG, NAM/IOM ganancia de peso gestacional, EASO / Obesity Canada / AACE, ISSN, Guías Alimentarias para la población mexicana, NOM aplicables. Prioriza fuentes oficiales (sitio de la sociedad, revista, PubMed).
- Para cada parámetro (energía, proteína, hidratos de carbono, lípidos, fibra, líquidos y nutrimentos críticos del caso) da: la recomendación de la guía, cómo queda aplicada a este paciente con sus datos (cálculo con su peso y su GET si viene), la guía (organización, título corto, año), el enlace y el nivel o grado de evidencia si la guía lo da.
- Si una guía no da cifra, dilo; si hay desacuerdo entre guías, señálalo. Nunca cites una guía que no encontraste.
- Compara con lo que la nutrióloga tiene configurado (proteína g/kg, % lípidos, GET) y avisa si algo queda fuera de rango.
Responde SOLO con un objeto JSON, sin texto antes ni después, con esta forma:
{"resumen": "2-3 líneas", "energia_kcal": número o null, "proteina_gkg": número o null, "lipidos_pct": número o null, "hco_pct": número o null,
 "recomendaciones": [{"parametro": "", "recomendacion": "", "aplicado": "", "guia": "", "anio": "", "url": "", "evidencia": ""}],
 "alertas": [""]}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (!(await sesionValida(req))) return res.status(401).json({ error: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
    const { modo, contexto, ajustes, tiempo, porciones, n, otros } = req.body || {};
    if (!contexto) return res.status(400).json({ error: 'Faltan datos del paciente' });
    const ctx = datos('Datos del paciente', contexto);
    const extra = (ajustes && ajustes.notas) ? '\nIndicaciones extra de la nutrióloga: ' + ajustes.notas : '';
    const cocina = '\nNivel de cocina: ' + (COCINA[(ajustes || {}).cocina] || COCINA.basico) + (ajustes && ajustes.frias ? '\nPreparaciones frías: nada se cocina en el momento; lo cocido se deja listo desde antes.' : '');
    let result;

    if (modo === 'guias') {
      result = await pedir(GUIAS, ctx + '\n\nRevisa sus requerimientos con las guías vigentes.', true, true);
    } else if (modo === 'menu') {
      const colacion = /colaci/i.test(tiempo || '');
      const sys = BASE + '\n' + REGLAS_RECETAS + reglasProtocolos(ajustes) + cocina + extra
        + (colacion ? '\nEs una colación: opciones muy sencillas (pocas o ninguna preparación), listas para llevar.' : '');
      const texto = ctx + '\n\n' + datos('Porciones SMAE de este tiempo (' + tiempo + ')', porciones)
        + '\nOtros tiempos del día: ' + (otros || []).join(', ')
        + '\n\nPropón ' + (n || 5) + ' opciones distintas para ' + tiempo + ', variadas entre sí.';
      result = await pedir(sys, texto, ESQ_MENU);
    } else if (modo === 'equivalentes') {
      const sys = BASE + reglasProtocolos(ajustes) + extra + `
Arma la tabla de equivalentes del plan: solo para los grupos que tiene su plan SMAE (equivalentes > 0), 20-25 alimentos por grupo, comunes en México y que el paciente sí come, variados (ej. en cereales: tortilla, pan, arroz, pastas, avena, tubérculos, elotes, galletas; en origen animal: res, pollo, pescado, huevo, quesos, embutidos de pavo, según su caso); la porción de 1 equivalente SMAE en medida casera (T, C, c, Pza, g).
Columna "color": déjala vacía "" salvo que haya protocolo bajo en FODMAP; en ese caso marca cada alimento como "libre", "porcion" (solo en la porción indicada) o "evitar" (evitar por ahora).
Recomendaciones: "comer_fuera" (qué elegir si come fuera o en comedor, y qué antojitos evitar, según dónde come) y "generales" agrupadas por tema con viñetas cortas, adaptadas a su caso y protocolos. Frases cortas, tuteo.`;
      result = await pedir(sys, ctx + '\n\nArma la tabla de equivalentes y las recomendaciones.', ESQ_EQUIV);
    } else if (modo === 'esperar') {
      const sys = BASE + reglasProtocolos(ajustes) + `
Escribe la sección "Qué puedes esperar" para el paciente: 3-5 etapas con plazo (ej. "Primeras 2 semanas", "Al mes", "A los 3 meses", "A los 6 meses") y qué es realista que note o cambie: energía, digestión, hambre y saciedad, sueño, medidas, composición corporal, laboratorios, según su diagnóstico y objetivo.
- Da rangos numéricos solo cuando las guías de práctica clínica los respalden (ej. pérdida de 0.5-1 kg por semana; ganancia de peso gestacional según IMC pregestacional) y en "respaldo" pon la guía y el año que lo sustentan; si la etapa no tiene cifra, deja "respaldo" vacío.
- Nada de promesas: deja claro que depende de la constancia y que se revisa en cada consulta. ${CITAR_GUIAS}
- "nota": una frase motivadora breve, sin cursilería ni emojis.
- Lenguaje sencillo, sin tecnicismos, frases cortas.`;
      result = await pedir(sys, ctx + '\n\nEscribe "Qué puedes esperar".', ESQ_ESPERAR);
    } else if (modo === 'areas') {
      result = await pedir(AREAS + reglasProtocolos(ajustes) + extra, ctx + '\n\nEscribe las recomendaciones por área.', ESQ_AREAS);
    } else if (modo === 'educacion') {
      const vistos = (ajustes && ajustes.temas_vistos) || [];
      const sys = BASE + reglasProtocolos(ajustes) + `
Propón 6-8 temas de educación nutricia ESPECÍFICOS para este paciente (según sus diagnósticos PES, laboratorios, síntomas, hábitos y protocolos), no genéricos. La nutrióloga dosifica la información entre consultas y elige cuáles entran hoy.
- "prioridad": "hoy" (lo más urgente para empezar), "siguiente" (próxima consulta) o "despues".
- No repitas temas ya vistos; si alguno necesita repaso, propón la siguiente profundidad (ej. "Etiquetas: azúcares ocultos" después de "Cómo leer etiquetas").
- "por_que": una línea para la nutrióloga explicando por qué ese tema para este paciente.
- "contenido": para el paciente, 60-120 palabras, tuteo, frases cortas, concreto y accionable (qué hacer, no solo qué es). Sin emojis.`;
      result = await pedir(sys, ctx + '\n\nTemas ya vistos en planes anteriores: ' + (vistos.length ? vistos.join('; ') : 'ninguno') + '\n\nPropón los temas.', ESQ_EDU);
    } else {
      return res.status(400).json({ error: 'Modo no valido' });
    }
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
