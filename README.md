# FORJA — Baja grasa. Conserva tu fuerza.

FORJA es una aplicación web instalable (PWA) en español para **recomposición corporal**: perder grasa sin perder fuerza. Respondes unas preguntas (unos 4 minutos) y la app calcula tus calorías, macros, agua, fibra, plan de comidas y plan de entrenamiento; luego te acompaña en el gimnasio, en la cocina y en el check-in semanal. **Cada número tiene un botón "¿Por qué?"** con la fórmula, tus datos sustituidos y la fuente.

> Esta app ofrece orientación general basada en evidencia y no reemplaza la valoración de un médico o nutricionista.

- **100 % local:** tus datos viven en tu teléfono (IndexedDB). No hay cuentas, servidores ni anuncios.
- **Funciona sin internet** después de la primera visita (service worker).
- **Instalable** en Android, iPhone y escritorio.
- **Alimentos de aquí:** más de 200 alimentos con valores del ICBF (Colombia) y del USDA, con la fuente de cada uno.

## Usarla en el teléfono

Dirección de la app publicada: **https://daniel01010101010101.github.io/app_nutricional_gym/**

- **Android (Chrome):** abre la dirección y toca **Instalar** (aparece en la pantalla Hoy o en tu Perfil). También desde el menú ⋮ → _Instalar aplicación_.
- **iPhone (Safari):** abre la dirección, toca **Compartir** y luego **Agregar a inicio**.
- **Escritorio (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Cuando haya una versión nueva verás el aviso "Hay una versión nueva de FORJA" con el botón **Actualizar**.

### Respaldo de tus datos

Como todo se guarda en el teléfono, haz un respaldo de vez en cuando: **Perfil → Ajustes → Tus datos → Exportar** (puedes incluir las fotos). Para pasar tus datos a otro teléfono usa **Restaurar** (también disponible en la pantalla de bienvenida).

## Qué hace

| Módulo         | Lo principal                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding** | 8 pasos con validación, guardado automático, estimación US Navy en vivo, test de fuerza opcional, preguntas de salud y resumen explicado.                                                                                                                                        |
| **Hoy**        | Entreno del día (o descanso), anillos de calorías y macros, siguiente comida del plan con "Lo comí", agua, pasos, pesaje, rachas, consejo del día y avisos (check-in, fuerza bajando, descarga).                                                                                 |
| **Entreno**    | Plan por días, sesión en vivo con series precargadas (un toque), objetivo sugerido, calentamiento, discos por lado, temporizador con sonido y vibración, registro por texto, récords con celebración, resumen, historial, biblioteca de más de 100 ejercicios y editor del plan. |
| **Nutrición**  | Diario por fecha, búsqueda con medidas caseras, recientes, favoritas, registro rápido de macros, copiar de ayer, mensaje "te faltan" con ideas concretas, plan de comidas de la semana con intercambios y lista de mercado.                                                      |
| **Progreso**   | Peso diario y promedio de 7 días, cintura, % de grasa, 1RM estimado por básico, volumen semanal, adherencia, fotos con comparación, récords.                                                                                                                                     |
| **Check-in**   | Cada semana evalúa peso, cintura, adherencia, fuerza y bienestar, y propone un ajuste explicado que puedes **Aplicar** o **Ignorar**.                                                                                                                                            |
| **Ajustes**    | kg/lb, discos y barra de tu gimnasio, saltos de mancuernas y máquinas, temporizador, día de check-in, descarga, tema claro/oscuro, exportar, restaurar y borrar.                                                                                                                 |

## Fórmulas y reglas

Todas las constantes viven en [`src/domain/constants/formulas.ts`](src/domain/constants/formulas.ts); los cálculos son funciones puras en `src/domain` con **100 % de cobertura de tests**.

### Energía

- **Metabolismo basal (TMB).** Mifflin-St Jeor: `10 × peso + 6,25 × altura − 5 × edad + 5` (hombres) o `− 161` (mujeres). Si tu % de grasa viene de un método fiable (DEXA, BodPod, plicometría o bioimpedancia profesional) se usa Katch-McArdle: `370 + 21,6 × masa magra`.
- **Nivel de actividad.** Puntaje conservador = máximo entre tu trabajo (sentado 0, de pie 1, físico 2) y tus pasos (5.000 → 0,5; 7.500 → 1; 10.000 → 1,5; 12.500 → 2) + días de entreno (1 → 0,5; 3 → 1; 4 → 1,5; 6 → 2). Factores: sedentario 1,2 · ligero 1,375 · moderado 1,55 · activo 1,725 · muy activo 1,9.
- **Gasto total** = TMB × factor.

### Déficit

| % de grasa (hombre / mujer)  | Déficit                            |
| ---------------------------- | ---------------------------------- |
| < 15 % / < 23 % (bajo)       | 10 % fijo, para proteger la fuerza |
| 15–25 % / 23–32 % (moderado) | 15–20 %                            |
| > 25 % / > 32 % (alto)       | 20–25 %                            |

Dentro de la banda se elige el déficit que da un ritmo de pérdida de ~0,6 % del peso por semana (rango 0,5–0,7 %; nunca más de 1 %), con 7.700 kcal por kg de grasa. Las calorías nunca bajan de la TMB. Con embarazo, lactancia o historial de trastornos alimenticios se usan calorías de mantenimiento. Todo se redondea a 25 kcal y 5 g.

### Macros, fibra y agua

- **Proteína:** 2,2 g/kg de peso (rango 2,0–2,4). Con % de grasa alto, 2,5 g/kg de masa magra. Nunca se reduce en un ajuste.
- **Grasa:** 0,8 g/kg (rango 0,6–1,0), mínimo 20 % de las calorías.
- **Carbohidratos:** las calorías restantes.
- **Ciclado de carbos (opcional):** −25 % de carbos en días de descanso, repartido en los días de entreno; el promedio semanal no cambia y nunca baja de la TMB.
- **Fibra:** 14 g por cada 1.000 kcal.
- **Agua:** 35 ml/kg + 500–750 ml por hora de entreno.

### Plan de comidas

Los macros del día se reparten entre 3–6 comidas (25–50 g de proteína por comida; más carbos y menos grasa antes y después de entrenar). Se eligen alimentos que respetan tus restricciones, alergias, gustos y presupuesto y se optimizan los gramos para quedar **dentro de ±5 % en calorías y en cada macro**, con porciones reales (unidades, medio scoop, múltiplos de 5–10 g). Cada semana se usa una **rotación** de pocos alimentos por momento del día para cocinar por tandas y tener una lista de mercado de unas 20 cosas; si con ellos no se cumple el ±5 %, se usa todo el catálogo. Los intercambios igualan el macro principal del alimento (proteína, carbos o grasa).

### Entrenamiento

- **Días:** 3 mínimo, 4 ideal, máximo 5 en déficit (6 solo avanzados). División: cuerpo completo (≤ 3 días), torso/pierna (4), torso/pierna + empuje/jalón/pierna (5) o PPL ×2 (6).
- **Volumen:** 10–16 series efectivas por músculo y semana en déficit (10–12 principiantes, +3 para músculos prioritarios). El músculo principal cuenta 1 serie y cada secundario 0,5.
- **Intensidad:** básicos 3–4 × 4–6 a RIR 1–2 (3 min de descanso), compuestos 3 × 6–10 a RIR 1–2 (2 min), accesorios 2–3 × 10–15 a RIR 0–2 (75–90 s).
- **Selección:** según tu equipo, lesiones (se evitan los ejercicios que cargan esa articulación), exclusiones y preferencias; prioriza cargas progresables y el tiempo que tienes por sesión.
- **1RM estimado:** Epley con reps efectivas: `1RM = peso × (1 + (reps + RIR) / 30)`. Más de 10 reps efectivas = baja confianza.
- **Progresión doble:** con todas las series en el tope del rango al RIR objetivo, sube +2,5 kg (tren superior) o +5 kg (inferior), redondeado a tus discos. Sin llegar al mínimo de reps 1–2 sesiones: mantener; 3 sesiones: bajar 5–10 % y reconstruir.
- **Tendencia de fuerza:** media móvil de 3 sesiones comparada con 14 días antes (±2 % = estable). **Alerta** si cae más de 5 % en 2 o más básicos: no bajar calorías y sumar ~150 kcal de carbos en días de entreno.
- **Descarga:** cada 6 semanas (configurable 5–8) o antes si hay alerta de fuerza, 2 check-ins seguidos con sueño o energía bajos, o 2 sesiones seguidas con mala sensación: mismos pesos, la mitad de las series.
- **Calentamiento sugerido:** barra vacía × 10, ~50 % × 8, ~70 % × 5, ~85 % × 2.

### Check-in semanal

Usa el promedio de peso de la semana (mínimo 2 pesajes) frente a la anterior. Un día "cumple" si las calorías están dentro de ±10 % y la proteína llega al 90 %. Orden de decisión:

1. **Seguridad:** mantenimiento si las respuestas de salud lo indican.
2. **Adherencia < 80 %:** no se cambian las calorías.
3. **Fuerza bajando:** +40 g de carbos en días de entreno.
4. **Sin datos suficientes:** pide más pesajes.
5. **Pérdida > 1 %/semana:** sube 5 % de las calorías (100–150 kcal).
6. **Recomposición:** peso estable, cintura bajando y fuerza subiendo → no se cambia nada.
7. **Estancado 2 semanas (< 0,25 %/semana):** baja 5 % (100–150 kcal), primero de carbos y luego de grasa, sin pasar el mínimo de grasa ni la TMB.
8. Si no, se mantiene el plan.

El primer check-in espera a tener al menos 4 días de datos.

## Desarrollo

Requisitos: Node 22.

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run check
```

`npm run check` ejecuta ESLint, Prettier, TypeScript estricto, los tests con cobertura (100 % obligatorio en `src/domain`) y la build. La prueba de punta a punta (móvil y sin conexión) se corre con:

```bash
npm run e2e
```

### Arquitectura

```
src/
  domain/      Lógica pura (fórmulas, planificación, progresión, parser, check-in). Sin React ni datos.
  data/        Esquemas Zod, base de datos Dexie, repositorios, catálogos y respaldo.
  services/    Orquesta dominio + repositorios para las pantallas.
  features/    Pantallas por módulo (onboarding, today, training, nutrition, progress, checkin, settings).
  components/  Sistema de diseño (shadcn/ui), formularios, gráficas y layout.
  hooks/ stores/ lib/  Utilidades de React, estado global (Zustand) y formato.
```

Las reglas de arquitectura se verifican con ESLint (el dominio no puede importar React, datos ni UI; las pantallas no pueden usar Dexie directamente). Las decisiones de diseño están en [`docs/DECISIONES.md`](docs/DECISIONES.md).

### Despliegue

Cada push ejecuta el flujo [`deploy.yml`](.github/workflows/deploy.yml): lint, formato, tipos, tests con cobertura, build, prueba de punta a punta y publicación en GitHub Pages. Requisitos en el repositorio: **Settings → Pages → Source: GitHub Actions**, y en **Settings → Environments → github-pages** la rama desde la que se publica debe estar permitida.

## Fuentes

- Composición de alimentos: ICBF, _Tabla de Composición de Alimentos Colombianos_ (2018); USDA FoodData Central, SR Legacy.
- Mifflin MD et al. _Am J Clin Nutr_ 1990 · Hodgdon & Beckett, _Naval Health Research Center_ 1984 · Helms ER et al. _JISSN_ 2014 · Morton RW et al. _Br J Sports Med_ 2018 · Schoenfeld BJ et al. _J Sports Sci_ 2017 · Epley B. 1985.

## Límites conocidos

- No hay sincronización entre dispositivos ni cuenta en la nube (se usa el respaldo JSON).
- Los pasos y el agua se registran a mano; no hay integración con Google Fit ni Apple Salud.
- No hay lector de código de barras; para productos empacados usa el registro rápido de macros.
- Los recordatorios se muestran dentro de la app (no hay notificaciones push).
- En iPhone el navegador no permite vibrar al terminar el descanso (el sonido sí funciona).
- Los ejercicios tienen instrucciones y errores comunes en texto y un mapa muscular propio, no animaciones.
- Los valores nutricionales son aproximados: varían según la marca, la variedad y la preparación.
