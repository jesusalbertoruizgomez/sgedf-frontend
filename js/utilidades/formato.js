/**
 * @file Utilidades de formato: fechas, números, texto y escape de HTML.
 * @description Las fechas de negocio se manejan como cadenas ISO "AAAA-MM-DD" y se
 * interpretan en la zona horaria local para evitar desfases de un día.
 */
(function (SGEDF) {
  'use strict';

  /** Equivalencias para escapar caracteres especiales de HTML. */
  const ENTIDADES_HTML = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  /** Milisegundos que tiene un día. */
  const MS_POR_DIA = 24 * 60 * 60 * 1000;

  /**
   * Escapa un valor para insertarlo de forma segura en una plantilla HTML (previene XSS).
   * @param {*} valor Valor a mostrar.
   * @returns {string}
   */
  function escaparHtml(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }
    return String(valor).replace(/[&<>"']/g, (caracter) => ENTIDADES_HTML[caracter]);
  }

  /**
   * Completa con ceros a la izquierda hasta dos dígitos.
   * @param {number} numero
   * @returns {string}
   */
  function dosDigitos(numero) {
    return String(numero).padStart(2, '0');
  }

  /**
   * Convierte una fecha ISO "AAAA-MM-DD" en un objeto Date local (a medianoche).
   * @param {string} fechaIso
   * @returns {Date|null} null si la cadena no es una fecha válida.
   */
  function parsearFechaIso(fechaIso) {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso || '');
    if (!coincidencia) {
      return null;
    }
    const [, anio, mes, dia] = coincidencia.map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    const esCoherente =
      fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    return esCoherente ? fecha : null;
  }

  /**
   * Convierte un objeto Date en cadena ISO local "AAAA-MM-DD".
   * @param {Date} fecha
   * @returns {string}
   */
  function aFechaIso(fecha) {
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
  }

  /**
   * Devuelve la fecha actual en formato ISO local.
   * @returns {string}
   */
  function fechaHoyIso() {
    return aFechaIso(new Date());
  }

  /**
   * Suma (o resta) días a una fecha ISO.
   * @param {string} fechaIso Fecha base.
   * @param {number} dias Días a sumar; puede ser negativo.
   * @returns {string} Nueva fecha ISO o cadena vacía si la base es inválida.
   */
  function sumarDias(fechaIso, dias) {
    const fecha = parsearFechaIso(fechaIso);
    if (!fecha || !Number.isFinite(Number(dias))) {
      return '';
    }
    fecha.setDate(fecha.getDate() + Number(dias));
    return aFechaIso(fecha);
  }

  /**
   * Calcula los días calendario entre dos fechas ISO (destino - origen).
   * @param {string} origenIso
   * @param {string} destinoIso
   * @returns {number|null}
   */
  function diasEntre(origenIso, destinoIso) {
    const origen = parsearFechaIso(origenIso);
    const destino = parsearFechaIso(destinoIso);
    if (!origen || !destino) {
      return null;
    }
    return Math.round((destino - origen) / MS_POR_DIA);
  }

  /**
   * Formatea una fecha ISO como "DD/MM/AAAA".
   * @param {string} fechaIso
   * @returns {string} Fecha legible o "—" si no hay valor.
   */
  function formatearFecha(fechaIso) {
    const fecha = parsearFechaIso(fechaIso);
    if (!fecha) {
      return '—';
    }
    return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
  }

  /**
   * Formatea una marca de tiempo ISO completa como "DD/MM/AAAA HH:mm".
   * @param {string} marcaIso Fecha y hora en formato ISO 8601.
   * @returns {string}
   */
  function formatearFechaHora(marcaIso) {
    const fecha = new Date(marcaIso);
    if (Number.isNaN(fecha.getTime())) {
      return '—';
    }
    return `${formatearFecha(aFechaIso(fecha))} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  }

  /**
   * Formatea un número con separadores de miles según la convención colombiana.
   * @param {number} numero
   * @param {number} [decimales=0]
   * @returns {string}
   */
  function formatearNumero(numero, decimales = 0) {
    const valor = Number(numero) || 0;
    return valor.toLocaleString('es-CO', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  }

  /**
   * Normaliza un texto para comparaciones de búsqueda: minúsculas y sin tildes.
   * @param {string} texto
   * @returns {string}
   */
  function normalizarTexto(texto) {
    return String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Genera un identificador único con prefijo (p. ej. "AUD-lx3k9-a1b2").
   * @param {string} prefijo
   * @returns {string}
   */
  function generarId(prefijo) {
    const tiempo = Date.now().toString(36);
    const aleatorio = Math.random().toString(36).slice(2, 8);
    return `${prefijo}-${tiempo}-${aleatorio}`;
  }

  SGEDF.Formato = Object.freeze({
    escaparHtml,
    parsearFechaIso,
    aFechaIso,
    fechaHoyIso,
    sumarDias,
    diasEntre,
    formatearFecha,
    formatearFechaHora,
    formatearNumero,
    normalizarTexto,
    generarId,
  });
})((window.SGEDF = window.SGEDF || {}));
