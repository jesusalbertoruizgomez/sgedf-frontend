/**
 * @file Servicio de auditoría (bitácora de accesos y operaciones).
 * @description Registra y consulta las acciones realizadas en el sistema. Los
 * registros solo se agregan; ninguna funcionalidad permite editarlos o borrarlos.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, RegistroAuditoria, Formato } = SGEDF;
  const CLAVE = Config.CLAVES_ALMACENAMIENTO.AUDITORIA;

  /**
   * Tipos de acción para usar como constantes (TIPOS.INICIO_SESION === 'INICIO_SESION'),
   * lo que evita errores tipográficos al registrar eventos.
   */
  const TIPOS = Object.freeze(
    Object.keys(RegistroAuditoria.ACCIONES).reduce((tipos, clave) => {
      tipos[clave] = clave;
      return tipos;
    }, {})
  );

  /**
   * Devuelve todos los registros, del más reciente al más antiguo.
   * @returns {RegistroAuditoria[]}
   */
  function listarTodos() {
    return Almacenamiento.local.leer(CLAVE, []).map(RegistroAuditoria.desdeObjeto);
  }

  /**
   * Agrega un registro a la bitácora.
   * @param {string} accion Clave de RegistroAuditoria.ACCIONES.
   * @param {string} detalle Descripción de la operación.
   * @param {{identificacion: string, nombreCompleto: string}} [actor] Usuario que actúa;
   *   si se omite se toma el usuario de la sesión activa.
   * @returns {RegistroAuditoria}
   */
  function registrar(accion, detalle, actor) {
    const usuario =
      actor || (SGEDF.Autenticacion ? SGEDF.Autenticacion.usuarioActual() : null) || {};
    const registro = new RegistroAuditoria({
      accion,
      detalle,
      usuario: usuario.identificacion,
      nombreUsuario: usuario.nombreCompleto,
    });
    const registros = Almacenamiento.local.leer(CLAVE, []);
    registros.unshift(registro.aObjetoPlano());
    Almacenamiento.local.escribir(CLAVE, registros.slice(0, Config.MAX_REGISTROS_AUDITORIA));
    return registro;
  }

  /**
   * Filtra la bitácora por texto libre, fecha y/o usuario.
   * @param {Object} [filtros={}]
   * @param {string} [filtros.texto] Coincidencia en usuario, nombre, acción o detalle.
   * @param {string} [filtros.fecha] Fecha ISO "AAAA-MM-DD" del registro.
   * @param {string} [filtros.usuario] Identificación exacta del usuario.
   * @param {number} [filtros.limite] Cantidad máxima de resultados.
   * @returns {RegistroAuditoria[]}
   */
  function filtrar(filtros = {}) {
    const texto = Formato.normalizarTexto(filtros.texto);
    const resultado = listarTodos().filter((registro) => {
      const coincideTexto =
        !texto ||
        Formato.normalizarTexto(
          [
            registro.usuario,
            registro.nombreUsuario,
            registro.descripcionAccion,
            registro.detalle,
          ].join(' ')
        ).includes(texto);
      const coincideFecha =
        !filtros.fecha || Formato.aFechaIso(new Date(registro.fechaHora)) === filtros.fecha;
      const coincideUsuario = !filtros.usuario || registro.usuario === filtros.usuario;
      return coincideTexto && coincideFecha && coincideUsuario;
    });
    return filtros.limite ? resultado.slice(0, filtros.limite) : resultado;
  }

  SGEDF.Auditoria = Object.freeze({
    TIPOS,
    ACCIONES: RegistroAuditoria.ACCIONES,
    listarTodos,
    registrar,
    filtrar,
  });
})((window.SGEDF = window.SGEDF || {}));
