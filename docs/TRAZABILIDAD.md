# Trazabilidad con los artefactos del ciclo de software

Relación entre los artefactos elaborados en las fases anteriores del proyecto SGEDF
(historias de usuario, casos de uso, diagrama de clases, modelo de datos y prototipo) y el
código del componente front-end.

## 1. Historias de usuario

### HU-01 · Registrar orden de trabajo (Perito)

| Criterio implementado                                                                                                                                  | Archivo                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| Formulario con las secciones del prototipo: orden de trabajo, orden de policía judicial, solicitud FPJ-12, dispositivos, herramientas e informe FPJ-13 | `js/vistas/vista-registro-orden.js`         |
| Campos obligatorios señalados y validados junto a cada campo                                                                                           | `js/modelos/orden-trabajo.js` → `validar()` |
| Número de OT con formato `OT-AAAA-NNN` y único                                                                                                         | `js/servicios/ordenes.js` → `crear()`       |
| NUNC de 21 dígitos                                                                                                                                     | `js/utilidades/validadores.js`              |
| Fecha de vencimiento calculada (inicio + plazo)                                                                                                        | `OrdenTrabajo.calcularFechaVencimiento()`   |
| Al menos un dispositivo y una herramienta forense                                                                                                      | `OrdenTrabajo.validar()`                    |
| Coherencia de fechas (vigencia, informe y reclamación)                                                                                                 | `OrdenTrabajo.validar()`                    |
| Estado «Resuelta» solo con informe FPJ-13 registrado                                                                                                   | `OrdenTrabajo.validar()`                    |
| La orden queda asignada al perito de la sesión                                                                                                         | `Ordenes.crear()`                           |
| Actualización posterior (estado, informe y entrega)                                                                                                    | `Ordenes.actualizar()`                      |

### HU-02 · Consultar órdenes de trabajo (Perito / Administrador)

| Criterio implementado                                        | Archivo                                           |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Búsqueda por número de OT, NUNC o delito y filtro por estado | `js/vistas/vista-consulta.js`, `Ordenes.buscar()` |
| El perito solo ve las órdenes asignadas a él                 | `Ordenes.listarVisibles()`                        |
| El administrador ve todas las órdenes en modo lectura        | `Ordenes.puedeEditar()`                           |
| Detalle completo de la orden con acceso auditado             | `js/vistas/vista-detalle-orden.js`                |
| Alertas de órdenes vencidas o próximas a vencer              | `OrdenTrabajo.situacionVencimiento()`             |

### HU-03 · Gestionar usuarios (Administrador)

| Criterio implementado                                                      | Archivo                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Crear, modificar, activar/desactivar y eliminar cuentas                    | `js/vistas/vista-usuarios.js`, `js/servicios/usuarios.js` |
| Identificación y correo únicos; uno o varios roles por usuario             | `Usuario.validar()`, `Usuarios.crear()`                   |
| Política de contraseñas y confirmación                                     | `Validadores.esContrasenaSegura()`                        |
| No eliminarse ni desactivarse a sí mismo; al menos un administrador activo | `Usuarios.eliminar()`, `Usuarios.cambiarEstado()`         |
| No eliminar peritos con órdenes asignadas (integridad referencial)         | `Usuarios.eliminar()`                                     |

## 2. Casos de uso por actor

| Caso de uso                 | Perito | Administrador | Implementación                                        |
| --------------------------- | :----: | :-----------: | ----------------------------------------------------- |
| Iniciar / cerrar sesión     |   ✓    |       ✓       | `servicios/autenticacion.js`, `vistas/vista-login.js` |
| Consultar tablero           |   ✓    |       ✓       | `vistas/vista-dashboard.js`                           |
| Registrar orden de trabajo  |   ✓    |               | `vistas/vista-registro-orden.js`                      |
| Actualizar orden de trabajo |   ✓    |               | `vistas/vista-registro-orden.js`                      |
| Consultar órdenes           |   ✓    |       ✓       | `vistas/vista-consulta.js`                            |
| Generar reportes PDF        |   ✓    |       ✓       | `servicios/reportes.js`, `vistas/vista-reportes.js`   |
| Gestionar usuarios          |        |       ✓       | `vistas/vista-usuarios.js`                            |
| Consultar bitácora          |        |       ✓       | `vistas/vista-auditoria.js`                           |

El control de acceso se aplica en tres niveles: menú por rol (`enrutador.js`), verificación
de permisos de cada ruta (`Autenticacion.tienePermiso`) y verificación en cada servicio.

## 3. Diagrama de clases y modelo de datos

| Clase / módulo front-end         | Elemento del modelo                                 | Archivo                            |
| -------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `Usuario`                        | Usuario y rol                                       | `js/modelos/usuario.js`            |
| `OrdenTrabajo`                   | Tabla central `orden_trabajo`                       | `js/modelos/orden-trabajo.js`      |
| `OrdenTrabajo.policiaJudicial`   | Orden de policía judicial (NUNC, delito, autoridad) | `js/modelos/orden-trabajo.js`      |
| `OrdenTrabajo.solicitudAnalisis` | Solicitud de análisis FPJ-12                        | `js/modelos/orden-trabajo.js`      |
| `OrdenTrabajo.dispositivos`      | Dispositivos de almacenamiento digital (EMP/EF)     | `js/modelos/orden-trabajo.js`      |
| `OrdenTrabajo.herramientas`      | Herramientas forenses empleadas                     | `js/modelos/orden-trabajo.js`      |
| `OrdenTrabajo.informe`           | Informe de investigador de laboratorio FPJ-13       | `js/modelos/orden-trabajo.js`      |
| `RegistroAuditoria`              | Bitácora de accesos y operaciones                   | `js/modelos/registro-auditoria.js` |

El método `aObjetoPlano()` de cada clase produce el JSON que se enviará a la API REST del
componente back-end para persistirlo en las tablas MySQL correspondientes.

## 4. Prototipo → código

Mejoras aplicadas al pasar del prototipo HTML a la codificación del módulo:

| Prototipo                                                     | Componente codificado                                        |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| Usuario y contraseña fijos en el código JavaScript            | Usuarios persistidos con contraseña resumida (SHA-256 + sal) |
| Rol elegido libremente al ingresar                            | Se verifica que el rol esté asignado a la cuenta             |
| Un solo archivo HTML con CSS y JS embebidos                   | Proyecto modular: 5 hojas de estilo y 25 módulos JavaScript  |
| Manejadores `onclick` en el HTML                              | `addEventListener` y delegación de eventos                   |
| Tablas y métricas estáticas                                   | Datos dinámicos calculados desde los servicios               |
| Botones «Guardar», «Buscar» y «Generar PDF» sin funcionalidad | Registro, búsqueda y reportes funcionales con validación     |
| Selector múltiple de herramientas                             | Casillas de verificación accesibles                          |
| Variable CSS no definida (`--gray-600`) y reglas duplicadas   | Variables centralizadas y sin duplicados                     |
| Diseño de escritorio                                          | Diseño responsive mobile-first con menú desplegable          |
