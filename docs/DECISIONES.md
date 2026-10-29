# Decisiones de diseño

Registro de las decisiones que no venían definidas en la especificación, con su motivo. Cuando una regla tiene base científica, la fuente está en `src/domain/constants/formulas.ts` y en el "¿Por qué?" de la app.

## Producto

1. **Todo local, sin cuenta.** IndexedDB (Dexie) en el teléfono, respaldo/restauración en JSON. Motivo: privacidad (datos de salud y fotos), funciona sin internet en el gimnasio y no hay servidor que mantener. Los repositorios son interfaces (`src/data/repositories/types.ts`) para poder agregar sincronización sin tocar las pantallas.
2. **Explicación en cada número.** El dominio devuelve `Calculated<T>` (valor + explicación). La explicación se genera con el mismo cálculo, así el "¿Por qué?" nunca queda desactualizado.
3. **Español de Colombia.** Coma decimal (`es-CO`), nombres locales de alimentos (arepa, panela, onces) y valores del ICBF cuando existen; USDA para el resto.
4. **Tema oscuro por defecto** con acento naranja brasa (#ff6b1a). Se usa mucho en el gimnasio y en pantallas OLED gasta menos batería. Tema claro y "sistema" disponibles.

## Nutrición

5. **Factor de actividad conservador.** Se toma el máximo entre trabajo y pasos más los días de entreno, y los niveles se asignan con umbrales altos. Sobrestimar el gasto es el error más común; el check-in corrige con datos reales.
6. **Déficit por banda de % de grasa** y, dentro de la banda, por ritmo objetivo (0,6 %/semana). Con poca grasa se protege la fuerza (10 %); con más grasa se tolera más déficit.
7. **El plan de comidas apunta a las kcal de las tablas**, no a 4/4/9. Las tablas del ICBF incluyen la energía de la fibra; si el plan se calculara con 4/4/9, comer el menú sumaría ~5 % más de lo que muestra el diario.
8. **Rotación semanal de alimentos.** Sin rotación, 7 días de menús daban ~70 productos en la lista de mercado. Con 4 proteínas, 3 carbos, 2 grasas, 4 verduras y 3 frutas por momento del día la lista baja a ~20 y se puede cocinar por tandas; si con la rotación no se logra ±5 %, el generador usa todo el catálogo.
9. **Porciones reales.** El generador redondea a unidades (huevos), medio scoop, medias unidades grandes (arepas) o múltiplos de 5–10 g, y luego hace un ajuste fino del día. Por eso un menú nunca es exacto al gramo, pero siempre cumple ±5 %.
10. **Adherencia:** un día cumple con kcal ±10 % y proteína ≥ 90 %. Los días sin registro no cumplen (no se asume nada).

## Entrenamiento

11. **Selección de ejercicios por puntaje.** Patrón de movimiento, rol (básico/compuesto/accesorio), equipo, lesiones, preferencias del test de fuerza y variedad semanal. En secundarios y accesorios se prefieren cargas progresables (mancuerna, máquina, polea) sobre bandas o variantes sin carga: el catálogo llega ordenado y el desempate no debe depender del orden.
12. **Descansos del plan** (180/120/75 s) y estimación de 40 s por serie + 8 min de calentamiento para que la sesión quepa en el tiempo disponible; si no cabe, el plan lo avisa en lugar de recortar en silencio.
13. **Progresión doble con RIR.** Solo se sube peso con todas las series en el tope del rango al RIR objetivo. Los pesos se redondean a lo que de verdad puedes cargar con tus discos (kg o libras, comunes en Colombia).
14. **Récords en vivo** solo si ya hay historial del ejercicio (la primera vez es la línea base). Se celebra el más relevante: peso máximo → 1RM estimado → más reps con el mismo peso.
15. **Calentamiento sugerido** (barra, ~50/70/85 %) como chips que se registran con un toque y no cuentan para la progresión.
16. **Temporizador basado en la hora de fin**, guardado en `localStorage`: sobrevive a recargas y a la pantalla bloqueada. Se mantiene la pantalla encendida durante la sesión (Wake Lock).

## Check-in

17. **Prioridades fijas** (seguridad → adherencia → fuerza → datos → ritmo → recomposición → estancamiento). La proteína nunca se recorta; los recortes salen de carbos (mínimo 100 g) y luego de grasa (mínimo 0,6 g/kg o 20 % de las kcal).
18. **Promedios semanales con al menos 2 pesajes**; el primer check-in espera 4 días de datos para no decidir con ruido.
19. **Aplicar crea objetivos nuevos con fecha** (historial versionado) y regenera los menús desde hoy; los días pasados conservan sus objetivos para que la adherencia histórica no cambie.

## Gráficas

20. **Paleta categórica validada** (banda de luminosidad, separación para daltonismo y contraste) en claro y oscuro. Las mediciones van como puntos y las tendencias como líneas; toda gráfica tiene tooltip y una tabla con los mismos datos. Más de 5 series (los 6 básicos) se muestran de a uno con selector, nunca con colores generados.

## Técnica

21. **React 19 + Vite + TypeScript estricto**, Tailwind 4 con shadcn/ui, React Router con rutas perezosas, Zustand para estado de UI, Zod para validar datos persistidos y respaldos.
22. **Arquitectura verificada por lint:** `src/domain` es puro (sin React, datos ni UI) y las pantallas acceden a los datos solo por `useRepositories()`.
23. **Tests:** 100 % de cobertura obligatoria en el dominio, tests de repositorios sobre IndexedDB simulada, tests de pantallas clave con Testing Library y prueba de punta a punta con Playwright (móvil y sin conexión) en CI.
24. **GitHub Pages:** `BASE_PATH` en la build, `404.html` como copia de `index.html` para rutas profundas y service worker con `navigateFallback`.
