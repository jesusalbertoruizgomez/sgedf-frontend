/**
 * @file Reglas de validación de datos de entrada.
 * @description Funciones puras (sin efectos secundarios) que verifican el formato de
 * los datos antes de procesarlos. Se reutilizan en los modelos y en los formularios.
 */
(function (SGEDF) {
  'use strict';

  /** Expresiones regulares de los formatos institucionales. */
  const PATRONES = Object.freeze({
    /** Número de orden de trabajo: OT-AAAA-NNN (consecutivo de 3 a 5 dígitos). */
    ORDEN_TRABAJO: /^OT-\d{4}-\d{3,5}$/,
    /** Número Único de Noticia Criminal (SPOA): 21 dígitos. */
    NUNC: /^\d{21}$/,
    /** Cédula de ciudadanía: entre 6 y 10 dígitos. */
    CEDULA: /^\d{6,10}$/,
    /** Correo electrónico con estructura usuario@dominio.ext. */
    CORREO: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    /** Teléfono: dígitos, espacios, guiones, paréntesis y signo +. */
    TELEFONO: /^[0-9+\-\s()]{7,20}$/,
  });

  /**
   * Indica si un valor tiene contenido (no vacío ni solo espacios).
   * @param {*} valor
   * @returns {boolean}
   */
  function esRequerido(valor) {
    if (Array.isArray(valor)) {
      return valor.length > 0;
    }
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
  }

  /**
   * @param {string} valor
   * @returns {boolean}
   */
  function esNumeroOrdenTrabajo(valor) {
    return PATRONES.ORDEN_TRABAJO.test(String(valor || '').trim());
  }

  /**
   * @param {string} valor
   * @returns {boolean}
   */
  function esNunc(valor) {
    return PATRONES.NUNC.test(String(valor || '').trim());
  }

  /**
   * @param {string} valor
   * @returns {boolean}
   */
  function esCedula(valor) {
    return PATRONES.CEDULA.test(String(valor || '').trim());
  }

  /**
   * @param {string} valor
   * @returns {boolean}
   */
  function esCorreo(valor) {
    return PATRONES.CORREO.test(String(valor || '').trim());
  }

  /**
   * @param {string} valor
   * @returns {boolean}
   */
  function esTelefono(valor) {
    return PATRONES.TELEFONO.test(String(valor || '').trim());
  }

  /**
   * Verifica que el valor sea un número entero mayor o igual a cero.
   * @param {*} valor
   * @returns {boolean}
   */
  function esEnteroNoNegativo(valor) {
    const numero = Number(valor);
    return String(valor).trim() !== '' && Number.isInteger(numero) && numero >= 0;
  }

  /**
   * Verifica que el valor sea un número (entero o decimal) mayor o igual a cero.
   * @param {*} valor
   * @returns {boolean}
   */
  function esNumeroNoNegativo(valor) {
    const numero = Number(valor);
    return String(valor).trim() !== '' && Number.isFinite(numero) && numero >= 0;
  }

  /**
   * Verifica que una fecha ISO "AAAA-MM-DD" exista en el calendario.
   * @param {string} valor
   * @returns {boolean}
   */
  function esFechaValida(valor) {
    return SGEDF.Formato.parsearFechaIso(valor) !== null;
  }

  /**
   * Verifica que la fecha final no sea anterior a la inicial.
   * @param {string} fechaInicialIso
   * @param {string} fechaFinalIso
   * @returns {boolean}
   */
  function esFechaNoAnterior(fechaInicialIso, fechaFinalIso) {
    const dias = SGEDF.Formato.diasEntre(fechaInicialIso, fechaFinalIso);
    return dias !== null && dias >= 0;
  }

  /**
   * Política de contraseñas: longitud mínima, mayúscula, minúscula y dígito.
   * @param {string} valor
   * @returns {boolean}
   */
  function esContrasenaSegura(valor) {
    const texto = String(valor || '');
    return (
      texto.length >= SGEDF.Config.LONGITUD_MINIMA_CONTRASENA &&
      /[A-ZÑ]/.test(texto) &&
      /[a-zñ]/.test(texto) &&
      /\d/.test(texto)
    );
  }

  SGEDF.Validadores = Object.freeze({
    PATRONES,
    esRequerido,
    esNumeroOrdenTrabajo,
    esNunc,
    esCedula,
    esCorreo,
    esTelefono,
    esEnteroNoNegativo,
    esNumeroNoNegativo,
    esFechaValida,
    esFechaNoAnterior,
    esContrasenaSegura,
  });
})((window.SGEDF = window.SGEDF || {}));
