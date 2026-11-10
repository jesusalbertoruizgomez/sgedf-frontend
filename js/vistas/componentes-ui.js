/**
 * @file Componentes de interfaz reutilizables.
 * @description Funciones de presentación compartidas por todas las vistas:
 * íconos, notificaciones, ventana modal accesible, confirmaciones, insignias y
 * utilidades de formularios (generación de campos, lectura y errores).
 *
 * Regla de seguridad: todo texto proveniente de datos se escapa con `esc()` antes
 * de insertarse en una plantilla HTML.
 */
(function (SGEDF) {
  'use strict';

  const { Formato } = SGEDF;
  const esc = Formato.escaparHtml;

  /** Trazos SVG de los íconos usados en la interfaz (estilo de línea, 24×24). */
  const ICONOS = Object.freeze({
    dashboard:
      '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    registro: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    consulta: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    reportes:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    usuarios:
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    auditoria:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    guardar:
      '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    imprimir:
      '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  });

  /**
   * Devuelve el marcado SVG de un ícono decorativo (oculto a lectores de pantalla).
   * @param {string} nombre Clave de ICONOS.
   * @returns {string}
   */
  function icono(nombre) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS[nombre] || ''}</svg>`;
  }

  /* ------------------------------------------------------------------------
   * Notificaciones emergentes
   * ---------------------------------------------------------------------- */

  /** Cantidad máxima de notificaciones visibles simultáneamente. */
  const MAX_NOTIFICACIONES = 3;

  /**
   * Muestra un mensaje temporal en la esquina inferior de la pantalla.
   * @param {string} mensaje
   * @param {'exito'|'error'|'info'} [tipo='exito']
   * @param {number} [duracionMs=4500]
   */
  function notificar(mensaje, tipo = 'exito', duracionMs = 4500) {
    const contenedor = document.getElementById('notificaciones');
    const elemento = document.createElement('div');
    elemento.className = `notificacion notificacion-${tipo}`;
    elemento.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    elemento.textContent = mensaje;
    contenedor.appendChild(elemento);
    // Solo se conservan las notificaciones más recientes para no cubrir el contenido.
    while (contenedor.children.length > MAX_NOTIFICACIONES) {
      contenedor.firstElementChild.remove();
    }
    window.setTimeout(() => elemento.remove(), duracionMs);
  }

  /** Retira todas las notificaciones visibles (p. ej. al cerrar sesión). */
  function limpiarNotificaciones() {
    document.getElementById('notificaciones').innerHTML = '';
  }

  /* ------------------------------------------------------------------------
   * Ventana modal accesible (foco atrapado, cierre con Escape)
   * ---------------------------------------------------------------------- */

  /** Selector de elementos que pueden recibir el foco con el teclado. */
  const SELECTOR_ENFOCABLES =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Estado interno de la modal abierta. */
  const estadoModal = { elementoPrevio: null, alCerrar: null };

  /**
   * @typedef {Object} AccionModal
   * @property {string} texto Texto del botón.
   * @property {string} [clase] Clase adicional (btn-primario, btn-peligro).
   * @property {string} [icono] Clave de ícono.
   * @property {Function} [alPulsar] Función ejecutada al pulsar.
   * @property {boolean} [cerrar=true] Si la modal se cierra tras pulsar.
   */

  /**
   * Abre la ventana modal.
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} [opciones.subtitulo]
   * @param {string} [opciones.cuerpoHtml] Marcado ya escapado por quien llama.
   * @param {AccionModal[]} [opciones.acciones]
   * @param {boolean} [opciones.pequena=false] Ancho reducido (confirmaciones).
   * @param {Function} [opciones.alCerrar] Se ejecuta al cerrar por cualquier medio.
   */
  function abrirModal({
    titulo,
    subtitulo = '',
    cuerpoHtml = '',
    acciones = [],
    pequena = false,
    alCerrar = null,
  }) {
    const capa = document.getElementById('modal-capa');
    const modal = document.getElementById('modal');
    const contenedorAcciones = document.getElementById('modal-acciones');

    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-subtitulo').textContent = subtitulo;
    document.getElementById('modal-cuerpo').innerHTML = cuerpoHtml;
    modal.classList.toggle('modal-pequeno', pequena);

    contenedorAcciones.innerHTML = '';
    acciones.forEach((accion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `btn ${accion.clase || ''}`.trim();
      boton.innerHTML = `${accion.icono ? icono(accion.icono) : ''}${esc(accion.texto)}`;
      boton.addEventListener('click', () => {
        if (typeof accion.alPulsar === 'function') {
          accion.alPulsar();
        }
        if (accion.cerrar !== false) {
          cerrarModal();
        }
      });
      contenedorAcciones.appendChild(boton);
    });

    estadoModal.elementoPrevio = document.activeElement;
    estadoModal.alCerrar = alCerrar;
    capa.hidden = false;
    modal.scrollTop = 0;
    // En confirmaciones se enfoca la primera acción (Cancelar, opción segura); en las
    // demás, el botón de cierre superior para que la lectura empiece desde el inicio.
    const primerEnfocable = pequena
      ? contenedorAcciones.querySelector('button')
      : modal.querySelector('[data-cerrar-modal]');
    if (primerEnfocable) {
      primerEnfocable.focus();
    }
  }

  /** Cierra la ventana modal y devuelve el foco al elemento que la abrió. */
  function cerrarModal() {
    const capa = document.getElementById('modal-capa');
    if (capa.hidden) {
      return;
    }
    capa.hidden = true;
    document.getElementById('modal-cuerpo').innerHTML = '';
    document.getElementById('modal-acciones').innerHTML = '';

    const { elementoPrevio, alCerrar } = estadoModal;
    estadoModal.elementoPrevio = null;
    estadoModal.alCerrar = null;
    if (elementoPrevio && document.contains(elementoPrevio)) {
      elementoPrevio.focus();
    }
    if (typeof alCerrar === 'function') {
      alCerrar();
    }
  }

  /**
   * Mantiene el foco dentro de la modal al usar Tab / Shift+Tab (WCAG 2.4.3).
   * @param {KeyboardEvent} evento
   */
  function atraparFoco(evento) {
    const enfocables = [...document.getElementById('modal').querySelectorAll(SELECTOR_ENFOCABLES)];
    if (enfocables.length === 0) {
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  /**
   * Solicita confirmación al usuario mediante la modal.
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} opciones.mensaje
   * @param {string} [opciones.textoConfirmar='Confirmar']
   * @param {boolean} [opciones.peligro=false] Resalta la acción como destructiva.
   * @returns {Promise<boolean>} true si el usuario confirma.
   */
  function confirmar({ titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false }) {
    return new Promise((resolver) => {
      let confirmado = false;
      abrirModal({
        titulo,
        cuerpoHtml: `<p>${esc(mensaje)}</p>`,
        pequena: true,
        acciones: [
          { texto: 'Cancelar' },
          {
            texto: textoConfirmar,
            clase: peligro ? 'btn-peligro' : 'btn-primario',
            alPulsar: () => {
              confirmado = true;
            },
          },
        ],
        alCerrar: () => resolver(confirmado),
      });
    });
  }

  /* ------------------------------------------------------------------------
   * Insignias y celdas
   * ---------------------------------------------------------------------- */

  /** Clase de color de cada estado de orden. */
  const CLASES_ESTADO = Object.freeze({
    Vigente: 'insignia-verde',
    Prorrogada: 'insignia-dorada',
    Resuelta: 'insignia-azul',
    Cancelada: 'insignia-gris',
  });

  /**
   * @param {string} estado
   * @returns {string} Marcado de la insignia del estado.
   */
  function insigniaEstado(estado) {
    return `<span class="insignia ${CLASES_ESTADO[estado] || 'insignia-gris'}">${esc(estado)}</span>`;
  }

  /**
   * Insignia de alerta de vencimiento (vacía si la orden está en término).
   * @param {SGEDF.OrdenTrabajo} orden
   * @returns {string}
   */
  function insigniaVencimiento(orden) {
    const situacion = orden.situacionVencimiento();
    if (situacion === 'vencida') {
      return '<span class="insignia insignia-roja">Vencida</span>';
    }
    if (situacion === 'proxima') {
      const dias = orden.diasParaVencer();
      const texto = dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias === 1 ? '' : 's'}`;
      return `<span class="insignia insignia-dorada">${texto}</span>`;
    }
    return '';
  }

  /**
   * Fila de tabla que informa que no hay datos.
   * @param {number} columnas
   * @param {string} mensaje
   * @returns {string}
   */
  function filaVacia(columnas, mensaje) {
    return `<tr><td colspan="${columnas}" class="celda-vacia">${esc(mensaje)}</td></tr>`;
  }

  /* ------------------------------------------------------------------------
   * Formularios
   * ---------------------------------------------------------------------- */

  /**
   * Genera el id de un campo a partir de su nombre ("policiaJudicial.nunc" →
   * "campo-policiaJudicial-nunc").
   * @param {string} nombre
   * @returns {string}
   */
  function idCampo(nombre) {
    return `campo-${nombre.replace(/\./g, '-')}`;
  }

  /**
   * Genera el marcado de un campo de formulario con etiqueta, ayuda y error.
   * @param {Object} config
   * @param {string} config.nombre Atributo name (admite rutas con punto).
   * @param {string} config.etiqueta Texto de la etiqueta.
   * @param {string} [config.tipo='text'] text | date | number | email | tel | password | select | textarea.
   * @param {*} [config.valor=''] Valor inicial.
   * @param {boolean} [config.requerido=false]
   * @param {string} [config.placeholder='']
   * @param {string} [config.ayuda=''] Texto de ayuda bajo el campo.
   * @param {Array<string|{valor: string, texto: string}>} [config.opciones] Para select.
   * @param {string} [config.atributos=''] Atributos HTML adicionales (min, max, maxlength…).
   * @param {boolean} [config.completo=false] Ocupa todo el ancho de la rejilla.
   * @param {boolean} [config.soloLectura=false]
   * @param {string} [config.atributosContenedor=''] Atributos del contenedor.
   * @returns {string}
   */
  function campo(config) {
    const {
      nombre,
      etiqueta,
      tipo = 'text',
      valor = '',
      requerido = false,
      placeholder = '',
      ayuda = '',
      opciones = [],
      atributos = '',
      completo = false,
      soloLectura = false,
      atributosContenedor = '',
    } = config;
    const id = idCampo(nombre);
    const descritoPor = [ayuda ? `${id}-ayuda` : '', `${id}-error`].filter(Boolean).join(' ');
    const comunes = [
      `id="${id}"`,
      `name="${esc(nombre)}"`,
      `aria-describedby="${descritoPor}"`,
      requerido ? 'required aria-required="true"' : '',
      soloLectura ? 'readonly' : '',
      atributos,
    ]
      .filter(Boolean)
      .join(' ');

    let control;
    if (tipo === 'select') {
      const opcionesHtml = opciones
        .map((opcion) => {
          const valorOpcion = typeof opcion === 'object' ? opcion.valor : opcion;
          const textoOpcion = typeof opcion === 'object' ? opcion.texto : opcion;
          const seleccionada = String(valorOpcion) === String(valor) ? ' selected' : '';
          return `<option value="${esc(valorOpcion)}"${seleccionada}>${esc(textoOpcion)}</option>`;
        })
        .join('');
      control = `<select ${comunes}>${opcionesHtml}</select>`;
    } else if (tipo === 'textarea') {
      control = `<textarea ${comunes} rows="3" placeholder="${esc(placeholder)}">${esc(valor)}</textarea>`;
    } else {
      control = `<input type="${tipo}" ${comunes} value="${esc(valor)}" placeholder="${esc(placeholder)}">`;
    }

    return `
      <div class="campo${completo ? ' campo-completo' : ''}" ${atributosContenedor}>
        <label for="${id}">${esc(etiqueta)}${requerido ? ' <span class="obligatorio" aria-hidden="true">*</span>' : ''}</label>
        ${control}
        ${ayuda ? `<span id="${id}-ayuda" class="campo-ayuda">${esc(ayuda)}</span>` : ''}
        <p id="${id}-error" class="campo-error"></p>
      </div>`;
  }

  /**
   * Genera un grupo de casillas de verificación (selección múltiple accesible).
   * @param {Object} config
   * @param {string} config.nombre
   * @param {string} config.etiqueta
   * @param {Array<string|{valor: string, texto: string}>} config.opciones
   * @param {string[]} [config.seleccionadas=[]]
   * @param {boolean} [config.requerido=false]
   * @returns {string}
   */
  function grupoOpciones({ nombre, etiqueta, opciones, seleccionadas = [], requerido = false }) {
    const id = idCampo(nombre);
    const casillas = opciones
      .map((opcion) => {
        const valor = typeof opcion === 'object' ? opcion.valor : opcion;
        const texto = typeof opcion === 'object' ? opcion.texto : opcion;
        const marcada = seleccionadas.includes(valor) ? ' checked' : '';
        return `<label class="opcion"><input type="checkbox" name="${esc(nombre)}" value="${esc(valor)}"${marcada}> ${esc(texto)}</label>`;
      })
      .join('');
    return `
      <fieldset class="campo campo-completo">
        <legend class="etiqueta-grupo">${esc(etiqueta)}${requerido ? ' <span class="obligatorio" aria-hidden="true">*</span>' : ''}</legend>
        <div id="${id}" class="grupo-opciones" aria-describedby="${id}-error">${casillas}</div>
        <p id="${id}-error" class="campo-error"></p>
      </fieldset>`;
  }

  /**
   * Título de sección dentro de una rejilla de formulario.
   * @param {string} titulo
   * @returns {string}
   */
  function seccion(titulo) {
    return `<h3 class="seccion-formulario">${esc(titulo)}</h3>`;
  }

  /**
   * Asigna un valor dentro de un objeto siguiendo una ruta con puntos.
   * @param {Object} objeto
   * @param {string} ruta Ej. "policiaJudicial.nunc".
   * @param {*} valor
   */
  function asignarRuta(objeto, ruta, valor) {
    const partes = ruta.split('.');
    let nodo = objeto;
    partes.slice(0, -1).forEach((parte) => {
      nodo[parte] = nodo[parte] || {};
      nodo = nodo[parte];
    });
    nodo[partes[partes.length - 1]] = valor;
  }

  /**
   * Lee un formulario y construye un objeto anidado según los atributos name.
   * Las casillas de verificación con el mismo nombre se devuelven como arreglo.
   * @param {HTMLFormElement} formulario
   * @returns {Object}
   */
  function leerFormulario(formulario) {
    const datos = {};
    const datosFormulario = new FormData(formulario);
    const nombres = new Set(
      [...formulario.elements].map((elemento) => elemento.name).filter(Boolean)
    );
    nombres.forEach((nombre) => {
      const esLista = formulario.querySelector(
        `input[type="checkbox"][name="${CSS.escape(nombre)}"]`
      );
      const valor = esLista ? datosFormulario.getAll(nombre) : datosFormulario.get(nombre);
      asignarRuta(datos, nombre, valor === null ? '' : valor);
    });
    return datos;
  }

  /**
   * Elimina los mensajes y marcas de error de un formulario.
   * @param {HTMLFormElement} formulario
   */
  function limpiarErrores(formulario) {
    formulario.querySelectorAll('[aria-invalid="true"]').forEach((elemento) => {
      elemento.removeAttribute('aria-invalid');
    });
    formulario.querySelectorAll('.campo-error').forEach((elemento) => {
      elemento.textContent = '';
    });
  }

  /**
   * Muestra los errores de validación junto a cada campo y enfoca el primero.
   * @param {HTMLFormElement} formulario
   * @param {Object<string,string>} errores Mapa nombre de campo → mensaje.
   * @returns {number} Cantidad de errores mostrados.
   */
  function mostrarErrores(formulario, errores = {}) {
    limpiarErrores(formulario);
    let primerControl = null;
    Object.entries(errores).forEach(([nombre, mensaje]) => {
      const id = idCampo(nombre);
      const control = formulario.querySelector(`#${id}`);
      const contenedorError = formulario.querySelector(`#${id}-error`);
      if (contenedorError) {
        contenedorError.textContent = mensaje;
      }
      if (control) {
        control.setAttribute('aria-invalid', 'true');
        primerControl = primerControl || control;
      }
    });
    if (primerControl) {
      const enfocable = primerControl.matches('input, select, textarea')
        ? primerControl
        : primerControl.querySelector('input, select, textarea');
      if (enfocable) {
        enfocable.focus();
      }
    }
    return Object.keys(errores).length;
  }

  /** Registra los eventos globales de la modal. Se llama una sola vez al iniciar. */
  function inicializar() {
    const capa = document.getElementById('modal-capa');
    capa.addEventListener('click', (evento) => {
      if (evento.target === capa || evento.target.closest('[data-cerrar-modal]')) {
        cerrarModal();
      }
    });
    document.addEventListener('keydown', (evento) => {
      if (capa.hidden) {
        return;
      }
      if (evento.key === 'Escape') {
        cerrarModal();
      } else if (evento.key === 'Tab') {
        atraparFoco(evento);
      }
    });
  }

  SGEDF.UI = Object.freeze({
    esc,
    icono,
    notificar,
    limpiarNotificaciones,
    abrirModal,
    cerrarModal,
    confirmar,
    insigniaEstado,
    insigniaVencimiento,
    filaVacia,
    idCampo,
    campo,
    grupoOpciones,
    seccion,
    leerFormulario,
    limpiarErrores,
    mostrarErrores,
    inicializar,
  });
})((window.SGEDF = window.SGEDF || {}));
