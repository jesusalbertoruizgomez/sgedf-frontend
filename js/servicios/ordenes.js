/**
 * @file Servicio de órdenes de trabajo (historias de usuario HU-01 y HU-02).
 * @description Registro, actualización y consulta de órdenes de trabajo con control
 * de acceso: el perito solo ve y modifica las órdenes asignadas a él; el
 * Responsable del Laboratorio consulta todas en modo de solo lectura.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, OrdenTrabajo, Auditoria, Autenticacion, Formato } = SGEDF;
  const CLAVE = Config.CLAVES_ALMACENAMIENTO.ORDENES;

  /**
   * Compara dos órdenes: primero las de inicio más reciente y luego por número.
   * @param {OrdenTrabajo} a
   * @param {OrdenTrabajo} b
   * @returns {number}
   */
  function compararRecientes(a, b) {
    return b.fechaInicio.localeCompare(a.fechaInicio) || b.numero.localeCompare(a.numero);
  }

  /**
   * Devuelve todas las órdenes almacenadas (sin filtrar por permisos).
   * @returns {OrdenTrabajo[]}
   */
  function listarTodas() {
    return Almacenamiento.local
      .leer(CLAVE, [])
      .map(OrdenTrabajo.desdeObjeto)
      .sort(compararRecientes);
  }

  /**
   * Persiste la colección completa de órdenes.
   * @param {OrdenTrabajo[]} ordenes
   */
  function guardarTodas(ordenes) {
    Almacenamiento.local.escribir(
      CLAVE,
      ordenes.map((orden) => orden.aObjetoPlano())
    );
  }

  /**
   * Órdenes que el usuario de la sesión puede consultar según su rol.
   * @returns {OrdenTrabajo[]}
   */
  function listarVisibles() {
    const usuario = Autenticacion.usuarioActual();
    if (!usuario) {
      return [];
    }
    const todas = listarTodas();
    if (Autenticacion.rolActivo() === Config.ROLES.ADMIN) {
      return todas;
    }
    return todas.filter((orden) => orden.perito.identificacion === usuario.identificacion);
  }

  /**
   * Obtiene una orden visible para el usuario actual.
   * @param {string} numero
   * @returns {OrdenTrabajo|null}
   */
  function obtener(numero) {
    const buscado = String(numero || '').toUpperCase();
    return listarVisibles().find((orden) => orden.numero === buscado) || null;
  }

  /**
   * Indica si el usuario actual puede modificar la orden (solo el perito asignado).
   * @param {OrdenTrabajo} orden
   * @returns {boolean}
   */
  function puedeEditar(orden) {
    const usuario = Autenticacion.usuarioActual();
    return Boolean(
      orden &&
      usuario &&
      Autenticacion.rolActivo() === Config.ROLES.PERITO &&
      orden.perito.identificacion === usuario.identificacion
    );
  }

  /**
   * Busca órdenes visibles por texto (número, NUNC o delito) y estado.
   * @param {{texto?: string, estado?: string}} [filtros={}]
   * @returns {OrdenTrabajo[]}
   */
  function buscar(filtros = {}) {
    const texto = Formato.normalizarTexto(filtros.texto);
    return listarVisibles().filter((orden) => {
      const campos = [orden.numero, orden.policiaJudicial.nunc, orden.policiaJudicial.delito];
      const coincideTexto = !texto || Formato.normalizarTexto(campos.join(' ')).includes(texto);
      const coincideEstado = !filtros.estado || orden.estado === filtros.estado;
      return coincideTexto && coincideEstado;
    });
  }

  /**
   * Registra una nueva orden de trabajo asignada al perito de la sesión (HU-01).
   * @param {Object} datos Datos capturados en el formulario.
   * @returns {{exito: boolean, mensaje: string, errores?: Object, orden?: OrdenTrabajo}}
   */
  function crear(datos) {
    const usuario = Autenticacion.usuarioActual();
    if (!usuario || Autenticacion.rolActivo() !== Config.ROLES.PERITO) {
      return { exito: false, mensaje: 'Solo un perito puede registrar órdenes de trabajo.' };
    }

    const ordenes = listarTodas();
    const orden = new OrdenTrabajo({
      ...datos,
      perito: { identificacion: usuario.identificacion, nombre: usuario.nombreCompleto },
      fechaRegistro: new Date().toISOString(),
      fechaActualizacion: null,
    });
    const errores = orden.validar();
    if (ordenes.some((o) => o.numero === orden.numero)) {
      errores.numero = `La orden ${orden.numero} ya está registrada.`;
    }
    if (Object.keys(errores).length > 0) {
      return { exito: false, errores, mensaje: 'Revise los campos señalados.' };
    }

    ordenes.push(orden);
    guardarTodas(ordenes);
    Auditoria.registrar(
      Auditoria.TIPOS.REGISTRO_ORDEN,
      `Orden ${orden.numero} registrada (NUNC ${orden.policiaJudicial.nunc}).`
    );
    return { exito: true, orden, mensaje: `Orden ${orden.numero} guardada correctamente.` };
  }

  /**
   * Actualiza una orden existente del perito actual. El número de la orden, el
   * perito asignado y la fecha de registro no se pueden modificar.
   * @param {string} numero
   * @param {Object} datos
   * @returns {{exito: boolean, mensaje: string, errores?: Object, orden?: OrdenTrabajo}}
   */
  function actualizar(numero, datos) {
    const ordenes = listarTodas();
    const indice = ordenes.findIndex((o) => o.numero === numero);
    if (indice === -1) {
      return { exito: false, mensaje: 'La orden no existe.' };
    }
    const original = ordenes[indice];
    if (!puedeEditar(original)) {
      return { exito: false, mensaje: 'No tiene permisos para modificar esta orden.' };
    }

    const orden = new OrdenTrabajo({
      ...datos,
      numero: original.numero,
      perito: original.perito,
      fechaRegistro: original.fechaRegistro,
      fechaActualizacion: new Date().toISOString(),
    });
    const errores = orden.validar();
    if (Object.keys(errores).length > 0) {
      return { exito: false, errores, mensaje: 'Revise los campos señalados.' };
    }

    ordenes[indice] = orden;
    guardarTodas(ordenes);
    const cambioEstado =
      original.estado !== orden.estado ? ` Estado: ${original.estado} → ${orden.estado}.` : '';
    Auditoria.registrar(
      Auditoria.TIPOS.ACTUALIZACION_ORDEN,
      `Orden ${orden.numero} actualizada.${cambioEstado}`
    );
    return { exito: true, orden, mensaje: `Orden ${orden.numero} actualizada correctamente.` };
  }

  /**
   * Deja constancia en la bitácora de la consulta del detalle de una orden.
   * @param {string} numero
   */
  function registrarConsulta(numero) {
    Auditoria.registrar(
      Auditoria.TIPOS.CONSULTA_ORDEN,
      `Consulta del detalle de la orden ${numero}.`
    );
  }

  /**
   * Calcula los indicadores del tablero a partir de un conjunto de órdenes.
   * @param {OrdenTrabajo[]} ordenes
   * @returns {{total: number, vigentes: number, prorrogadas: number, resueltas: number,
   *   canceladas: number, proximas: OrdenTrabajo[], vencidas: OrdenTrabajo[]}}
   */
  function calcularMetricas(ordenes) {
    const contar = (estado) => ordenes.filter((o) => o.estado === estado).length;
    return {
      total: ordenes.length,
      vigentes: contar('Vigente'),
      prorrogadas: contar('Prorrogada'),
      resueltas: contar('Resuelta'),
      canceladas: contar('Cancelada'),
      proximas: ordenes.filter((o) => o.situacionVencimiento() === 'proxima'),
      vencidas: ordenes.filter((o) => o.situacionVencimiento() === 'vencida'),
    };
  }

  /**
   * Cantidad de órdenes asignadas a un perito (integridad referencial).
   * @param {string} identificacion
   * @returns {number}
   */
  function contarPorPerito(identificacion) {
    return listarTodas().filter((o) => o.perito.identificacion === identificacion).length;
  }

  SGEDF.Ordenes = Object.freeze({
    listarTodas,
    guardarTodas,
    listarVisibles,
    obtener,
    puedeEditar,
    buscar,
    crear,
    actualizar,
    registrarConsulta,
    calcularMetricas,
    contarPorPerito,
  });
})((window.SGEDF = window.SGEDF || {}));
