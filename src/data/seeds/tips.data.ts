export interface Tip {
  id: string
  category: 'nutricion' | 'entreno' | 'recuperacion' | 'mentalidad'
  text: string
  source?: string
}

/** Consejos breves y basados en evidencia para la pantalla Hoy. */
export const TIPS_DATA: Tip[] = [
  {
    id: 't01',
    category: 'nutricion',
    text: 'Reparte tu proteína en 3–5 comidas de 25–50 g: estimula la síntesis muscular más veces al día.',
    source: 'Schoenfeld & Aragon, JISSN 2018',
  },
  {
    id: 't02',
    category: 'nutricion',
    text: 'La proteína es el macro que más sacia. Si tienes hambre en déficit, empieza cada comida por ella.',
    source: 'Leidy et al., AJCN 2015',
  },
  {
    id: 't03',
    category: 'nutricion',
    text: 'Las verduras aportan volumen con pocas calorías: medio plato de verduras hace que el déficit se sienta menos.',
  },
  {
    id: 't04',
    category: 'nutricion',
    text: 'Los carbohidratos antes de entrenar mejoran el rendimiento en series pesadas. Guárdalos para alrededor del entreno.',
  },
  {
    id: 't05',
    category: 'nutricion',
    text: 'Pesar la comida unas semanas te entrena el ojo. Después podrás estimar porciones con mucha más precisión.',
  },
  {
    id: 't06',
    category: 'nutricion',
    text: 'Las bebidas azucaradas no sacian. Cambiar gaseosa por agua o bebidas sin azúcar es el recorte más fácil.',
  },
  {
    id: 't07',
    category: 'nutricion',
    text: 'Un día por encima de tus calorías no arruina nada. Lo que cuenta es el promedio de la semana.',
  },
  {
    id: 't08',
    category: 'nutricion',
    text: 'La fibra (14 g por cada 1000 kcal) mejora la saciedad y la digestión. Fruta entera, leguminosas y verduras.',
  },
  {
    id: 't09',
    category: 'nutricion',
    text: 'El alcohol aporta 7 kcal/g y empeora la recuperación y el sueño. Si tomas, planea esas calorías.',
  },
  {
    id: 't10',
    category: 'nutricion',
    text: 'La creatina monohidratada (3–5 g/día) es el suplemento con más evidencia para fuerza y masa muscular.',
    source: 'Kreider et al., JISSN 2017',
  },
  {
    id: 't11',
    category: 'nutricion',
    text: 'El café antes de entrenar (3–6 mg/kg de cafeína) puede mejorar tu rendimiento. Evítalo 6–8 h antes de dormir.',
    source: 'Guest et al., JISSN 2021',
  },
  {
    id: 't12',
    category: 'nutricion',
    text: 'Prepara proteína para 2–3 días de una vez: pollo, carne molida o huevos duros. La adherencia empieza en la cocina.',
  },
  {
    id: 't13',
    category: 'nutricion',
    text: 'Si comes fuera, elige un plato con proteína a la plancha, verduras y una porción de carbohidrato. No necesitas pesar.',
  },
  {
    id: 't14',
    category: 'nutricion',
    text: 'Las frutas enteras sacian más que los jugos: tienen la fibra y se comen más despacio.',
  },
  {
    id: 't15',
    category: 'nutricion',
    text: 'Una arepa mediana tiene cerca de 130 kcal. Combínala con huevo o queso para un desayuno con proteína.',
  },
  {
    id: 't16',
    category: 'nutricion',
    text: 'El aceite suma calorías sin que lo notes: 1 cucharada son ~120 kcal. Mídelo en lugar de echarlo a ojo.',
  },
  {
    id: 't17',
    category: 'nutricion',
    text: 'Tomar agua antes de las comidas puede ayudarte a controlar el apetito.',
  },
  {
    id: 't18',
    category: 'nutricion',
    text: 'No necesitas eliminar ningún alimento para perder grasa: el balance de energía de la semana es lo que decide.',
  },
  {
    id: 't19',
    category: 'entreno',
    text: 'En déficit, la intensidad es lo que preserva la fuerza: no bajes el peso de tus básicos; si hace falta, baja series.',
    source: 'Bickel et al., MSSE 2011',
  },
  {
    id: 't20',
    category: 'entreno',
    text: 'Registrar el RIR (reps en reserva) te ayuda a entrenar cerca del fallo sin acumular fatiga innecesaria.',
  },
  {
    id: 't21',
    category: 'entreno',
    text: 'Descansa 2–3 minutos entre series de básicos. Descansar poco reduce las reps y el estímulo.',
    source: 'Schoenfeld et al., JSCR 2016',
  },
  {
    id: 't22',
    category: 'entreno',
    text: 'Calienta con 2–3 series progresivas antes de tu primera serie efectiva: más rendimiento y menos riesgo.',
  },
  {
    id: 't23',
    category: 'entreno',
    text: 'La progresión doble es simple: suma reps con el mismo peso; al llegar al tope del rango, sube el peso.',
  },
  {
    id: 't24',
    category: 'entreno',
    text: 'Entrenar cada músculo 2 veces por semana suele dar mejores resultados que 1 sola vez con el mismo volumen.',
    source: 'Schoenfeld et al., Sports Med 2016',
  },
  {
    id: 't25',
    category: 'entreno',
    text: 'Las series de 6–15 reps cerca del fallo construyen músculo; las de 1–6 reps pesadas mantienen la fuerza máxima.',
  },
  {
    id: 't26',
    category: 'entreno',
    text: 'Controla la bajada (2–3 segundos) en los accesorios: más tensión con menos peso.',
  },
  {
    id: 't27',
    category: 'entreno',
    text: 'Si un ejercicio te duele (no es lo mismo que cansancio), cámbialo por una variante. El plan se adapta a ti.',
  },
  {
    id: 't28',
    category: 'entreno',
    text: 'Los días que te sientas mal, haz al menos tus básicos. Una sesión corta es mejor que ninguna.',
  },
  {
    id: 't29',
    category: 'entreno',
    text: 'Sube de peso solo cuando completes todas las series en el tope del rango. Paciencia: así se progresa años.',
  },
  {
    id: 't30',
    category: 'entreno',
    text: 'Las semanas de descarga no son perder el tiempo: disipan la fatiga y te dejan rendir más el bloque siguiente.',
  },
  {
    id: 't31',
    category: 'entreno',
    text: 'Las caminatas no compiten con tus pesas: suman gasto sin afectar la recuperación como el cardio intenso.',
  },
  {
    id: 't32',
    category: 'entreno',
    text: 'Si haces HIIT, aléjalo de los días de pierna: interfiere con la fuerza y la recuperación de tren inferior.',
    source: 'Wilson et al., JSCR 2012',
  },
  {
    id: 't33',
    category: 'entreno',
    text: 'Graba tus series pesadas de vez en cuando para revisar la técnica. Lo que no se ve, no se corrige.',
  },
  {
    id: 't34',
    category: 'entreno',
    text: 'Los récords no salen todas las semanas en déficit. Mantener tus pesos ya es una victoria.',
  },
  {
    id: 't35',
    category: 'recuperacion',
    text: 'Dormir menos de 6 h en déficit hace que pierdas más músculo y menos grasa. Apunta a 7–9 h.',
    source: 'Nedeltcheva et al., Ann Intern Med 2010',
  },
  {
    id: 't36',
    category: 'recuperacion',
    text: 'Una rutina fija para acostarte (misma hora, poca luz, sin pantallas) mejora la calidad del sueño.',
  },
  {
    id: 't37',
    category: 'recuperacion',
    text: 'El peso diario fluctúa 1–2 kg por agua, sal y digestión. Mira el promedio de 7 días, no el número de hoy.',
  },
  {
    id: 't38',
    category: 'recuperacion',
    text: 'Pésate al despertar, después del baño y antes de comer o beber: así comparas siempre en las mismas condiciones.',
  },
  {
    id: 't39',
    category: 'recuperacion',
    text: 'El estrés crónico retiene líquido y puede esconder la pérdida de grasa en la báscula. Sé paciente con los datos.',
  },
  {
    id: 't40',
    category: 'recuperacion',
    text: 'Las agujetas no indican un buen entrenamiento. El progreso de cargas sí.',
  },
  {
    id: 't41',
    category: 'recuperacion',
    text: 'Bebe agua a lo largo del día: una deshidratación del 2 % ya reduce tu fuerza.',
    source: 'Judelson et al., Sports Med 2007',
  },
  {
    id: 't42',
    category: 'recuperacion',
    text: 'Hacer movilidad 10 minutos en tus días de descanso mejora cómo te sientes en la siguiente sesión.',
  },
  {
    id: 't43',
    category: 'mentalidad',
    text: 'La consistencia le gana a la perfección: un plan al 80 % durante meses supera a uno perfecto durante dos semanas.',
  },
  {
    id: 't44',
    category: 'mentalidad',
    text: 'Mide tu cintura cada semana: en recomposición, la cinta cuenta lo que la báscula no muestra.',
  },
  {
    id: 't45',
    category: 'mentalidad',
    text: 'Las fotos de progreso con la misma luz y postura son tu mejor evidencia en los meses difíciles.',
  },
  {
    id: 't46',
    category: 'mentalidad',
    text: 'Piensa en semanas, no en días. Un mal día no define nada si la semana va bien.',
  },
  {
    id: 't47',
    category: 'mentalidad',
    text: 'Celebra los récords pequeños: una rep más con el mismo peso también es progreso.',
  },
  {
    id: 't48',
    category: 'mentalidad',
    text: 'Ten listo un plan B para los días ocupados: un entreno de 30 minutos con solo los básicos.',
  },
  {
    id: 't49',
    category: 'mentalidad',
    text: 'La motivación va y viene. Los hábitos (hora fija para entrenar, comidas preparadas) te sostienen cuando no hay ganas.',
  },
  {
    id: 't50',
    category: 'mentalidad',
    text: 'Recomposición es un proceso lento: 0,5 % de peso por semana con fuerza estable es un excelente resultado.',
  },
  {
    id: 't51',
    category: 'nutricion',
    text: 'Los huevos son proteína barata y versátil. Las claras suman proteína casi sin grasa.',
  },
  {
    id: 't52',
    category: 'nutricion',
    text: 'Los fríjoles y las lentejas aportan proteína, fibra y carbohidratos: excelentes en déficit.',
  },
  {
    id: 't53',
    category: 'nutricion',
    text: 'El yogur griego y el queso cottage son snacks altos en proteína ideales antes de dormir.',
  },
  {
    id: 't54',
    category: 'nutricion',
    text: 'Ten a mano opciones rápidas de proteína (atún, yogur griego, whey) para no saltarte la meta del día.',
  },
  {
    id: 't55',
    category: 'entreno',
    text: 'Usa la técnica más estricta en las últimas reps: ahí es donde se cuelan los malos hábitos.',
  },
  {
    id: 't56',
    category: 'entreno',
    text: 'Si te estancas 3 sesiones seguidas, baja el peso 5–10 % y reconstruye. Suele romper el estancamiento.',
  },
  {
    id: 't57',
    category: 'recuperacion',
    text: 'Si tu fuerza cae varias semanas seguidas, la solución suele ser comer un poco más y dormir mejor, no entrenar más.',
  },
  {
    id: 't58',
    category: 'mentalidad',
    text: 'Compárate con tu versión de hace 3 meses, no con otros. Tus datos te muestran el camino.',
  },
  {
    id: 't59',
    category: 'nutricion',
    text: 'Las salsas y aderezos pueden sumar 100–200 kcal por comida. Prueba limón, especias o pico de gallo.',
  },
  {
    id: 't60',
    category: 'entreno',
    text: 'Dormir bien la noche antes de entrenar pesado vale más que cualquier pre-entreno.',
  },
]
