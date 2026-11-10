# SGEDF – Componente front-end

**Sistema de Gestión de Evidencias Digitales Forenses** · Laboratorio de Informática Forense

Componente front-end del proyecto formativo SGEDF, desarrollado como evidencia
**GA7-220501096-AA4-EV03** del programa Tecnología en Análisis y Desarrollo de Software (ADSO) del SENA.

| Dato       | Valor                                   |
| ---------- | --------------------------------------- |
| Aprendiz   | Jesús Alberto Ruiz Gómez                |
| Ficha      | 3186703                                 |
| Instructor | Julio Cesar Velosa Castañeda            |
| Versión    | 1.0.0                                   |
| Tipo       | Aplicación web de una sola página (SPA) |

---

## 1. Módulos implementados

| Módulo                         | Artefacto de origen          | Actor (rol)            | Ruta                                                   |
| ------------------------------ | ---------------------------- | ---------------------- | ------------------------------------------------------ |
| Inicio de sesión por rol       | Caso de uso «Iniciar sesión» | Perito / Administrador | Pantalla inicial                                       |
| Dashboard                      | Prototipo                    | Perito / Administrador | `#/dashboard`                                          |
| Registro de órdenes de trabajo | **HU-01**                    | Perito                 | `#/registro`, `#/editar-orden/OT-…`                    |
| Consulta de órdenes y detalle  | **HU-02**                    | Perito / Administrador | `#/consulta`                                           |
| Generación de reportes (PDF)   | Prototipo                    | Perito / Administrador | `#/reportes`, `#/reportes/OT-…`                        |
| Gestión de usuarios            | **HU-03**                    | Administrador          | `#/usuarios`, `#/nuevo-usuario`, `#/editar-usuario/ID` |
| Bitácora de auditoría          | Prototipo                    | Administrador          | `#/auditoria`                                          |

La correspondencia detallada con historias de usuario, casos de uso y diagrama de clases
está en [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md).

## 2. Tecnologías

| Capa               | Tecnología                                                           |
| ------------------ | -------------------------------------------------------------------- |
| Estructura         | HTML5 semántico                                                      |
| Presentación       | CSS3 (variables, Grid, Flexbox, media queries, estilos de impresión) |
| Lógica             | JavaScript ES2022 sin frameworks, patrón módulo (IIFE) y clases      |
| Persistencia local | Web Storage API (`localStorage` / `sessionStorage`)                  |
| Herramientas       | Node.js ≥ 18, ESLint 9, Prettier 3, EditorConfig, `node:test`        |
| Versionamiento     | Git + GitHub (modelo de ramas GitFlow simplificado)                  |

El código no tiene dependencias en tiempo de ejecución: funciona abriendo `index.html`,
con el servidor de desarrollo incluido o publicado en un hosting estático (InfinityFree).

## 3. Estructura del proyecto

```
sgedf-frontend/
├── index.html                  Esqueleto de la SPA (login, menú, modal, notificaciones)
├── assets/img/                 Escudo del laboratorio y favicon
├── css/
│   ├── variables.css           Paleta institucional y tokens de diseño
│   ├── base.css                Reinicio, tipografía y accesibilidad
│   ├── layout.css              Estructura responsive (mobile-first)
│   ├── componentes.css         Botones, tablas, formularios, modal, reporte…
│   └── impresion.css           Estilos para imprimir / guardar como PDF
├── js/
│   ├── config.js               Constantes y catálogos del sistema
│   ├── utilidades/             SHA-256, formato de datos y validadores
│   ├── modelos/                Clases de dominio (Usuario, OrdenTrabajo, RegistroAuditoria)
│   ├── servicios/              Lógica de negocio y persistencia
│   ├── vistas/                 Componentes de interfaz y pantallas
│   ├── enrutador.js            Rutas por rol (control de acceso)
│   └── app.js                  Punto de entrada
├── pruebas/                    Pruebas unitarias (node:test)
├── docs/                       Estándares, trazabilidad y guía de versionamiento
├── servidor.js                 Servidor HTTP estático de desarrollo (sin dependencias)
├── eslint.config.js · .prettierrc.json · .editorconfig
└── package.json
```

