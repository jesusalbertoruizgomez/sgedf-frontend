/**
 * @file Vista de detalle de una orden de trabajo (ventana modal).
 * @description Presenta todos los datos de la orden. Cada apertura queda
 * registrada en la bitácora ("acceso auditado"), en coherencia con la cadena de
 * custodia de la evidencia digital.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Ordenes, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /**
   * Organiza los datos de la orden en secciones de pares etiqueta/valor (texto plano).
   * Se reutiliza en el reporte de caso para mantener la misma información.
   * @param {SGEDF.OrdenTrabajo} orden
   * @returns {Array<{titulo: string, items: Array<[string, string]>}>}
   */
  function secciones(orden) {
    const pj = orden.policiaJudicial;
    const solicitud = orden.solicitudAnalisis;
    const informe = orden.informe;
    const conCiudad = (texto, ciudad) => (ciudad ? `${texto} – ${ciudad}` : texto);
    const oGuion = (texto) => texto || '—';

    return [
      {
        titulo: 'Datos de la orden de trabajo',
        items: [
          ['Nro. OT', orden.numero],
          ['Estado', orden.estado],
          ['Fecha de inicio', Formato.formatearFecha(orden.fechaInicio)],
          ['Vigencia', Formato.formatearFecha(orden.fechaVigencia)],
          ['Clase', orden.clase],
          ['Perito', `${orden.perito.nombre} (${orden.perito.identificacion})`],
        ],
      },
      {
        titulo: 'Orden de policía judicial',
        items: [
          ['NUNC', pj.nunc],
          ['Delito', pj.delito],
          ['Autoridad solicitante', conCiudad(pj.autoridadSolicitante, pj.ciudadAutoridad)],
          ['Plazo', `${pj.plazoDias} días`],
          ['Fecha de vencimiento', Formato.formatearFecha(pj.fechaVencimiento)],
        ],
      },
      {
        titulo: 'Solicitud de análisis FPJ-12',
        items: [
          ['Nro. solicitud FPJ-12', solicitud.numero],
          ['PJ solicitante', solicitud.nombreSolicitante],
          ['Dependencia PJ', conCiudad(solicitud.dependencia, solicitud.ciudad)],
          ['Teléfono', oGuion(solicitud.telefono)],
          ['Correo', oGuion(solicitud.correo)],
        ],
      },
      {
        titulo: 'Análisis e informe FPJ-13',
        items: [
          ['Herramientas empleadas', orden.herramientas.join(', ')],
          ['Total GB analizadas', Formato.formatearNumero(orden.totalGb, 1)],
          ['Fecha informe FPJ-13', Formato.formatearFecha(informe.fechaInforme)],
          ['Funcionario reclamante', oGuion(informe.funcionarioReclama)],
          ['Fecha de reclamación', Formato.formatearFecha(informe.fechaReclamacion)],
        ],
      },
    ];
  }

  /**
   * Lista de definición con los pares de una sección.
   * @param {Array<[string, string]>} items
   * @param {Object<string,string>} [htmlEspecial] Valores que se muestran como HTML.
   * @returns {string}
   */
  function listaDefinicion(items, htmlEspecial = {}) {
    const filas = items
      .map(
        ([etiqueta, valor]) => `
        <div class="detalle-item">
          <dt>${esc(etiqueta)}</dt>
          <dd>${htmlEspecial[etiqueta] || esc(valor)}</dd>
        </div>`
      )
      .join('');
    return `<dl class="detalle-rejilla">${filas}</dl>`;
  }

  /**
   * Cuadrícula con las cantidades de dispositivos recibidos.
   * @param {SGEDF.OrdenTrabajo} orden
   * @returns {string}
   */
  function rejillaDispositivos(orden) {
    const celdas = Config.TIPOS_DISPOSITIVO.map(
      ({ clave, etiqueta }) => `
      <div class="dispositivo-celda">
        <div class="etiqueta">${esc(etiqueta)}</div>
        <div class="valor">${orden.dispositivos[clave]}</div>
      </div>`
    ).join('');
    return `
      <div class="dispositivos-rejilla">
        ${celdas}
        <div class="dispositivo-celda"><div class="etiqueta">Total dispositivos</div><div class="valor">${orden.totalDispositivos}</div></div>
        <div class="dispositivo-celda"><div class="etiqueta">Total GB</div><div class="valor">${Formato.formatearNumero(orden.totalGb, 1)}</div></div>
      </div>`;
  }

  /**
   * Abre la ventana modal con el detalle de la orden indicada.
   * @param {string} numero
   */
  function abrir(numero) {
    const orden = Ordenes.obtener(numero);
    if (!orden) {
      UI.notificar('La orden no existe o no tiene permisos para consultarla.', 'error');
      return;
    }
    Ordenes.registrarConsulta(orden.numero);

    const [datosOrden, policiaJudicial, solicitud, analisis] = secciones(orden);
    const estadoHtml = `${UI.insigniaEstado(orden.estado)} ${UI.insigniaVencimiento(orden)}`;
    const cuerpoHtml = `
      ${listaDefinicion(datosOrden.items, { Estado: estadoHtml })}
      <hr class="separador">
      <h3 class="detalle-subtitulo">${esc(policiaJudicial.titulo)}</h3>
      ${listaDefinicion(policiaJudicial.items, { NUNC: `<span class="texto-mono">${esc(orden.policiaJudicial.nunc)}</span>` })}
      <hr class="separador">
      <h3 class="detalle-subtitulo">${esc(solicitud.titulo)}</h3>
      ${listaDefinicion(solicitud.items)}
      <hr class="separador">
      <h3 class="detalle-subtitulo">Dispositivos recibidos</h3>
      ${rejillaDispositivos(orden)}
      <hr class="separador">
      <h3 class="detalle-subtitulo">${esc(analisis.titulo)}</h3>
      ${listaDefinicion(analisis.items)}
      <hr class="separador">
      <h3 class="detalle-subtitulo">Observaciones</h3>
      <p>${esc(orden.observaciones) || 'Sin observaciones.'}</p>
      <p class="campo-ayuda">Registrada: ${Formato.formatearFechaHora(orden.fechaRegistro)} · Última actualización: ${Formato.formatearFechaHora(orden.fechaActualizacion)}</p>`;

    const acciones = [
      {
        texto: 'Generar reporte PDF',
        clase: 'btn-primario',
        icono: 'reportes',
        alPulsar: () => SGEDF.Enrutador.navegar('reportes', orden.numero),
      },
    ];
    if (Ordenes.puedeEditar(orden)) {
      acciones.push({
        texto: 'Editar',
        icono: 'editar',
        alPulsar: () => SGEDF.Enrutador.navegar('editar-orden', orden.numero),
      });
    }
    acciones.push({ texto: 'Cerrar' });

    UI.abrirModal({
      titulo: `Detalle orden ${orden.numero}`,
      subtitulo: 'Acceso auditado — la consulta quedó registrada en la bitácora',
      cuerpoHtml,
      acciones,
    });
  }

  SGEDF.VistaDetalleOrden = Object.freeze({ abrir, secciones });
})((window.SGEDF = window.SGEDF || {}));
