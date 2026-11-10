/**
 * @file Servicio de gestión de usuarios (historia de usuario HU-03).
 * @description Permite al Responsable del Laboratorio crear, modificar, activar,
 * desactivar y eliminar cuentas. Aplica reglas de integridad: identificación y
 * correo únicos, política de contraseñas, al menos un administrador activo y
 * prohibición de eliminar peritos con órdenes asignadas.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, Usuario, Validadores, Auditoria } = SGEDF;
  const CLAVE = Config.CLAVES_ALMACENAMIENTO.USUARIOS;

  /**
   * @typedef {Object} ResultadoOperacion
   * @property {boolean} exito Indica si la operación se completó.
   * @property {string} [mensaje] Mensaje general para el usuario.
   * @property {Object<string,string>} [errores] Errores por campo.
   * @property {Usuario} [usuario] Usuario afectado.
   */

  /**
   * Lista todos los usuarios ordenados por nombre.
   * @returns {Usuario[]}
   */
  function listar() {
    return Almacenamiento.local
      .leer(CLAVE, [])
      .map(Usuario.desdeObjeto)
      .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
  }

  /**
   * Persiste la colección completa de usuarios.
   * @param {Usuario[]} usuarios
   */
  function guardarTodos(usuarios) {
    Almacenamiento.local.escribir(
      CLAVE,
      usuarios.map((usuario) => usuario.aObjetoPlano())
    );
  }

  /**
   * Busca un usuario por su identificación.
   * @param {string} identificacion
   * @returns {Usuario|null}
   */
  function buscar(identificacion) {
    const id = String(identificacion || '').trim();
    return listar().find((usuario) => usuario.identificacion === id) || null;
  }

  /**
   * Busca un usuario por identificación o por correo (credencial de ingreso).
   * @param {string} credencial
   * @returns {Usuario|null}
   */
  function buscarPorCredencial(credencial) {
    const valor = String(credencial || '')
      .trim()
      .toLowerCase();
    return (
      listar().find((usuario) => usuario.identificacion === valor || usuario.correo === valor) ||
      null
    );
  }

  /**
   * Cuenta los administradores activos, excluyendo opcionalmente a un usuario.
   * @param {Usuario[]} usuarios
   * @param {string} [excluirId]
   * @returns {number}
   */
  function contarAdministradoresActivos(usuarios, excluirId) {
    return usuarios.filter(
      (u) => u.activo && u.tieneRol(Config.ROLES.ADMIN) && u.identificacion !== excluirId
    ).length;
  }

  /**
   * Valida la contraseña y su confirmación.
   * @param {string} contrasena
   * @param {string} confirmacion
   * @param {Object<string,string>} errores Mapa donde se agregan los errores.
   */
  function validarContrasena(contrasena, confirmacion, errores) {
    if (!Validadores.esContrasenaSegura(contrasena)) {
      errores.contrasena = `Mínimo ${Config.LONGITUD_MINIMA_CONTRASENA} caracteres, con mayúscula, minúscula y número.`;
    }
    if (contrasena !== confirmacion) {
      errores.confirmacion = 'Las contraseñas no coinciden.';
    }
  }

  /**
   * Identificación del usuario con sesión activa (para impedir auto-eliminación).
   * @returns {string|null}
   */
  function idUsuarioActual() {
    const actual = SGEDF.Autenticacion ? SGEDF.Autenticacion.usuarioActual() : null;
    return actual ? actual.identificacion : null;
  }

  /**
   * Crea un nuevo usuario.
   * @param {Object} datos Datos del formulario (incluye contrasena y confirmacion).
   * @returns {ResultadoOperacion}
   */
  function crear(datos) {
    const usuarios = listar();
    const nuevo = new Usuario({ ...datos, activo: true });
    const errores = nuevo.validar();

    if (usuarios.some((u) => u.identificacion === nuevo.identificacion)) {
      errores.identificacion = 'Ya existe un usuario con esta identificación.';
    }
    if (usuarios.some((u) => u.correo === nuevo.correo)) {
      errores.correo = 'El correo ya está registrado para otro usuario.';
    }
    validarContrasena(datos.contrasena, datos.confirmacion, errores);

    if (Object.keys(errores).length > 0) {
      return { exito: false, errores, mensaje: 'Revise los campos señalados.' };
    }

    nuevo.establecerContrasena(datos.contrasena);
    usuarios.push(nuevo);
    guardarTodos(usuarios);
    Auditoria.registrar(
      Auditoria.TIPOS.CREACION_USUARIO,
      `Usuario ${nuevo.identificacion} (${nuevo.descripcionRoles}) creado.`
    );
    return { exito: true, usuario: nuevo, mensaje: 'Usuario creado correctamente.' };
  }

  /**
   * Actualiza los datos de un usuario existente. La contraseña es opcional:
   * solo se cambia si se diligencia.
   * @param {string} identificacion Usuario a modificar (no se puede cambiar).
   * @param {Object} datos
   * @returns {ResultadoOperacion}
   */
  function actualizar(identificacion, datos) {
    const usuarios = listar();
    const indice = usuarios.findIndex((u) => u.identificacion === identificacion);
    if (indice === -1) {
      return { exito: false, mensaje: 'El usuario no existe.' };
    }

    const actual = usuarios[indice];
    const modificado = new Usuario({
      ...actual.aObjetoPlano(),
      nombreCompleto: datos.nombreCompleto,
      grado: datos.grado,
      correo: datos.correo,
      roles: datos.roles,
    });
    const errores = modificado.validar();

    if (
      usuarios.some((u) => u.correo === modificado.correo && u.identificacion !== identificacion)
    ) {
      errores.correo = 'El correo ya está registrado para otro usuario.';
    }
    const pierdeAdmin =
      actual.tieneRol(Config.ROLES.ADMIN) && !modificado.tieneRol(Config.ROLES.ADMIN);
    if (pierdeAdmin && identificacion === idUsuarioActual()) {
      errores.roles = 'No puede retirarse a sí mismo el rol de administrador.';
    } else if (pierdeAdmin && contarAdministradoresActivos(usuarios, identificacion) === 0) {
      errores.roles = 'Debe existir al menos un administrador activo.';
    }
    if (datos.contrasena || datos.confirmacion) {
      validarContrasena(datos.contrasena, datos.confirmacion, errores);
    }

    if (Object.keys(errores).length > 0) {
      return { exito: false, errores, mensaje: 'Revise los campos señalados.' };
    }

    if (datos.contrasena) {
      modificado.establecerContrasena(datos.contrasena);
    }
    usuarios[indice] = modificado;
    guardarTodos(usuarios);
    Auditoria.registrar(
      Auditoria.TIPOS.ACTUALIZACION_USUARIO,
      `Usuario ${identificacion} actualizado${datos.contrasena ? ' (incluye cambio de contraseña)' : ''}.`
    );
    return { exito: true, usuario: modificado, mensaje: 'Usuario actualizado correctamente.' };
  }

  /**
   * Activa o desactiva una cuenta.
   * @param {string} identificacion
   * @param {boolean} activo Nuevo estado.
   * @returns {ResultadoOperacion}
   */
  function cambiarEstado(identificacion, activo) {
    const usuarios = listar();
    const usuario = usuarios.find((u) => u.identificacion === identificacion);
    if (!usuario) {
      return { exito: false, mensaje: 'El usuario no existe.' };
    }
    if (!activo && identificacion === idUsuarioActual()) {
      return { exito: false, mensaje: 'No puede desactivar su propia cuenta.' };
    }
    if (
      !activo &&
      usuario.tieneRol(Config.ROLES.ADMIN) &&
      contarAdministradoresActivos(usuarios, identificacion) === 0
    ) {
      return { exito: false, mensaje: 'Debe existir al menos un administrador activo.' };
    }

    usuario.activo = Boolean(activo);
    guardarTodos(usuarios);
    Auditoria.registrar(
      Auditoria.TIPOS.CAMBIO_ESTADO_USUARIO,
      `Usuario ${identificacion} ${usuario.activo ? 'activado' : 'desactivado'}.`
    );
    return {
      exito: true,
      usuario,
      mensaje: `Usuario ${usuario.activo ? 'activado' : 'desactivado'} correctamente.`,
    };
  }

  /**
   * Elimina una cuenta si no compromete la integridad de los datos.
   * @param {string} identificacion
   * @returns {ResultadoOperacion}
   */
  function eliminar(identificacion) {
    const usuarios = listar();
    const usuario = usuarios.find((u) => u.identificacion === identificacion);
    if (!usuario) {
      return { exito: false, mensaje: 'El usuario no existe.' };
    }
    if (identificacion === idUsuarioActual()) {
      return { exito: false, mensaje: 'No puede eliminar su propia cuenta.' };
    }
    if (
      usuario.tieneRol(Config.ROLES.ADMIN) &&
      contarAdministradoresActivos(usuarios, identificacion) === 0
    ) {
      return { exito: false, mensaje: 'Debe existir al menos un administrador activo.' };
    }
    const ordenesAsignadas = SGEDF.Ordenes ? SGEDF.Ordenes.contarPorPerito(identificacion) : 0;
    if (ordenesAsignadas > 0) {
      return {
        exito: false,
        mensaje: `El usuario tiene ${ordenesAsignadas} orden(es) asignada(s). Desactívelo en lugar de eliminarlo.`,
      };
    }

    guardarTodos(usuarios.filter((u) => u.identificacion !== identificacion));
    Auditoria.registrar(
      Auditoria.TIPOS.ELIMINACION_USUARIO,
      `Usuario ${identificacion} eliminado.`
    );
    return { exito: true, mensaje: 'Usuario eliminado correctamente.' };
  }

  /**
   * Actualiza la marca de último acceso de un usuario.
   * @param {string} identificacion
   */
  function registrarAcceso(identificacion) {
    const usuarios = listar();
    const usuario = usuarios.find((u) => u.identificacion === identificacion);
    if (usuario) {
      usuario.ultimoAcceso = new Date().toISOString();
      guardarTodos(usuarios);
    }
  }

  SGEDF.Usuarios = Object.freeze({
    listar,
    guardarTodos,
    buscar,
    buscarPorCredencial,
    crear,
    actualizar,
    cambiarEstado,
    eliminar,
    registrarAcceso,
  });
})((window.SGEDF = window.SGEDF || {}));
