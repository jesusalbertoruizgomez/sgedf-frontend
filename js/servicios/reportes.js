/**
 * @file Servicio de generación de reportes.
 * @description Construye los datos de cada tipo de reporte a partir de las órdenes
 * visibles para el usuario. La presentación (vista previa e impresión a PDF) es
 * responsabilidad de la vista de reportes.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Ordenes, Auditoria, Validadores, Formato } = SGEDF;

  /** Tipos de reporte disponibles. */
  const TIPOS = Object.freeze({
    CASO: 'caso',
    PERIODO: 'periodo',
    DELITO: 'delito',
    DISPOSITIVOS: 'dispositivos',
  });

  /** Títulos de cada tipo de reporte. */
  const TITULOS = Object.freeze({
    [TIPOS.CASO]: 'Reporte de caso (por orden de trabajo)',
    [TIPOS.PERIODO]: 'Reporte por período de fechas',
    [TIPOS.DELITO]: 'Reporte por tipo de delito',
    [TIPOS.DISPOSITIVOS]: 'Reporte de dispositivos analizados',
  });

  /**
   * @typedef {Object} Reporte
   * @property {string} tipo
   * @property {string} titulo
   * @property {string} criterio Descripción legible de los filtros aplicados.
   * @property {SGEDF.OrdenTrabajo[]} ordenes Órdenes incluidas.
   * @property {Object} totales Totales de dispositivos y GB.
   * @property {Array<{delito: string, cantidad: number}>} agrupacionDelitos
   * @property {string} generadoPor Usuario que genera el reporte.
   * @property {string} fechaGeneracion Marca de tiempo ISO.
   */

  /**
   * Valida los filtros de acuerdo con el tipo de reporte.
   * @param {string} tipo
   * @param {{numero?: string, desde?: string, hasta?: string}} filtros
   * @returns {Object<string,string>} Errores por campo.
   */
  function validarFiltros(tipo, filtros) {
    const errores = {};
    if (!Object.values(TIPOS).includes(tipo)) {
      errores.tipo = 'Seleccione un tipo de reporte válido.';
      return errores;
    }
    if (tipo === TIPOS.CASO && !Validadores.esNumeroOrdenTrabajo(filtros.numero)) {
      errores.numero = 'Ingrese un número de orden válido (OT-AAAA-NNN).';
    }
    if (tipo === TIPOS.PERIODO) {
      if (!Validadores.esFechaValida(filtros.desde)) {
        errores.desde = 'Ingrese la fecha inicial del período.';
      }
      if (!Validadores.esFechaValida(filtros.hasta)) {
        errores.hasta = 'Ingrese la fecha final del período.';
      }
    }
    if (
      tipo !== TIPOS.CASO &&
      Validadores.esFechaValida(filtros.desde) &&
      Validadores.esFechaValida(filtros.hasta) &&
      !Validadores.esFechaNoAnterior(filtros.desde, filtros.hasta)
    ) {
      errores.hasta = 'La fecha final no puede ser anterior a la inicial.';
    }
    return errores;
  }

  /**
   * Suma los dispositivos por tipo y el total de GB de un conjunto de órdenes.
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @returns {{porTipo: Object<string, number>, dispositivos: number, gigas: number}}
   */
  function calcularTotales(ordenes) {
    const porTipo = {};
    Config.TIPOS_DISPOSITIVO.forEach(({ clave }) => {
      porTipo[clave] = ordenes.reduce((suma, orden) => suma + orden.dispositivos[clave], 0);
    });
    return {
      porTipo,
      dispositivos: Object.values(porTipo).reduce((suma, valor) => suma + valor, 0),
      gigas: ordenes.reduce((suma, orden) => suma + orden.totalGb, 0),
    };
  }

  /**
   * Agrupa las órdenes por delito, de mayor a menor frecuencia.
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @returns {Array<{delito: string, cantidad: number}>}
   */
  function agruparPorDelito(ordenes) {
    const conteo = new Map();
    ordenes.forEach((orden) => {
      const delito = orden.policiaJudicial.delito;
      conteo.set(delito, (conteo.get(delito) || 0) + 1);
    });
    return [...conteo.entries()]
      .map(([delito, cantidad]) => ({ delito, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.delito.localeCompare(b.delito, 'es'));
  }

  /**
   * Filtra las órdenes visibles por rango de fecha de inicio (límites opcionales).
   * @param {SGEDF.OrdenTrabajo[]} ordenes
   * @param {string} [desde]
   * @param {string} [hasta]
   * @returns {SGEDF.OrdenTrabajo[]}
   */
  function filtrarPorRango(ordenes, desde, hasta) {
    return ordenes.filter(
      (orden) => (!desde || orden.fechaInicio >= desde) && (!hasta || orden.fechaInicio <= hasta)
    );
  }

  /**
   * Describe el rango de fechas aplicado.
   * @param {string} [desde]
   * @param {string} [hasta]
   * @returns {string}
   */
  function describirRango(desde, hasta) {
    if (desde && hasta) {
      return `Fecha de inicio entre ${Formato.formatearFecha(desde)} y ${Formato.formatearFecha(hasta)}`;
    }
    if (desde) {
      return `Fecha de inicio desde ${Formato.formatearFecha(desde)}`;
    }
    if (hasta) {
      return `Fecha de inicio hasta ${Formato.formatearFecha(hasta)}`;
    }
    return 'Todas las fechas';
  }

  /**
   * Genera un reporte y registra la operación en la bitácora.
   * @param {string} tipo Valor de TIPOS.
   * @param {{numero?: string, desde?: string, hasta?: string}} [filtros={}]
   * @returns {{exito: boolean, mensaje?: string, errores?: Object, reporte?: Reporte}}
   */
  function generar(tipo, filtros = {}) {
    const errores = validarFiltros(tipo, filtros);
    if (Object.keys(errores).length > 0) {
      return { exito: false, errores, mensaje: 'Revise los filtros del reporte.' };
    }

    let ordenes;
    let criterio;
    if (tipo === TIPOS.CASO) {
      const orden = Ordenes.obtener(filtros.numero);
      if (!orden) {
        return {
          exito: false,
          errores: { numero: 'La orden no existe o no está asignada a su usuario.' },
          mensaje: 'No se encontró la orden solicitada.',
        };
      }
      ordenes = [orden];
      criterio = `Orden de trabajo ${orden.numero}`;
    } else {
      ordenes = filtrarPorRango(Ordenes.listarVisibles(), filtros.desde, filtros.hasta);
      criterio = describirRango(filtros.desde, filtros.hasta);
    }

    const usuario = SGEDF.Autenticacion.usuarioActual();
    const reporte = {
      tipo,
      titulo: TITULOS[tipo],
      criterio,
      ordenes,
      totales: calcularTotales(ordenes),
      agrupacionDelitos: agruparPorDelito(ordenes),
      generadoPor: usuario ? `${usuario.nombreCompleto} (${usuario.identificacion})` : '—',
      fechaGeneracion: new Date().toISOString(),
    };

    Auditoria.registrar(
      Auditoria.TIPOS.GENERACION_REPORTE,
      `${reporte.titulo} · ${criterio} · ${ordenes.length} orden(es).`
    );
    return { exito: true, reporte };
  }

  SGEDF.Reportes = Object.freeze({ TIPOS, TITULOS, generar, validarFiltros });
})((window.SGEDF = window.SGEDF || {}));
