/**
 * @file Punto de entrada de la aplicación.
 * @description Inicializa los datos, registra las rutas por rol (casos de uso de
 * cada actor), controla la transición entre la pantalla de ingreso y la
 * aplicación, el menú en dispositivos móviles y el cierre por inactividad.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Autenticacion, Enrutador, DatosSemilla, UI, VistaLogin } = SGEDF;
  const { ROLES } = Config;
  const TODOS_LOS_ROLES = [ROLES.PERITO, ROLES.ADMIN];

  /** Cada cuánto se verifica la inactividad de la sesión. */
  const MS_VERIFICACION_INACTIVIDAD = 30 * 1000;

  /** Eventos que cuentan como actividad del usuario. */
  const EVENTOS_ACTIVIDAD = ['click', 'keydown', 'scroll', 'touchstart'];

  let temporizadorInactividad = null;

  /** Referencias a elementos de la estructura principal. */
  const elementos = {};

  /** Registra las rutas de la aplicación y los roles autorizados para cada una. */
  function registrarRutas() {
    Enrutador.registrar('dashboard', {
      titulo: 'Dashboard',
      roles: TODOS_LOS_ROLES,
      vista: SGEDF.VistaDashboard,
      icono: 'dashboard',
      menu: { [ROLES.PERITO]: 'Dashboard', [ROLES.ADMIN]: 'Dashboard' },
    });
    Enrutador.registrar('registro', {
      titulo: 'Registrar nueva orden de trabajo',
      roles: [ROLES.PERITO],
      vista: SGEDF.VistaRegistroOrden,
      icono: 'registro',
      menu: { [ROLES.PERITO]: 'Registrar orden' },
    });
    Enrutador.registrar('consulta', {
      titulo: 'Consulta de órdenes de trabajo',
      roles: TODOS_LOS_ROLES,
      vista: SGEDF.VistaConsulta,
      icono: 'consulta',
      menu: { [ROLES.PERITO]: 'Consultar órdenes', [ROLES.ADMIN]: 'Todas las órdenes' },
    });
    Enrutador.registrar('reportes', {
      titulo: 'Generación de reportes',
      roles: TODOS_LOS_ROLES,
      vista: SGEDF.VistaReportes,
      icono: 'reportes',
      menu: { [ROLES.PERITO]: 'Generar reportes', [ROLES.ADMIN]: 'Generar reportes' },
    });
    Enrutador.registrar('usuarios', {
      titulo: 'Gestión de usuarios',
      roles: [ROLES.ADMIN],
      vista: SGEDF.VistaUsuarios,
      icono: 'usuarios',
      menu: { [ROLES.ADMIN]: 'Gestión de usuarios' },
    });
    Enrutador.registrar('auditoria', {
      titulo: 'Bitácora de auditoría',
      roles: [ROLES.ADMIN],
      vista: SGEDF.VistaAuditoria,
      icono: 'auditoria',
      menu: { [ROLES.ADMIN]: 'Auditoría / bitácora' },
    });

    // Rutas secundarias (no aparecen en el menú)
    Enrutador.registrar('editar-orden', {
      titulo: (numero) => `Actualizar orden de trabajo ${numero || ''}`.trim(),
      roles: [ROLES.PERITO],
      vista: SGEDF.VistaRegistroOrden,
      padre: 'consulta',
    });
    Enrutador.registrar('nuevo-usuario', {
      titulo: 'Crear nuevo usuario',
      roles: [ROLES.ADMIN],
      vista: SGEDF.VistaFormularioUsuario,
      padre: 'usuarios',
    });
    Enrutador.registrar('editar-usuario', {
      titulo: 'Modificar usuario',
      roles: [ROLES.ADMIN],
      vista: SGEDF.VistaFormularioUsuario,
      padre: 'usuarios',
    });
  }

  /* ------------------------------------------------------------------------
   * Menú en dispositivos móviles
   * ---------------------------------------------------------------------- */

  /** Abre el menú lateral superpuesto. */
  function abrirMenuMovil() {
    elementos.barraLateral.classList.add('abierta');
    elementos.capaMenu.hidden = false;
    elementos.botonMenu.setAttribute('aria-expanded', 'true');
    elementos.botonMenu.setAttribute('aria-label', 'Cerrar menú');
    const primerEnlace = elementos.barraLateral.querySelector('.menu-enlace');
    if (primerEnlace) {
      primerEnlace.focus();
    }
  }

  /** Cierra el menú lateral superpuesto. */
  function cerrarMenuMovil() {
    if (!elementos.barraLateral.classList.contains('abierta')) {
      return;
    }
    elementos.barraLateral.classList.remove('abierta');
    elementos.capaMenu.hidden = true;
    elementos.botonMenu.setAttribute('aria-expanded', 'false');
    elementos.botonMenu.setAttribute('aria-label', 'Abrir menú');
  }

  /* ------------------------------------------------------------------------
   * Control de sesión
   * ---------------------------------------------------------------------- */

  /** Inicia la verificación periódica de inactividad. */
  function iniciarControlInactividad() {
    detenerControlInactividad();
    temporizadorInactividad = window.setInterval(() => {
      if (Autenticacion.obtenerSesion() && Autenticacion.sesionExpirada()) {
        cerrarSesion('inactividad');
      }
    }, MS_VERIFICACION_INACTIVIDAD);
  }

  /** Detiene la verificación de inactividad. */
  function detenerControlInactividad() {
    if (temporizadorInactividad) {
      window.clearInterval(temporizadorInactividad);
      temporizadorInactividad = null;
    }
  }

  /**
   * Muestra la pantalla de ingreso y limpia la interfaz de la aplicación.
   * @param {string} [mensaje='']
   */
  function mostrarLogin(mensaje = '') {
    detenerControlInactividad();
    UI.cerrarModal();
    UI.limpiarNotificaciones();
    cerrarMenuMovil();
    elementos.aplicacion.hidden = true;
    elementos.contenido.innerHTML = '';
    // Se elimina la ruta de la URL para no exponer pantallas internas.
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    VistaLogin.mostrar(mensaje);
  }

  /**
   * Cierra la sesión y vuelve a la pantalla de ingreso.
   * @param {'manual'|'inactividad'} [motivo='manual']
   */
  function cerrarSesion(motivo = 'manual') {
    Autenticacion.cerrarSesion(motivo);
    mostrarLogin(
      motivo === 'inactividad' ? 'Su sesión se cerró por inactividad. Ingrese nuevamente.' : ''
    );
  }

  /**
   * Verifica que exista una sesión vigente; de lo contrario redirige al ingreso.
   * @returns {boolean}
   */
  function sesionValida() {
    if (!Autenticacion.obtenerSesion()) {
      mostrarLogin();
      return false;
    }
    if (Autenticacion.sesionExpirada()) {
      cerrarSesion('inactividad');
      return false;
    }
    if (!Autenticacion.usuarioActual()) {
      Autenticacion.cerrarSesion();
      mostrarLogin('Su cuenta no está disponible. Contacte al Responsable del Laboratorio.');
      return false;
    }
    return true;
  }

  /** Muestra la aplicación para el usuario autenticado. */
  function mostrarAplicacion() {
    const usuario = Autenticacion.usuarioActual();
    const rol = Autenticacion.rolActivo();
    const esAdmin = rol === ROLES.ADMIN;

    VistaLogin.ocultar();
    elementos.aplicacion.hidden = false;
    document.getElementById('usuario-nombre').textContent = usuario.nombreCompleto;
    document.getElementById('usuario-rol').textContent = Config.NOMBRES_ROL[rol];
    const insignia = document.getElementById('insignia-rol');
    insignia.textContent = esAdmin ? 'Administrador' : 'Perito';
    insignia.className = `insignia ${esAdmin ? 'insignia-dorada' : 'insignia-azul'}`;
    document.getElementById('version-sistema').textContent =
      `v${Config.VERSION} · ${new Date().getFullYear()}`;

    Enrutador.construirMenu();
    iniciarControlInactividad();
    if (window.location.hash) {
      Enrutador.resolver();
    } else {
      Enrutador.navegar('dashboard');
    }
  }

  /** Registra los eventos de la estructura principal. */
  function registrarEventos() {
    document.getElementById('btn-cerrar-sesion').addEventListener('click', () => cerrarSesion());
    elementos.botonMenu.addEventListener('click', () => {
      if (elementos.barraLateral.classList.contains('abierta')) {
        cerrarMenuMovil();
      } else {
        abrirMenuMovil();
      }
    });
    elementos.capaMenu.addEventListener('click', cerrarMenuMovil);
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        cerrarMenuMovil();
      }
    });
    EVENTOS_ACTIVIDAD.forEach((nombreEvento) => {
      window.addEventListener(nombreEvento, () => Autenticacion.registrarActividad(), {
        passive: true,
        capture: true,
      });
    });
  }

  /** Arranque de la aplicación. */
  function iniciar() {
    elementos.aplicacion = document.getElementById('aplicacion');
    elementos.contenido = document.getElementById('contenido');
    elementos.barraLateral = document.getElementById('barra-lateral');
    elementos.capaMenu = document.getElementById('capa-menu');
    elementos.botonMenu = document.getElementById('btn-menu');

    try {
      DatosSemilla.inicializar();
    } catch (error) {
      console.error('SGEDF: no fue posible cargar los datos iniciales.', error);
    }

    UI.inicializar();
    registrarRutas();
    Enrutador.iniciar();
    VistaLogin.inicializar({ alIngresar: mostrarAplicacion });
    registrarEventos();

    if (
      Autenticacion.obtenerSesion() &&
      !Autenticacion.sesionExpirada() &&
      Autenticacion.usuarioActual()
    ) {
      mostrarAplicacion();
    } else if (Autenticacion.obtenerSesion()) {
      cerrarSesion('inactividad');
    } else {
      mostrarLogin();
    }
  }

  SGEDF.App = Object.freeze({
    mostrarAplicacion,
    mostrarLogin,
    cerrarSesion,
    cerrarMenuMovil,
    sesionValida,
  });

  document.addEventListener('DOMContentLoaded', iniciar);
})((window.SGEDF = window.SGEDF || {}));
