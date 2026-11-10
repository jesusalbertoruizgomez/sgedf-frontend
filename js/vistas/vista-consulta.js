/**
 * @file Vista de consulta de órdenes de trabajo (HU-02).
 * @description Búsqueda por número de OT, NUNC o delito y filtro por estado.
 * El perito ve solo sus órdenes; el administrador ve todas (solo lectura) con la
 * columna adicional del perito asignado.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Autenticacion, Ordenes, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /**
   * Celda de vencimiento con su alerta.
   * @param {SGEDF.OrdenTrabajo} orden
   * @returns {string}
   */
  function celdaVencimiento(orden) {
    return `${Formato.formatearFecha(orden.policiaJudicial.fechaVencimiento)} ${UI.insigniaVencimiento(orden)}`;
  }

  /**
   * Genera las filas de resultados.
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @param {boolean} esAdmin
   * @returns {string}
   */
  function filas(ordenes, esAdmin) {
    const columnas = esAdmin ? 8 : 7;
    if (ordenes.length === 0) {
      return UI.filaVacia(columnas, 'No hay órdenes de trabajo que coincidan con la búsqueda.');
    }
    return ordenes
      .map((orden) => {
        const enlaceEditar = Ordenes.puedeEditar(orden)
          ? ` · <a class="btn btn-enlace" href="#/editar-orden/${encodeURIComponent(orden.numero)}">Editar</a>`
          : '';
        return `
          <tr>
            <td><strong>${esc(orden.numero)}</strong></td>
            <td>${Formato.formatearFecha(orden.fechaInicio)}</td>
            <td>${esc(orden.policiaJudicial.delito)}</td>
            <td>${esc(orden.policiaJudicial.autoridadSolicitante)}</td>
            ${esAdmin ? `<td>${esc(orden.perito.nombre)}</td>` : ''}
            <td>${UI.insigniaEstado(orden.estado)}</td>
            <td>${celdaVencimiento(orden)}</td>
            <td class="celda-acciones">
              <button type="button" class="btn btn-enlace" data-accion="ver" data-numero="${esc(orden.numero)}">Ver</button>${enlaceEditar}
            </td>
          </tr>`;
      })
      .join('');
  }

  /**
   * Renderiza la vista de consulta.
   * @param {HTMLElement} contenedor
   */
  function montar(contenedor) {
    const esAdmin = Autenticacion.rolActivo() === Config.ROLES.ADMIN;
    const opcionesEstado = Config.ESTADOS_ORDEN.map(
      (estado) => `<option value="${esc(estado)}">${esc(estado)}</option>`
    ).join('');

    contenedor.innerHTML = `
      <section class="tarjeta">
        <div class="tarjeta-encabezado">
          <div>
            <h3 class="tarjeta-titulo">${esAdmin ? 'Todas las órdenes de trabajo' : 'Consulta de órdenes de trabajo'}</h3>
            <p class="tarjeta-sub">Historia de usuario HU-02 · ${esAdmin ? 'Vista de solo lectura de las órdenes del laboratorio' : 'Solo se muestran las órdenes asignadas al perito activo'}</p>
          </div>
          ${esAdmin ? '' : `<a class="btn btn-primario" href="#/registro">${UI.icono('registro')}Registrar orden</a>`}
        </div>

        <form id="form-busqueda" class="barra-filtros" role="search">
          <label class="solo-lector" for="busqueda-texto">Buscar por número de OT, NUNC o delito</label>
          <input id="busqueda-texto" class="control" type="search" placeholder="Buscar por Nro. OT, NUNC o delito..." autocomplete="off">
          <label class="solo-lector" for="busqueda-estado">Filtrar por estado</label>
          <select id="busqueda-estado" class="control">
            <option value="">Todos los estados</option>
            ${opcionesEstado}
          </select>
          <button type="submit" class="btn btn-primario">${UI.icono('consulta')}Buscar</button>
        </form>

        <p id="resumen-resultados" class="resumen-resultados" aria-live="polite"></p>
        <div class="tabla-contenedor">
          <table class="tabla">
            <caption class="solo-lector">Resultados de la consulta de órdenes de trabajo</caption>
            <thead>
              <tr>
                <th scope="col">Nro. OT</th><th scope="col">Fecha inicio</th><th scope="col">Delito</th>
                <th scope="col">Autoridad solicitante</th>${esAdmin ? '<th scope="col">Perito</th>' : ''}
                <th scope="col">Estado</th><th scope="col">Vencimiento</th><th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody id="cuerpo-ordenes"></tbody>
          </table>
        </div>
      </section>`;

    const raiz = contenedor.firstElementChild;
    const formulario = raiz.querySelector('#form-busqueda');
    const campoTexto = raiz.querySelector('#busqueda-texto');
    const campoEstado = raiz.querySelector('#busqueda-estado');

    /** Ejecuta la búsqueda con los filtros actuales y actualiza la tabla. */
    const buscar = () => {
      const resultados = Ordenes.buscar({ texto: campoTexto.value, estado: campoEstado.value });
      raiz.querySelector('#cuerpo-ordenes').innerHTML = filas(resultados, esAdmin);
      raiz.querySelector('#resumen-resultados').textContent =
        `${resultados.length} orden(es) encontrada(s).`;
    };

    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      buscar();
    });
    campoTexto.addEventListener('input', buscar);
    campoEstado.addEventListener('change', buscar);
    raiz.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-accion="ver"]');
      if (boton) {
        SGEDF.VistaDetalleOrden.abrir(boton.dataset.numero);
      }
    });

    buscar();
  }

  SGEDF.VistaConsulta = Object.freeze({ montar });
})((window.SGEDF = window.SGEDF || {}));
