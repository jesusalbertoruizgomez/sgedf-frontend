/**
 * @file Enrutador de la aplicación de una sola página (SPA).
 * @description Asocia cada ruta del fragmento de la URL (#/ruta/parametro) con
 * una vista, verifica los permisos del rol activo antes de mostrarla (control de
 * acceso por rol) y construye el menú lateral correspondiente a cada actor.
 */
(function (SGEDF) {
  'use strict';

  const { Autenticacion, UI } = SGEDF;
  const esc = UI.esc;

  /** Ruta que se muestra por defecto. */
  const RUTA_INICIAL = 'dashboard';

  /**
   * @typedef {Object} DefinicionRuta
   * @property {string|Function} titulo Título de la pantalla (o función que lo calcula).
   * @property {string[]} roles Roles autorizados.
   * @property {{montar: Function}} vista Módulo de vista.
   * @property {Object<string,string>} [menu] Etiqueta del menú por rol (si aparece en él).
   * @property {string} [icono] Ícono del menú.
   * @property {string} [padre] Ruta del menú que se resalta (para rutas secundarias).
   */

  /** @type {Map<string, DefinicionRuta & {id: string}>} */
  const rutas = new Map();

  /**
   * Registra una ruta.
   * @param {string} id
   * @param {DefinicionRuta} definicion
   */
  function registrar(id, definicion) {
    rutas.set(id, { id, ...definicion });
  }

  /**
   * Interpreta el fragmento actual de la URL.
   * @returns {{id: string, parametro: string|null}}
   */
  function analizarFragmento() {
    const partes = window.location.hash.replace(/^#\/?/, '').split('/');
    let parametro = null;
    try {
      parametro = partes[1] ? decodeURIComponent(partes[1]) : null;
    } catch {
      parametro = null;
    }
    return { id: partes[0] || RUTA_INICIAL, parametro };
  }

  /**
   * Navega a una ruta. Si ya se está en ella, la vuelve a renderizar.
   * @param {string} id
   * @param {string} [parametro]
   */
  function navegar(id, parametro) {
    const destino = `#/${id}${parametro ? `/${encodeURIComponent(parametro)}` : ''}`;
    if (window.location.hash === destino) {
      resolver();
    } else {
      window.location.hash = destino;
    }
  }

  /** Construye el menú lateral con las rutas permitidas para el rol activo. */
  function construirMenu() {
    const rol = Autenticacion.rolActivo();
    const enlaces = [...rutas.values()]
      .filter((ruta) => ruta.menu && ruta.menu[rol])
      .map(
        (ruta) =>
          `<a class="menu-enlace" href="#/${ruta.id}" data-ruta="${ruta.id}">${UI.icono(ruta.icono)}<span>${esc(ruta.menu[rol])}</span></a>`
      )
      .join('');
    document.getElementById('menu-navegacion').innerHTML =
      `<p class="menu-seccion">Módulos</p>${enlaces}`;
  }

  /**
   * Resalta la opción del menú correspondiente a la ruta activa.
   * @param {{id: string, padre?: string}} ruta
   */
  function marcarMenuActivo(ruta) {
    const activa = ruta.padre || ruta.id;
    document.querySelectorAll('.menu-enlace').forEach((enlace) => {
      const esActiva = enlace.dataset.ruta === activa;
      enlace.classList.toggle('activo', esActiva);
      if (esActiva) {
        enlace.setAttribute('aria-current', 'page');
      } else {
        enlace.removeAttribute('aria-current');
      }
    });
  }

  /** Muestra la vista correspondiente al fragmento actual de la URL. */
  function resolver() {
    if (!SGEDF.App.sesionValida()) {
      return;
    }
    const { id, parametro } = analizarFragmento();
    const ruta = rutas.get(id);

    if (!ruta) {
      navegar(RUTA_INICIAL);
      return;
    }
    if (!Autenticacion.tienePermiso(ruta.roles)) {
      UI.notificar('No tiene permisos para acceder a este módulo con el rol actual.', 'error');
      navegar(RUTA_INICIAL);
      return;
    }

    UI.cerrarModal();
    const titulo = typeof ruta.titulo === 'function' ? ruta.titulo(parametro) : ruta.titulo;
    document.getElementById('titulo-pantalla').textContent = titulo;
    document.title = `${titulo} · SGEDF`;
    marcarMenuActivo(ruta);

    const contenido = document.getElementById('contenido');
    ruta.vista.montar(contenido, parametro);
    contenido.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    SGEDF.App.cerrarMenuMovil();
  }

  /** Comienza a escuchar los cambios de ruta. */
  function iniciar() {
    window.addEventListener('hashchange', resolver);
  }

  SGEDF.Enrutador = Object.freeze({ registrar, navegar, resolver, construirMenu, iniciar });
})((window.SGEDF = window.SGEDF || {}));
