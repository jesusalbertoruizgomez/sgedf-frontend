/**
 * @file Vista del tablero principal (Dashboard).
 * @description Muestra los indicadores de las órdenes visibles para el usuario,
 * las alertas de vencimiento, las órdenes más recientes y la actividad reciente
 * registrada en la bitácora.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Autenticacion, Ordenes, Auditoria, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /** Cantidad de elementos recientes que se muestran en cada lista. */
  const CANTIDAD_RECIENTES = 5;

  /**
   * Tarjeta de un indicador.
   * @param {string} etiqueta
   * @param {number} valor
   * @param {string} claseColor
   * @returns {string}
   */
  function tarjetaMetrica(etiqueta, valor, claseColor) {
    return `
      <div class="metrica">
        <p class="metrica-etiqueta">${esc(etiqueta)}</p>
        <p class="metrica-valor ${claseColor}">${Formato.formatearNumero(valor)}</p>
      </div>`;
  }

  /**
   * Bloque de alertas de órdenes vencidas o próximas a vencer.
   * @param {SGEDF.OrdenTrabajo[]} ordenesEnAlerta
   * @returns {string}
   */
  function bloqueAlertas(ordenesEnAlerta) {
    if (ordenesEnAlerta.length === 0) {
      return '';
    }
    const elementos = ordenesEnAlerta
      .map(
        (orden) => `
        <li>
          <button type="button" class="btn btn-enlace" data-accion="ver" data-numero="${esc(orden.numero)}">${esc(orden.numero)}</button>
          ${UI.insigniaVencimiento(orden)}
          <span>${esc(orden.policiaJudicial.delito)} · vence el ${Formato.formatearFecha(orden.policiaJudicial.fechaVencimiento)}</span>
        </li>`
      )
      .join('');
    return `
      <div class="alerta alerta-advertencia" role="status">
        <strong>Atención:</strong> ${ordenesEnAlerta.length} orden(es) requieren seguimiento por vencimiento del plazo.
        <ul class="lista-alertas">${elementos}</ul>
      </div>`;
  }

  /**
   * Filas de la tabla de órdenes recientes.
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @returns {string}
   */
  function filasRecientes(ordenes) {
    if (ordenes.length === 0) {
      return UI.filaVacia(6, 'No hay órdenes de trabajo registradas.');
    }
    return ordenes
      .map(
        (orden) => `
        <tr>
          <td><strong>${esc(orden.numero)}</strong></td>
          <td class="texto-mono">${esc(orden.policiaJudicial.nunc)}</td>
          <td>${esc(orden.policiaJudicial.delito)}</td>
          <td>${Formato.formatearFecha(orden.fechaInicio)}</td>
          <td>${UI.insigniaEstado(orden.estado)}</td>
          <td class="celda-acciones">
            <button type="button" class="btn btn-enlace" data-accion="ver" data-numero="${esc(orden.numero)}">Ver detalle</button>
          </td>
        </tr>`
      )
      .join('');
  }

  /**
   * Lista de la actividad reciente.
   * @param {SGEDF.RegistroAuditoria[]} registros
   * @returns {string}
   */
  function listaBitacora(registros) {
    if (registros.length === 0) {
      return '<p class="texto-vacio">No hay actividades registradas.</p>';
    }
    const elementos = registros
      .map(
        (registro) => `
        <li class="entrada-bitacora">
          <time datetime="${esc(registro.fechaHora)}">${Formato.formatearFechaHora(registro.fechaHora)}</time>
          <span><strong>${esc(registro.descripcionAccion)}</strong> — ${esc(registro.detalle)}</span>
        </li>`
      )
      .join('');
    return `<ul class="lista-bitacora">${elementos}</ul>`;
  }

  /**
   * Renderiza el tablero en el contenedor principal.
   * @param {HTMLElement} contenedor
   */
  function montar(contenedor) {
    const usuario = Autenticacion.usuarioActual();
    const esAdmin = Autenticacion.rolActivo() === Config.ROLES.ADMIN;
    const ordenes = Ordenes.listarVisibles();
    const metricas = Ordenes.calcularMetricas(ordenes);
    const bitacora = Auditoria.filtrar({
      usuario: esAdmin ? undefined : usuario.identificacion,
      limite: CANTIDAD_RECIENTES,
    });

    contenedor.innerHTML = `
      <section aria-label="Resumen de órdenes de trabajo">
        <div class="metricas">
          ${tarjetaMetrica(esAdmin ? 'Órdenes registradas' : 'Órdenes asignadas', metricas.total, 'metrica-azul')}
          ${tarjetaMetrica('Vigentes', metricas.vigentes, 'metrica-celeste')}
          ${tarjetaMetrica('En prórroga', metricas.prorrogadas, 'metrica-dorada')}
          ${tarjetaMetrica('Resueltas', metricas.resueltas, 'metrica-gris')}
        </div>

        ${bloqueAlertas([...metricas.vencidas, ...metricas.proximas])}

        <div class="tarjeta">
          <div class="tarjeta-encabezado">
            <div>
              <h3 class="tarjeta-titulo">Órdenes de trabajo recientes</h3>
              <p class="tarjeta-sub">Últimas ${CANTIDAD_RECIENTES} órdenes ${esAdmin ? 'del laboratorio' : 'asignadas a su usuario'}</p>
            </div>
            ${esAdmin ? '' : `<a class="btn btn-primario" href="#/registro">${UI.icono('registro')}Registrar orden</a>`}
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <caption class="solo-lector">Órdenes de trabajo recientes</caption>
              <thead>
                <tr>
                  <th scope="col">Nro. OT</th><th scope="col">NUNC</th><th scope="col">Delito</th>
                  <th scope="col">Fecha inicio</th><th scope="col">Estado</th><th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>${filasRecientes(ordenes.slice(0, CANTIDAD_RECIENTES))}</tbody>
            </table>
          </div>
        </div>

        <div class="tarjeta">
          <h3 class="tarjeta-titulo">${esAdmin ? 'Actividad reciente del sistema' : 'Bitácora de accesos recientes'}</h3>
          <p class="tarjeta-sub">Últimas actividades registradas en el sistema</p>
          ${listaBitacora(bitacora)}
        </div>
      </section>`;

    // Delegación de eventos sobre la raíz recién creada (no se acumulan oyentes).
    contenedor.firstElementChild.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-accion="ver"]');
      if (boton) {
        SGEDF.VistaDetalleOrden.abrir(boton.dataset.numero);
      }
    });
  }

  SGEDF.VistaDashboard = Object.freeze({ montar });
})((window.SGEDF = window.SGEDF || {}));
