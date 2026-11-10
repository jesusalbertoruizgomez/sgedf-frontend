/**
 * @file Servicio de autenticación y control de sesión.
 * @description Implementa el caso de uso "Iniciar sesión" con control de acceso
 * basado en roles (RBAC). Controles de seguridad aplicados:
 *  - Contraseñas verificadas contra su resumen SHA-256 con sal.
 *  - Mensaje de error genérico (no revela si el usuario existe).
 *  - Bloqueo temporal tras varios intentos fallidos consecutivos.
 *  - Cierre automático de sesión por inactividad.
 *  - Registro en bitácora de cada ingreso, fallo, bloqueo y salida.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, Auditoria, Usuarios } = SGEDF;
  const CLAVE_SESION = Config.CLAVES_ALMACENAMIENTO.SESION;
  const CLAVE_INTENTOS = Config.CLAVES_ALMACENAMIENTO.INTENTOS;
  const MS_POR_MINUTO = 60 * 1000;

  /** Intervalo mínimo entre escrituras de "última actividad" (evita escrituras excesivas). */
  const MS_REFRESCO_ACTIVIDAD = 30 * 1000;

  /**
   * @typedef {Object} Sesion
   * @property {string} identificacion Usuario autenticado.
   * @property {string} rol Rol con el que ingresó.
   * @property {number} inicio Marca de tiempo (ms) del ingreso.
   * @property {number} ultimaActividad Marca de tiempo (ms) de la última interacción.
   */

  /**
   * Lee el estado de intentos fallidos de una credencial.
   * @param {string} credencial
   * @returns {{cantidad: number, bloqueadoHasta: number}}
   */
  function leerIntentos(credencial) {
    const intentos = Almacenamiento.local.leer(CLAVE_INTENTOS, {});
    return intentos[credencial] || { cantidad: 0, bloqueadoHasta: 0 };
  }

  /**
   * Guarda (o elimina, si es null) el estado de intentos de una credencial.
   * @param {string} credencial
   * @param {{cantidad: number, bloqueadoHasta: number}|null} estado
   */
  function guardarIntentos(credencial, estado) {
    const intentos = Almacenamiento.local.leer(CLAVE_INTENTOS, {});
    if (estado) {
      intentos[credencial] = estado;
    } else {
      delete intentos[credencial];
    }
    Almacenamiento.local.escribir(CLAVE_INTENTOS, intentos);
  }

  /**
   * Minutos que faltan para que termine el bloqueo de una credencial.
   * @param {string} credencial
   * @returns {number} 0 si no está bloqueada.
   */
  function minutosRestantesBloqueo(credencial) {
    const { bloqueadoHasta } = leerIntentos(credencial);
    const restante = bloqueadoHasta - Date.now();
    return restante > 0 ? Math.ceil(restante / MS_POR_MINUTO) : 0;
  }

  /**
   * Registra un intento fallido y aplica el bloqueo si se alcanza el máximo.
   * @param {string} credencial
   * @returns {number} Intentos restantes antes del bloqueo (0 si quedó bloqueada).
   */
  function registrarIntentoFallido(credencial) {
    const estado = leerIntentos(credencial);
    const cantidad =
      (estado.bloqueadoHasta && estado.bloqueadoHasta <= Date.now() ? 0 : estado.cantidad) + 1;

    if (cantidad >= Config.MAX_INTENTOS_FALLIDOS) {
      guardarIntentos(credencial, {
        cantidad: 0,
        bloqueadoHasta: Date.now() + Config.MINUTOS_BLOQUEO * MS_POR_MINUTO,
      });
      Auditoria.registrar(
        Auditoria.TIPOS.BLOQUEO_CUENTA,
        `Credencial "${credencial}" bloqueada ${Config.MINUTOS_BLOQUEO} min por ${Config.MAX_INTENTOS_FALLIDOS} intentos fallidos.`,
        { identificacion: credencial, nombreCompleto: 'No autenticado' }
      );
      return 0;
    }
    guardarIntentos(credencial, { cantidad, bloqueadoHasta: 0 });
    return Config.MAX_INTENTOS_FALLIDOS - cantidad;
  }

  /**
   * Autentica a un usuario con el rol seleccionado.
   * @param {string} credencial Identificación o correo.
   * @param {string} contrasena Contraseña en texto plano.
   * @param {string} rol Rol con el que desea ingresar.
   * @returns {{exito: boolean, mensaje?: string, usuario?: SGEDF.Usuario}}
   */
  function iniciarSesion(credencial, contrasena, rol) {
    const clave = String(credencial || '')
      .trim()
      .toLowerCase();
    if (!clave || !contrasena) {
      return { exito: false, mensaje: 'Ingrese su usuario y contraseña.' };
    }

    const minutosBloqueo = minutosRestantesBloqueo(clave);
    if (minutosBloqueo > 0) {
      return {
        exito: false,
        mensaje: `Acceso bloqueado temporalmente. Intente de nuevo en ${minutosBloqueo} minuto(s).`,
      };
    }

    const usuario = Usuarios.buscarPorCredencial(clave);
    const credencialesValidas = Boolean(
      usuario && usuario.activo && usuario.verificarContrasena(contrasena)
    );

    if (!credencialesValidas) {
      const restantes = registrarIntentoFallido(clave);
      Auditoria.registrar(
        Auditoria.TIPOS.INICIO_SESION_FALLIDO,
        `Credenciales inválidas para "${clave}".`,
        { identificacion: clave, nombreCompleto: 'No autenticado' }
      );
      const complemento =
        restantes > 0
          ? ` Le quedan ${restantes} intento(s).`
          : ` Acceso bloqueado por ${Config.MINUTOS_BLOQUEO} minutos.`;
      return { exito: false, mensaje: `Usuario o contraseña incorrectos.${complemento}` };
    }

    if (!usuario.tieneRol(rol)) {
      Auditoria.registrar(
        Auditoria.TIPOS.INICIO_SESION_FALLIDO,
        `Intento de ingreso con rol no asignado (${Config.NOMBRES_ROL[rol] || rol}).`,
        usuario
      );
      return { exito: false, mensaje: 'Su cuenta no tiene asignado el rol seleccionado.' };
    }

    guardarIntentos(clave, null);
    Usuarios.registrarAcceso(usuario.identificacion);
    const ahora = Date.now();
    Almacenamiento.sesion.escribir(CLAVE_SESION, {
      identificacion: usuario.identificacion,
      rol,
      inicio: ahora,
      ultimaActividad: ahora,
    });
    Auditoria.registrar(
      Auditoria.TIPOS.INICIO_SESION,
      `Ingreso con rol ${Config.NOMBRES_ROL[rol]}.`,
      usuario
    );
    return { exito: true, usuario };
  }

  /**
   * Devuelve la sesión almacenada o null si no hay sesión.
   * @returns {Sesion|null}
   */
  function obtenerSesion() {
    return Almacenamiento.sesion.leer(CLAVE_SESION, null);
  }

  /**
   * Devuelve el usuario autenticado, siempre que su cuenta siga activa.
   * @returns {SGEDF.Usuario|null}
   */
  function usuarioActual() {
    const sesion = obtenerSesion();
    if (!sesion) {
      return null;
    }
    const usuario = Usuarios.buscar(sesion.identificacion);
    return usuario && usuario.activo ? usuario : null;
  }

  /** @returns {string|null} Rol con el que se inició la sesión. */
  function rolActivo() {
    const sesion = obtenerSesion();
    return sesion ? sesion.rol : null;
  }

  /**
   * Indica si la sesión superó el tiempo máximo de inactividad.
   * @returns {boolean}
   */
  function sesionExpirada() {
    const sesion = obtenerSesion();
    if (!sesion) {
      return true;
    }
    return Date.now() - sesion.ultimaActividad > Config.MINUTOS_INACTIVIDAD * MS_POR_MINUTO;
  }

  /** Actualiza la marca de última actividad de la sesión. */
  function registrarActividad() {
    const sesion = obtenerSesion();
    if (sesion && Date.now() - sesion.ultimaActividad > MS_REFRESCO_ACTIVIDAD) {
      sesion.ultimaActividad = Date.now();
      Almacenamiento.sesion.escribir(CLAVE_SESION, sesion);
    }
  }

  /**
   * Verifica si el rol activo está dentro de los roles permitidos.
   * @param {string[]} rolesPermitidos
   * @returns {boolean}
   */
  function tienePermiso(rolesPermitidos) {
    const rol = rolActivo();
    return Boolean(rol && usuarioActual() && rolesPermitidos.includes(rol));
  }

  /**
   * Cierra la sesión activa y deja constancia en la bitácora.
   * @param {'manual'|'inactividad'} [motivo='manual']
   */
  function cerrarSesion(motivo = 'manual') {
    const usuario = usuarioActual();
    if (usuario) {
      const porInactividad = motivo === 'inactividad';
      Auditoria.registrar(
        porInactividad ? Auditoria.TIPOS.CIERRE_INACTIVIDAD : Auditoria.TIPOS.CIERRE_SESION,
        porInactividad
          ? `Sesión cerrada tras ${Config.MINUTOS_INACTIVIDAD} minutos sin actividad.`
          : 'Salida voluntaria del sistema.',
        usuario
      );
    }
    Almacenamiento.sesion.eliminar(CLAVE_SESION);
  }

  SGEDF.Autenticacion = Object.freeze({
    iniciarSesion,
    cerrarSesion,
    obtenerSesion,
    usuarioActual,
    rolActivo,
    sesionExpirada,
    registrarActividad,
    tienePermiso,
    minutosRestantesBloqueo,
  });
})((window.SGEDF = window.SGEDF || {}));
