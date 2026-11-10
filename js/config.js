/**
 * @file Configuración global y catálogos del SGEDF.
 * @description Centraliza las constantes del sistema para evitar "valores mágicos"
 * dispersos en el código. Los objetos se congelan para impedir su modificación en
 * tiempo de ejecución.
 *
 * Todos los módulos del front-end se registran en el espacio de nombres global
 * `window.SGEDF` siguiendo el patrón módulo (IIFE), lo que permite ejecutar la
 * aplicación tanto desde un servidor web como abriendo index.html directamente.
 */
(function (SGEDF) {
  'use strict';

  /** Roles de usuario reconocidos por el sistema (casos de uso por actor). */
  const ROLES = Object.freeze({
    PERITO: 'perito',
    ADMIN: 'admin',
  });

  /** Nombres legibles de cada rol. */
  const NOMBRES_ROL = Object.freeze({
    [ROLES.PERITO]: 'Perito en Informática Forense',
    [ROLES.ADMIN]: 'Responsable del Laboratorio',
  });

  /** Estados del ciclo de vida de una orden de trabajo. */
  const ESTADOS_ORDEN = Object.freeze(['Vigente', 'Prorrogada', 'Resuelta', 'Cancelada']);

  /** Estados en los que la orden aún está en trámite (sujeta a vencimiento). */
  const ESTADOS_ACTIVOS = Object.freeze(['Vigente', 'Prorrogada']);

  /** Clases de orden de trabajo. */
  const CLASES_ORDEN = Object.freeze(['Judicial', 'Interna']);

  /** Herramientas forenses licenciadas en el laboratorio. */
  const HERRAMIENTAS_FORENSES = Object.freeze([
    'Cellebrite',
    'Graykey',
    'Magnet Axiom',
    'Magnet Witness',
    'Encase Forensic',
    'FTK Imager',
    'FTK Toolkit',
    'Paladín',
    'TX1',
    'TD3',
  ]);

  /** Tipos de dispositivos de almacenamiento digital (EMP/EF) recibidos. */
  const TIPOS_DISPOSITIVO = Object.freeze([
    Object.freeze({ clave: 'moviles', etiqueta: 'Equipos terminales móviles' }),
    Object.freeze({ clave: 'simCard', etiqueta: 'Sim Card' }),
    Object.freeze({ clave: 'microSd', etiqueta: 'Micro SD' }),
    Object.freeze({ clave: 'computo', etiqueta: 'Equipos de cómputo' }),
    Object.freeze({ clave: 'discosDuros', etiqueta: 'Discos duros' }),
    Object.freeze({ clave: 'usb', etiqueta: 'USB' }),
  ]);

  /**
   * Delitos informáticos del Título VII Bis del Código Penal (Ley 1273 de 2009).
   * Se ofrecen como sugerencias; el campo admite cualquier otro delito.
   */
  const DELITOS_INFORMATICOS = Object.freeze([
    'Acceso abusivo a un sistema informático',
    'Obstaculización ilegítima de sistema informático o red de telecomunicación',
    'Interceptación de datos informáticos',
    'Daño informático',
    'Uso de software malicioso',
    'Violación de datos personales',
    'Suplantación de sitios web para capturar datos personales',
    'Hurto por medios informáticos y semejantes',
    'Transferencia no consentida de activos',
  ]);

  /** Claves usadas en el almacenamiento local del navegador. */
  const CLAVES_ALMACENAMIENTO = Object.freeze({
    USUARIOS: 'sgedf.usuarios',
    ORDENES: 'sgedf.ordenes',
    AUDITORIA: 'sgedf.auditoria',
    INTENTOS: 'sgedf.intentosFallidos',
    SESION: 'sgedf.sesion',
    VERSION_DATOS: 'sgedf.versionDatos',
  });

  SGEDF.Config = Object.freeze({
    NOMBRE_SISTEMA: 'SGEDF',
    NOMBRE_COMPLETO: 'Sistema de Gestión de Evidencias Digitales Forenses',
    LABORATORIO: 'Laboratorio de Informática Forense',
    VERSION: '1.0.0',
    VERSION_DATOS: 1,

    /** Política de seguridad de la autenticación. */
    MAX_INTENTOS_FALLIDOS: 3,
    MINUTOS_BLOQUEO: 5,
    MINUTOS_INACTIVIDAD: 15,
    LONGITUD_MINIMA_CONTRASENA: 8,

    /** Días de anticipación con que se alerta el vencimiento de una orden. */
    DIAS_ALERTA_VENCIMIENTO: 5,

    /** Número máximo de registros conservados en la bitácora local. */
    MAX_REGISTROS_AUDITORIA: 2000,

    ROLES,
    NOMBRES_ROL,
    ESTADOS_ORDEN,
    ESTADOS_ACTIVOS,
    CLASES_ORDEN,
    HERRAMIENTAS_FORENSES,
    DELITOS_INFORMATICOS,
    TIPOS_DISPOSITIVO,
    CLAVES_ALMACENAMIENTO,
  });
})((window.SGEDF = window.SGEDF || {}));
