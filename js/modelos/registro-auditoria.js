/**
 * @file Clase de dominio RegistroAuditoria.
 * @description Cada operación relevante (accesos, registros, consultas, reportes y
 * cambios de usuarios) deja un registro inmutable en la bitácora, como soporte de la
 * trazabilidad exigida por la cadena de custodia y por la norma ISO/IEC 17025.
 */
(function (SGEDF) {
  'use strict';

  /** Catálogo de acciones auditables con su descripción legible. */
  const ACCIONES = Object.freeze({
    INICIALIZACION: 'Inicialización del sistema',
    INICIO_SESION: 'Inicio de sesión',
    INICIO_SESION_FALLIDO: 'Intento de acceso fallido',
    BLOQUEO_CUENTA: 'Bloqueo temporal de cuenta',
    CIERRE_SESION: 'Cierre de sesión',
    CIERRE_INACTIVIDAD: 'Cierre de sesión por inactividad',
    REGISTRO_ORDEN: 'Registro de orden de trabajo',
    ACTUALIZACION_ORDEN: 'Actualización de orden de trabajo',
    CONSULTA_ORDEN: 'Consulta de detalle de orden',
    GENERACION_REPORTE: 'Generación de reporte',
    CREACION_USUARIO: 'Creación de usuario',
    ACTUALIZACION_USUARIO: 'Actualización de usuario',
    CAMBIO_ESTADO_USUARIO: 'Cambio de estado de usuario',
    ELIMINACION_USUARIO: 'Eliminación de usuario',
  });

  /** Texto mostrado en la columna IP mientras no exista back-end que la capture. */
  const IP_NO_DISPONIBLE = 'N/D (cliente)';

  class RegistroAuditoria {
    /**
     * @param {Object} datos
     * @param {string} datos.accion Clave de ACCIONES.
     * @param {string} datos.detalle Descripción de la operación.
     * @param {string} [datos.usuario] Identificación del usuario que actúa.
     * @param {string} [datos.nombreUsuario] Nombre del usuario que actúa.
     * @param {string} [datos.id] Identificador del registro.
     * @param {string} [datos.fechaHora] Marca de tiempo ISO.
     * @param {string} [datos.ip] Dirección IP de origen.
     */
    constructor(datos) {
      this.id = datos.id || SGEDF.Formato.generarId('AUD');
      this.fechaHora = datos.fechaHora || new Date().toISOString();
      this.usuario = datos.usuario || 'sistema';
      this.nombreUsuario = datos.nombreUsuario || 'Sistema';
      this.accion = datos.accion;
      this.detalle = datos.detalle || '';
      this.ip = datos.ip || IP_NO_DISPONIBLE;
    }

    /** @returns {string} Descripción legible de la acción. */
    get descripcionAccion() {
      return ACCIONES[this.accion] || this.accion;
    }

    /** @returns {Object} Objeto plano para persistencia. */
    aObjetoPlano() {
      return {
        id: this.id,
        fechaHora: this.fechaHora,
        usuario: this.usuario,
        nombreUsuario: this.nombreUsuario,
        accion: this.accion,
        detalle: this.detalle,
        ip: this.ip,
      };
    }

    /**
     * @param {Object} objeto
     * @returns {RegistroAuditoria}
     */
    static desdeObjeto(objeto) {
      return new RegistroAuditoria(objeto);
    }
  }

  RegistroAuditoria.ACCIONES = ACCIONES;
  SGEDF.RegistroAuditoria = RegistroAuditoria;
})((window.SGEDF = window.SGEDF || {}));
