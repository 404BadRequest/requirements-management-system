# Normas gráficas — Requirements Management System

Documento de referencia para mantener una interfaz **coherente, tranquila y digna de confianza**, alineada con el uso prolongado en entorno corporativo.

---

## 1. Principios de experiencia (UX)

| Principio | Significado en esta aplicación |
|-----------|-------------------------------|
| **Claridad** | Jerarquía visual explícita: títulos de página → secciones → datos. Sin adornos que compitan con la información operativa. |
| **Confianza** | Paleta sobria; feedback predecible en botones y tablas; errores y estados vacíos explicados en lenguaje humano. |
| **Calma** | Colores fríos y saturación contenida; espaciado generoso en modo “cómodo”; animaciones breves en gráficos (Apache ECharts). |
| **Consistencia** | Mismos patrones en filtros (`field-control`, `surface-card`), tablas (`DataTable`) y cabeceras de página. |

---

## 2. Paleta de color (confianza y tranquilidad)

Los valores viven en `src/app/globals.css` como variables HSL **sin** la función `hsl()` en el token (compatible con Tailwind `hsl(var(--primary))`).

### Modo claro

- **Fondo (`--background`)**: azul grisáceo muy suave — reduce fatiga frente a blanco puro.
- **Texto (`--foreground`)**: carbón azulado, evita negro absoluto.
- **Primario (`--primary`)**: azul acero (`≈201°`) — asociación tradicional a fiabilidad y servicios profesionales.
- **Superficies (`--card`, `--muted`)**: blanco y grises con matiz frío para sensación ordenada.
- **Énfasis**: `--accent` apenas más marcado que el fondo para hover y filas de tabla.

### Modo oscuro

- Fondos profundos con matiz **slate** (no negro puro).
- Primario más luminoso para contraste sin estridencia.
- Bordes sutiles para separar sin “rejilla agresiva”.

### Gráficos (`--chart-1` … `--chart-5`)

Gama **coherente** azul → verde agua → sage: útil para dashboards ejecutivos sin “arco iris” distractor. Los hex en `src/lib/charts/echarts-options.ts` están alineados con estos tokens.

---

## 3. Tipografía

- **Familia**: **DM Sans** (Google Fonts vía `next/font`) como `--font-app`: legible en pantalla, neutra y actual sin ser informal en exceso.
- **Cuerpo**: peso regular; títulos de tarjeta y KPIs en semibold.
- **Datos tabulares**: preferir `tabular-nums` en importes y duraciones (ya aplicado en tablas de facturación y horas).

---

## 4. Layout y densidad

- **`html[data-density="comfortable"]`** (por defecto): más aire entre bloques; padding de página definido por tokens `--density-*`.
- **`compact`**: reduce paddings de tablas y cabeceras — mismo sistema visual, más filas visibles.

---

## 5. Componentes clave

### Tablas (`DataTable`)

- Basadas en **TanStack Table v8**: ordenación por cabecera, búsqueda global, paginación y cabecera fija dentro del shell con scroll.
- **Uso obligatorio** en nuevos listados tabulares; migrar tablas “sueltas” cuando se toquen.
- Columnas de importes: `meta: { align: "right" }` para alineación consistente.

### Gráficos

- **Apache ECharts** (`echarts` + `echarts-for-react`): motor ampliamente adoptado en analítica corporativa; render SVG por defecto en tarjetas del dashboard para nitidez.
- Tarjetas envueltas en `surface-card` con altura fija para evitar saltos de layout.

### Formularios y filtros

- Inputs y selects: clase `field-control`.
- Acciones principales: `btn-primary`; secundarias: `btn-secondary`; navegación suave: `btn-quiet`.

---

## 6. Accesibilidad (mínimos)

- Contraste texto/fondo revisado en primario y estados `muted`.
- Tablas: `scope="col"`, `aria-sort` en cabeceras ordenables, texto oculto para `caption` cuando aplica.
- Búsqueda en tabla con `aria-label` explícito.

---

## 7. Evolución del sistema

Al añadir pantallas nuevas: reutilizar tokens CSS antes de introducir colores sueltos; si se amplía la paleta, actualizar **este documento** y `globals.css` en el mismo cambio.
