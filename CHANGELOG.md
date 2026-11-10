# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
[Versionado Semántico](https://semver.org/lang/es/).

## [1.0.0] – 2026-11-10

### Agregado

- Inicio de sesión por rol con contraseñas resumidas (SHA-256 con sal), bloqueo tras
  3 intentos fallidos y cierre de sesión por inactividad.
- Dashboard con indicadores, alertas de vencimiento, órdenes recientes y actividad reciente.
- HU-01: registro y actualización de órdenes de trabajo con validación por campo.
- HU-02: consulta de órdenes con búsqueda, filtro por estado y detalle auditado.
- Reportes por caso, período, delito y dispositivos, con impresión o guardado en PDF.
- HU-03: gestión de usuarios (crear, modificar, activar/desactivar, eliminar).
- Bitácora de auditoría con filtros por texto y fecha.
- Diseño responsive, accesible (WCAG 2.1 AA) y estilos de impresión.
- Servidor de desarrollo en Node.js con cabeceras de seguridad.
- 38 pruebas unitarias, configuración de ESLint, Prettier y EditorConfig.
- Documentación: README, estándares de codificación, trazabilidad y guía de versionamiento.
