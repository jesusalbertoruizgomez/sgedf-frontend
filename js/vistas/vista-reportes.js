/**
 * @file Vista de generación de reportes en PDF.
 * @description Genera una vista previa del reporte y permite imprimirlo o
 * guardarlo como PDF con el diálogo de impresión del navegador (sin librerías
 * externas). Ruta opcional: #/reportes/OT-AAAA-NNN genera directamente el
 * reporte de ese caso.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Reportes, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /** Último documento generado, listo para imprimir. */
  let documentoActual = '';

  /**
   * Tabla HTML genérica.
   * @param {string[]} encabezados
   * @param {Array<Array<string>>} filas Celdas ya escapadas.
   * @param {string} [mensajeVacio]
   * @returns {string}
   */
  function tabla(encabezados, filas, mensajeVacio = 'Sin datos para el criterio seleccionado.') {
    const cabecera = encabezados.map((texto) => `<th scope="col">${esc(texto)}</th>`).join('');
    const cuerpo =
      filas.length === 0
        ? UI.filaVacia(encabezados.length, mensajeVacio)
        : filas.map((celdas) => `<tr>${celdas.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="tabla-contenedor"><table class="tabla"><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
  }

  /**
   * Tabla resumen de órdenes incluidas en el reporte.
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @returns {string}
   */
  function tablaOrdenes(ordenes) {
    return tabla(
      ['Nro. OT', 'Fecha inicio', 'NUNC', 'Delito', 'Autoridad', 'Estado', 'Disp.', 'GB'],
      ordenes.map((orden) => [
        esc(orden.numero),
        Formato.formatearFecha(orden.fechaInicio),
        `<span class="texto-mono">${esc(orden.policiaJudicial.nunc)}</span>`,
        esc(orden.policiaJudicial.delito),
        esc(orden.policiaJudicial.autoridadSolicitante),
        esc(orden.estado),
        String(orden.totalDispositivos),
        Formato.formatearNumero(orden.totalGb, 1),
      ]),
      'No hay órdenes que cumplan el criterio seleccionado.'
    );
  }

  /**
   * Tabla de dispositivos por tipo con totales.
   * @param {Object} totales
   * @returns {string}
   */
  function tablaDispositivos(totales) {
    const filas = Config.TIPOS_DISPOSITIVO.map(({ clave, etiqueta }) => [
      esc(etiqueta),
      Formato.formatearNumero(totales.porTipo[clave]),
    ]);
    filas.push([
      '<strong>Total de dispositivos</strong>',
      `<strong>${Formato.formatearNumero(totales.dispositivos)}</strong>`,
    ]);
    filas.push([
      '<strong>Total GB analizadas</strong>',
      `<strong>${Formato.formatearNumero(totales.gigas, 1)}</strong>`,
    ]);
    return tabla(['Tipo de dispositivo', 'Cantidad'], filas);
  }

  /**
   * Contenido específico de cada tipo de reporte.
   * @param {Object} reporte
   * @returns {string}
   */
  function contenidoPorTipo(reporte) {
    const { TIPOS } = Reportes;
    switch (reporte.tipo) {
      case TIPOS.CASO: {
        const orden = reporte.ordenes[0];
        const secciones = SGEDF.VistaDetalleOrden.secciones(orden).map(
          (seccion) => `
            <h4 class="reporte-seccion">${esc(seccion.titulo)}</h4>
            ${tabla(
              ['Campo', 'Valor'],
              seccion.items.map(([campo, valor]) => [esc(campo), esc(valor)])
            )}`
        );
        return `${secciones.join('')}
          <h4 class="reporte-seccion">Dispositivos recibidos</h4>
          ${tablaDispositivos(reporte.totales)}
          <h4 class="reporte-seccion">Observaciones</h4>
          <p>${esc(orden.observaciones) || 'Sin observaciones.'}</p>`;
      }
      case TIPOS.DELITO: {
        const total = reporte.ordenes.length || 1;
        const filas = reporte.agrupacionDelitos.map(({ delito, cantidad }) => [
          esc(delito),
          String(cantidad),
          `${Formato.formatearNumero((cantidad / total) * 100, 1)} %`,
        ]);
        return `
          <h4 class="reporte-seccion">Órdenes por tipo de delito</h4>
          ${tabla(['Delito', 'Órdenes', 'Participación'], filas)}
          <h4 class="reporte-seccion">Detalle de órdenes</h4>
          ${tablaOrdenes(reporte.ordenes)}`;
      }
      case TIPOS.DISPOSITIVOS:
        return `
          <h4 class="reporte-seccion">Consolidado de dispositivos analizados</h4>
          ${tablaDispositivos(reporte.totales)}
          <h4 class="reporte-seccion">Detalle por orden</h4>
          ${tablaOrdenes(reporte.ordenes)}`;
      case TIPOS.PERIODO:
        return `
          <h4 class="reporte-seccion">Órdenes del período</h4>
          ${tablaOrdenes(reporte.ordenes)}
          <h4 class="reporte-seccion">Totales del período</h4>
          ${tablaDispositivos(reporte.totales)}`;
      default:
        return '';
    }
  }

  /**
   * Construye el documento completo del reporte (vista previa e impresión).
   * @param {Object} reporte
   * @returns {string}
   */
  function construirDocumento(reporte) {
    return `
      <article class="reporte-documento">
        <header class="reporte-encabezado">
          <img src="assets/img/logo-laboratorio.jpg" alt="" width="64" height="64">
          <div>
            <h3>${esc(Config.LABORATORIO)}</h3>
            <p>${esc(Config.NOMBRE_SISTEMA)} · ${esc(reporte.titulo)}</p>
          </div>
        </header>
        <div class="reporte-metadatos">
          <div><strong>Criterio:</strong> ${esc(reporte.criterio)}</div>
          <div><strong>Órdenes incluidas:</strong> ${reporte.ordenes.length}</div>
          <div><strong>Generado por:</strong> ${esc(reporte.generadoPor)}</div>
          <div><strong>Fecha de generación:</strong> ${Formato.formatearFechaHora(reporte.fechaGeneracion)}</div>
        </div>
        ${contenidoPorTipo(reporte)}
        <footer class="reporte-pie">
          Documento generado por ${esc(Config.NOMBRE_SISTEMA)} v${esc(Config.VERSION)} · Uso oficial restringido · Su generación quedó registrada en la bitácora de auditoría.
        </footer>
      </article>`;
  }

  /** Envía el documento actual a la impresora / PDF del navegador. */
  function imprimir() {
    if (!documentoActual) {
      return;
    }
    const zona = document.getElementById('zona-impresion');
    zona.innerHTML = documentoActual;
    window.addEventListener(
      'afterprint',
      () => {
        zona.innerHTML = '';
      },
      { once: true }
    );
    window.print();
  }

  /**
   * Renderiza la vista de reportes.
   * @param {HTMLElement} contenedor
   * @param {string|null} numeroOrden Si se indica, genera de inmediato el reporte del caso.
   */
  function montar(contenedor, numeroOrden) {
    documentoActual = '';
    const opcionesTipo = Object.values(Reportes.TIPOS).map((valor) => ({
      valor,
      texto: Reportes.TITULOS[valor],
    }));

    contenedor.innerHTML = `
      <section class="tarjeta">
        <h3 class="tarjeta-titulo">Generación de reportes</h3>
        <p class="tarjeta-sub">Genere reportes en PDF con filtros por caso, fecha o tipo de delito</p>
        <form id="form-reporte" novalidate>
          <div class="formulario-rejilla">
            ${UI.campo({ nombre: 'tipo', etiqueta: 'Tipo de reporte', tipo: 'select', opciones: opcionesTipo, valor: Reportes.TIPOS.CASO })}
            ${UI.campo({ nombre: 'numero', etiqueta: 'Nro. de orden de trabajo', valor: numeroOrden || '', placeholder: 'Ej. OT-2026-001', ayuda: 'Obligatorio para el reporte de caso', atributos: 'maxlength="13" autocomplete="off"', atributosContenedor: 'data-solo-caso' })}
            ${UI.campo({ nombre: 'desde', etiqueta: 'Fecha desde', tipo: 'date', ayuda: 'Filtra por fecha de inicio de la orden', atributosContenedor: 'data-rango' })}
            ${UI.campo({ nombre: 'hasta', etiqueta: 'Fecha hasta', tipo: 'date', atributosContenedor: 'data-rango' })}
          </div>
          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primario">${UI.icono('reportes')}Generar vista previa</button>
            <button type="button" id="btn-imprimir" class="btn" disabled>${UI.icono('imprimir')}Imprimir / Guardar PDF</button>
          </div>
        </form>
      </section>
      <section id="vista-previa" class="tarjeta" aria-live="polite" hidden></section>`;

    const formulario = contenedor.querySelector('#form-reporte');
    const vistaPrevia = contenedor.querySelector('#vista-previa');
    const botonImprimir = contenedor.querySelector('#btn-imprimir');

    /** Muestra solo los filtros que aplican al tipo de reporte seleccionado. */
    const ajustarFiltros = () => {
      const esCaso = formulario.elements.tipo.value === Reportes.TIPOS.CASO;
      formulario.querySelector('[data-solo-caso]').hidden = !esCaso;
      formulario.querySelectorAll('[data-rango]').forEach((elemento) => {
        elemento.hidden = esCaso;
      });
    };

    /** Genera el reporte y muestra la vista previa. */
    const generar = () => {
      const datos = UI.leerFormulario(formulario);
      const resultado = Reportes.generar(datos.tipo, datos);
      if (!resultado.exito) {
        UI.mostrarErrores(formulario, resultado.errores || {});
        UI.notificar(resultado.mensaje, 'error');
        return;
      }
      UI.limpiarErrores(formulario);
      documentoActual = construirDocumento(resultado.reporte);
      vistaPrevia.innerHTML = `<h3 class="seccion-formulario">Vista previa</h3>${documentoActual}`;
      vistaPrevia.hidden = false;
      botonImprimir.disabled = false;
      UI.notificar('Reporte generado. Use "Imprimir / Guardar PDF" para exportarlo.', 'info');
    };

    formulario.elements.tipo.addEventListener('change', () => {
      ajustarFiltros();
      UI.limpiarErrores(formulario);
    });
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      generar();
    });
    botonImprimir.addEventListener('click', imprimir);

    ajustarFiltros();
    if (numeroOrden) {
      generar();
    }
  }

  SGEDF.VistaReportes = Object.freeze({ montar });
})((window.SGEDF = window.SGEDF || {}));
