/**
 * @file Datos iniciales (semilla) del sistema.
 * @description La primera vez que se abre la aplicación en un navegador crea el
 * usuario administrador, un perito de demostración y órdenes de ejemplo para
 * que el evaluador pueda recorrer todos los módulos. Las fechas de las órdenes
 * activas se calculan relativas a la fecha actual para que siempre se aprecien
 * las alertas de vencimiento.
 *
 * Los datos de las órdenes son ficticios y solo tienen fines académicos.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Almacenamiento, Usuario, OrdenTrabajo, Usuarios, Ordenes, Auditoria, Formato } =
    SGEDF;

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
   * Crea las órdenes de ejemplo.
   * @param {Usuario} peritoPrincipal
   * @param {Usuario} peritoDemo
   * @returns {OrdenTrabajo[]}
   */
  function crearOrdenesSemilla(peritoPrincipal, peritoDemo) {
    const hoy = Formato.fechaHoyIso();
    const asignar = (usuario) => ({
      identificacion: usuario.identificacion,
      nombre: usuario.nombreCompleto,
    });

    return [
      new OrdenTrabajo({
        numero: 'OT-2026-001',
        fechaInicio: '2026-01-15',
        fechaVigencia: '2026-04-15',
        clase: 'Judicial',
        estado: 'Resuelta',
        perito: asignar(peritoPrincipal),
        policiaJudicial: {
          nunc: '110016000014202600024',
          delito: 'Acceso abusivo a un sistema informático',
          autoridadSolicitante: 'Fiscalía 24 Seccional',
          ciudadAutoridad: 'Bogotá D.C.',
          plazoDias: 90,
        },
        solicitudAnalisis: {
          numero: 'FPJ-12-2026-0024',
          nombreSolicitante: 'Det. Luis Herrera',
          dependencia: 'DIJIN',
          ciudad: 'Bogotá D.C.',
          telefono: '601-3420000',
          correo: 'luis.herrera@ejemplo.gov.co',
        },
        dispositivos: { moviles: 3, simCard: 3, microSd: 2, computo: 1, discosDuros: 2, usb: 0 },
        totalGb: 1240,
        herramientas: ['Cellebrite', 'FTK Imager', 'Magnet Axiom'],
        informe: {
          fechaInforme: '2026-03-10',
          funcionarioReclama: 'Det. Luis Herrera – DIJIN',
          fechaReclamacion: '2026-03-12',
        },
        observaciones:
          'Se identificaron comunicaciones cifradas mediante Signal. Se realizó extracción forense completa con hash MD5/SHA-256 para garantizar la integridad de las evidencias.',
      }),
      new OrdenTrabajo({
        numero: 'OT-2026-002',
        fechaInicio: Formato.sumarDias(hoy, -20),
        fechaVigencia: Formato.sumarDias(hoy, 40),
        clase: 'Judicial',
        estado: 'Vigente',
        perito: asignar(peritoPrincipal),
        policiaJudicial: {
          nunc: '520016099032202600157',
          delito: 'Hurto por medios informáticos y semejantes',
          autoridadSolicitante: 'Fiscalía 12 Local',
          ciudadAutoridad: 'Pasto',
          plazoDias: 30,
        },
        solicitudAnalisis: {
          numero: 'FPJ-12-2026-0157',
          nombreSolicitante: 'Int. Andrés Guerrero',
          dependencia: 'SIJIN DENAR',
          ciudad: 'Pasto',
        },
        dispositivos: { moviles: 2, simCard: 2, microSd: 1, computo: 0, discosDuros: 0, usb: 1 },
        totalGb: 384.5,
        herramientas: ['Cellebrite', 'Magnet Axiom', 'TX1'],
      }),
      new OrdenTrabajo({
        numero: 'OT-2026-003',
        fechaInicio: Formato.sumarDias(hoy, -55),
        fechaVigencia: Formato.sumarDias(hoy, 5),
        clase: 'Judicial',
        estado: 'Prorrogada',
        perito: asignar(peritoDemo),
        policiaJudicial: {
          nunc: '520016000485202600089',
          delito: 'Transferencia no consentida de activos',
          autoridadSolicitante: 'Fiscalía 5 Seccional',
          ciudadAutoridad: 'Pasto',
          plazoDias: 60,
        },
        solicitudAnalisis: {
          numero: 'FPJ-12-2026-0089',
          nombreSolicitante: 'PT. Diana Rosero',
          dependencia: 'SIJIN DENAR',
          ciudad: 'Pasto',
        },
        dispositivos: { moviles: 1, simCard: 1, microSd: 0, computo: 1, discosDuros: 1, usb: 2 },
        totalGb: 960,
        herramientas: ['Encase Forensic', 'FTK Imager', 'TD3'],
      }),
    ];
  }

  /**
   * Carga los datos iniciales si el almacenamiento está vacío o desactualizado.
   * @returns {boolean} Verdadero si se cargaron datos nuevos.
   */
  function inicializar() {
    const version = Almacenamiento.local.leer(Config.CLAVES_ALMACENAMIENTO.VERSION_DATOS, 0);
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

    Usuarios.guardarTodos([administrador, peritoDemo]);
    Ordenes.guardarTodas(crearOrdenesSemilla(administrador, peritoDemo));
    Almacenamiento.local.escribir(Config.CLAVES_ALMACENAMIENTO.VERSION_DATOS, Config.VERSION_DATOS);
    Auditoria.registrar(
      Auditoria.TIPOS.INICIALIZACION,
      'Carga de datos iniciales: 2 usuarios y 3 órdenes de demostración.',
      { identificacion: 'sistema', nombreCompleto: 'Sistema' }
    );
    return true;
  }

  SGEDF.DatosSemilla = Object.freeze({ inicializar });
})((window.SGEDF = window.SGEDF || {}));
