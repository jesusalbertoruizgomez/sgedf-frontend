/**
 * @file Datos iniciales (semilla) del sistema.
 * @description La primera vez que se abre la aplicación en un navegador crea
 * únicamente las cuentas de usuario necesarias para ingresar. El sistema inicia
 * sin órdenes de trabajo, de modo que todos los indicadores del tablero aparecen
 * en cero hasta que el perito registre la primera orden.
 *
 * Si se detecta una versión anterior de los datos (por ejemplo, la v1 que incluía
 * órdenes de demostración), el almacenamiento local se reinicia.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, Usuario, Usuarios, Ordenes, Auditoria } = SGEDF;
  const CLAVES = Config.CLAVES_ALMACENAMIENTO;

  /** Contraseñas iniciales documentadas en el README (deben cambiarse en producción). */
  const CONTRASENA_ADMIN_INICIAL = 'Forense2026';
  const CONTRASENA_PERITO_DEMO = 'Perito2026';

  /**
   * Construye un usuario con su contraseña ya resumida.
   * @param {Object} datos
   * @param {string} contrasena
   * @returns {Usuario}
   */
  function crearUsuarioSemilla(datos, contrasena) {
    const usuario = new Usuario(datos);
    usuario.establecerContrasena(contrasena);
    return usuario;
  }

  /**
   * Carga los datos iniciales si el almacenamiento está vacío o desactualizado.
   * @returns {boolean} Verdadero si se cargaron datos nuevos.
   */
  function inicializar() {
    const version = Almacenamiento.local.leer(CLAVES.VERSION_DATOS, 0);
    if (version === Config.VERSION_DATOS && Usuarios.listar().length > 0) {
      return false;
    }

    const administrador = crearUsuarioSemilla(
      {
        identificacion: '1100503738',
        nombreCompleto: 'Jesús Alberto Ruiz Gómez',
        grado: '',
        correo: 'jesusruizgomez.a@gmail.com',
        roles: [Config.ROLES.PERITO, Config.ROLES.ADMIN],
      },
      CONTRASENA_ADMIN_INICIAL
    );
    const peritoDemo = crearUsuarioSemilla(
      {
        identificacion: '1085123456',
        nombreCompleto: 'Laura Camila Benavides Rosero',
        grado: 'Subintendente',
        correo: 'lbenavides.demo@ejemplo.gov.co',
        roles: [Config.ROLES.PERITO],
      },
      CONTRASENA_PERITO_DEMO
    );

    // Reinicio completo: cuentas iniciales, sin órdenes, bitácora e intentos vacíos.
    Usuarios.guardarTodos([administrador, peritoDemo]);
    Ordenes.guardarTodas([]);
    Almacenamiento.local.escribir(CLAVES.AUDITORIA, []);
    Almacenamiento.local.escribir(CLAVES.INTENTOS, {});
    Almacenamiento.local.escribir(CLAVES.VERSION_DATOS, Config.VERSION_DATOS);
    Auditoria.registrar(
      Auditoria.TIPOS.INICIALIZACION,
      'Carga de datos iniciales: 2 cuentas de usuario, sin órdenes de trabajo registradas.',
      { identificacion: 'sistema', nombreCompleto: 'Sistema' }
    );
    return true;
  }

  SGEDF.DatosSemilla = Object.freeze({ inicializar });
})((window.SGEDF = window.SGEDF || {}));
