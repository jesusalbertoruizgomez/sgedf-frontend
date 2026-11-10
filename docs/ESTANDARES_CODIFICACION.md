# Estándares de codificación – SGEDF front-end

Este documento define las convenciones aplicadas en el código y la forma de verificarlas.

## 1. Formato general

| Aspecto           | Regla                                         | Herramienta  |
| ----------------- | --------------------------------------------- | ------------ |
| Codificación      | UTF-8, fin de línea LF, línea final vacía     | EditorConfig |
| Indentación       | 2 espacios, sin tabulaciones                  | EditorConfig |
| Longitud de línea | Máximo 100 caracteres                         | Prettier     |
| Comillas (JS)     | Simples; plantillas literales para interpolar | Prettier     |
| Punto y coma      | Obligatorio                                   | Prettier     |
| Comas finales     | En objetos y arreglos multilínea              | Prettier     |

## 2. Convenciones de nombres

Los identificadores se escriben en **español**, coherentes con el dominio forense y con el
modelo de datos del proyecto.

| Elemento                         | Convención             | Ejemplo                                   |
| -------------------------------- | ---------------------- | ----------------------------------------- |
| Variables y funciones            | camelCase              | `fechaVencimiento`, `calcularMetricas()`  |
| Clases                           | PascalCase             | `OrdenTrabajo`, `RegistroAuditoria`       |
| Constantes y catálogos           | MAYÚSCULAS_CON_GUION   | `MAX_INTENTOS_FALLIDOS`, `ESTADOS_ORDEN`  |
| Funciones booleanas              | Prefijo es/tiene/puede | `esNunc()`, `tieneRol()`, `puedeEditar()` |
| Archivos JS y CSS                | kebab-case             | `orden-trabajo.js`, `componentes.css`     |
| Clases CSS                       | kebab-case             | `.tarjeta-titulo`, `.btn-primario`        |
| Identificadores HTML             | kebab-case             | `#form-orden`, `#menu-navegacion`         |
| Módulos en el espacio de nombres | PascalCase             | `SGEDF.Ordenes`, `SGEDF.VistaConsulta`    |

## 3. JavaScript

1. Cada archivo es un módulo autocontenido (patrón IIFE) con `'use strict'` que registra su
   API pública congelada (`Object.freeze`) en el espacio de nombres `window.SGEDF`.
2. Separación por capas: **utilidades → modelos → servicios → vistas**. Una capa solo usa
   las capas inferiores; las vistas nunca leen el almacenamiento directamente.
3. `const` por defecto y `let` solo cuando el valor cambia; `var` está prohibido.
4. Comparaciones estrictas (`===`), llaves obligatorias en todo bloque `if`/`for`.
5. Sin `eval`, `new Function`, `alert` ni manejadores en línea (`onclick`) en el HTML.
6. Todo dato insertado en plantillas HTML pasa por `escaparHtml()` (prevención de XSS).
7. Los servicios devuelven objetos de resultado `{ exito, mensaje, errores }` en lugar de
   lanzar excepciones por errores de validación.
8. Los eventos se registran sobre el elemento raíz de cada vista (delegación) para evitar
   la acumulación de oyentes al navegar.

## 4. Comentarios y documentación

- Encabezado `@file` / `@description` en cada archivo explicando su responsabilidad.
- **JSDoc** en toda función y clase pública: descripción, `@param`, `@returns`, `@typedef`.
- Comentarios en línea solo para explicar el _porqué_ de una decisión, no el _qué_.
- En CSS, bloques de comentario por sección y por componente.

## 5. HTML y CSS

- HTML semántico: `main`, `aside`, `nav`, `header`, `section`, `table` con `caption` y `scope`.
- Cada control de formulario tiene `label` asociado; los grupos usan `fieldset` y `legend`.
- Sin estilos en línea: compatibilidad con la política de seguridad de contenidos (CSP).
- Colores, espacios y radios definidos como variables en `css/variables.css`.
- Diseño _mobile-first_: estilos base para móviles y `@media (min-width: …)` para pantallas grandes.

## 6. Control de versiones

- Mensajes según **Conventional Commits**: `tipo(alcance): descripción en imperativo`.
  Tipos usados: `feat`, `fix`, `style`, `refactor`, `test`, `docs`, `chore`.
- Ramas: `main` (versiones estables), `develop` (integración), `feature/<módulo>` (desarrollo).
- Integración con `merge --no-ff` para conservar la historia de cada funcionalidad.
- No se versionan dependencias (`node_modules/`), credenciales ni empaquetados (`.gitignore`).

## 7. Verificación

```bash
npm run lint           # ESLint: 0 errores, 0 advertencias
npm run format:check   # Prettier: todos los archivos con el formato acordado
npm test               # 38 pruebas unitarias aprobadas
npm run verificar      # Las tres verificaciones en un solo paso
```