### Arquitectura en capas

```
Vistas (js/vistas)  ──►  Servicios (js/servicios)  ──►  Modelos (js/modelos)
        ▲                        │                            │
   Enrutador / App               ▼                            ▼
                         Almacenamiento (Web Storage)   Utilidades / Config
```

Las vistas no acceden directamente al almacenamiento: todo pasa por los servicios. Así,
al integrar el componente back-end (API REST + MySQL) solo se reemplaza
`js/servicios/almacenamiento.js` y las llamadas de los servicios.

## 4. Ejecución

**Opción A — sin instalación:** abrir `index.html` en Chrome, Edge o Firefox.

**Opción B — servidor de desarrollo (recomendado):**

```bash
npm install        # instala las herramientas de calidad (ESLint, Prettier)
npm start          # http://localhost:3000
```

**Opción C — hosting:** subir `index.html`, `assets/`, `css/` y `js/` a la carpeta pública
(`htdocs`) del servidor.

### Credenciales de demostración

Al abrir la aplicación por primera vez se cargan datos ficticios de prueba:

| Usuario (cédula) | Contraseña    | Roles                  | Órdenes asignadas |
| ---------------- | ------------- | ---------------------- | ----------------- |
| `1100503738`     | `Forense2026` | Perito y Administrador | 2                 |
| `1085123456`     | `Perito2026`  | Perito                 | 1                 |

También se puede ingresar con el correo registrado. Para reiniciar los datos, borre los
datos del sitio en el navegador (Herramientas de desarrollo → Aplicación → Almacenamiento).

## 5. Scripts

| Comando             | Acción                                             |
| ------------------- | -------------------------------------------------- |
| `npm start`         | Inicia el servidor de desarrollo en el puerto 3000 |
| `npm test`          | Ejecuta las 38 pruebas unitarias                   |
| `npm run lint`      | Analiza el código con ESLint                       |
| `npm run format`    | Aplica el formato de Prettier                      |
| `npm run verificar` | Lint + verificación de formato + pruebas           |

## 6. Controles de seguridad implementados

- Contraseñas almacenadas como resumen **SHA-256 con sal** aleatoria; nunca en texto plano.
- Política de contraseñas: mínimo 8 caracteres con mayúscula, minúscula y número.
- **Bloqueo temporal** (5 min) tras 3 intentos fallidos y mensaje de error genérico.
- **Cierre de sesión por inactividad** a los 15 minutos.
- **Control de acceso por rol** en el menú, en el enrutador y en cada servicio.
- El perito solo consulta y modifica sus propias órdenes; el administrador consulta en modo lectura.
- **Bitácora de auditoría** de ingresos, fallos, bloqueos, consultas de detalle, reportes y cambios.
- Escape de todo dato mostrado (prevención de **XSS**) y ausencia de manejadores en línea.
- Servidor de desarrollo con cabeceras **CSP**, `X-Frame-Options` y protección contra _path traversal_.

> La validación en el cliente mejora la experiencia de uso, pero no sustituye la validación
> del servidor: el componente back-end deberá repetir estas verificaciones.

## 7. Accesibilidad (WCAG 2.1 AA)

Etiquetas asociadas a cada campo, mensajes de error enlazados con `aria-describedby`,
regiones `aria-live`, enlace «Saltar al contenido», foco visible, modal con foco atrapado y
cierre con Escape, contraste de color AA y respeto de `prefers-reduced-motion`.

## 8. Versionamiento

El proyecto se versiona con Git siguiendo **Conventional Commits** y ramas
`main` / `develop` / `feature/*`. La versión entregada está etiquetada como `v1.0.0`.
Ver [`docs/GUIA_VERSIONAMIENTO.md`](docs/GUIA_VERSIONAMIENTO.md).
