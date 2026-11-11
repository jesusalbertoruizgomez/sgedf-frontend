/**
 * Pruebas unitarias de modelos y servicios: autenticación, órdenes de trabajo,
 * gestión de usuarios, reportes y auditoría.
 * Cada prueba carga un contexto nuevo para que los datos no se compartan. Como el
 * sistema inicia sin órdenes, cada prueba registra las órdenes que necesita.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cargarSgedf } = require('./cargador');

const ADMIN = { id: '1100503738', clave: 'Forense2026' };
const PERITO_DEMO = { id: '1085123456', clave: 'Perito2026' };

/**
 * Inicia sesión y verifica que el ingreso sea exitoso.
 * @param {Object} SGEDF
 * @param {{id: string, clave: string}} credenciales
 * @param {string} rol
 */
function ingresar(SGEDF, credenciales, rol) {
  const resultado = SGEDF.Autenticacion.iniciarSesion(credenciales.id, credenciales.clave, rol);
  assert.ok(resultado.exito, resultado.mensaje);
}

/**
 * Crea un contexto con datos semilla y, opcionalmente, una sesión iniciada.
 * @param {{id: string, clave: string}} [credenciales]
 * @param {string} [rol]
 * @returns {Object} SGEDF
 */
function prepararContexto(credenciales, rol) {
  const SGEDF = cargarSgedf();
  SGEDF.DatosSemilla.inicializar();
  if (credenciales) {
    ingresar(SGEDF, credenciales, rol);
  }
  return SGEDF;
}

/**
 * Datos mínimos válidos para registrar una orden, con cambios opcionales.
 * @param {string} [numero]
 * @param {Object} [cambios]
 * @returns {Object}
 */
function datosOrdenValida(numero = 'OT-2026-050', cambios = {}) {
  return {
    numero,
    fechaInicio: '2026-02-01',
    fechaVigencia: '2026-05-01',
    clase: 'Judicial',
    estado: 'Vigente',
    policiaJudicial: {
      nunc: '110016000014202600999',
      delito: 'Violación de datos personales',
      autoridadSolicitante: 'Fiscalía 3 Seccional',
      ciudadAutoridad: 'Pasto',
      plazoDias: 30,
    },
    solicitudAnalisis: {
      numero: 'FPJ-12-2026-0999',
      nombreSolicitante: 'Det. Prueba',
      dependencia: 'SIJIN DENAR',
    },
    dispositivos: { moviles: 1 },
    herramientas: ['Cellebrite'],
    ...cambios,
  };
}

/**
 * Registra órdenes como el perito indicado y cierra su sesión.
 * @param {Object} SGEDF
 * @param {{id: string, clave: string}} perito
 * @param {Array<string|Object>} ordenes Números de OT o datos completos.
 */
function registrarOrdenes(SGEDF, perito, ordenes) {
  ingresar(SGEDF, perito, 'perito');
  ordenes.forEach((orden) => {
    const datos = typeof orden === 'string' ? datosOrdenValida(orden) : orden;
    const resultado = SGEDF.Ordenes.crear(datos);
    assert.ok(resultado.exito, JSON.stringify(resultado.errores));
  });
  SGEDF.Autenticacion.cerrarSesion();
}

describe('Datos iniciales', () => {
  test('el sistema inicia sin órdenes y con todos los indicadores en cero', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    const ordenes = SGEDF.Ordenes.listarVisibles();
    const m = SGEDF.Ordenes.calcularMetricas(ordenes);
    assert.equal(ordenes.length, 0);
    assert.deepEqual(
      [m.total, m.vigentes, m.prorrogadas, m.resueltas, m.canceladas],
      [0, 0, 0, 0, 0]
    );
    assert.equal(m.proximas.length + m.vencidas.length, 0);
  });

  test('crea las cuentas de usuario iniciales', () => {
    const SGEDF = prepararContexto();
    assert.equal(SGEDF.Usuarios.listar().length, 2);
  });
});

describe('Autenticación', () => {
  test('permite el ingreso con credenciales y rol válidos', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    assert.equal(SGEDF.Autenticacion.rolActivo(), 'admin');
    assert.equal(SGEDF.Autenticacion.usuarioActual().identificacion, ADMIN.id);
  });

  test('permite ingresar con el correo como credencial', () => {
    const SGEDF = prepararContexto();
    const r = SGEDF.Autenticacion.iniciarSesion(
      'JESUSRUIZGOMEZ.A@gmail.com',
      ADMIN.clave,
      'perito'
    );
    assert.ok(r.exito);
  });

  test('rechaza un rol no asignado', () => {
    const SGEDF = prepararContexto();
    const r = SGEDF.Autenticacion.iniciarSesion(PERITO_DEMO.id, PERITO_DEMO.clave, 'admin');
    assert.equal(r.exito, false);
    assert.match(r.mensaje, /rol/);
  });

  test('bloquea la credencial tras 3 intentos fallidos', () => {
    const SGEDF = prepararContexto();
    const { Autenticacion } = SGEDF;
    Autenticacion.iniciarSesion(ADMIN.id, 'Mala1', 'perito');
    Autenticacion.iniciarSesion(ADMIN.id, 'Mala2', 'perito');
    const tercero = Autenticacion.iniciarSesion(ADMIN.id, 'Mala3', 'perito');
    assert.match(tercero.mensaje, /bloqueado/);
    const conClaveCorrecta = Autenticacion.iniciarSesion(ADMIN.id, ADMIN.clave, 'perito');
    assert.equal(conClaveCorrecta.exito, false);
    assert.ok(Autenticacion.minutosRestantesBloqueo(ADMIN.id) > 0);
    const bloqueos = SGEDF.Auditoria.filtrar({ texto: 'bloqueo' });
    assert.equal(bloqueos.length, 1);
  });

  test('el cierre de sesión queda registrado en la bitácora', () => {
    const SGEDF = prepararContexto(ADMIN, 'perito');
    SGEDF.Autenticacion.cerrarSesion();
    assert.equal(SGEDF.Autenticacion.usuarioActual(), null);
    assert.equal(SGEDF.Auditoria.listarTodos()[0].accion, 'CIERRE_SESION');
  });
});

describe('Modelo OrdenTrabajo', () => {
  test('calcula la fecha de vencimiento a partir del plazo', () => {
    const SGEDF = prepararContexto();
    const orden = new SGEDF.OrdenTrabajo(datosOrdenValida());
    assert.equal(orden.policiaJudicial.fechaVencimiento, '2026-03-03');
  });

  test('detecta campos obligatorios y reglas de negocio', () => {
    const SGEDF = prepararContexto();
    const errores = new SGEDF.OrdenTrabajo({ numero: 'X', estado: 'Resuelta' }).validar(
      '2026-11-09'
    );
    [
      'numero',
      'fechaInicio',
      'policiaJudicial.nunc',
      'dispositivos',
      'herramientas',
      'estado',
    ].forEach((campo) => assert.ok(errores[campo], `Debe reportar error en ${campo}`));
  });

  test('una orden completa no presenta errores', () => {
    const SGEDF = prepararContexto();
    const orden = new SGEDF.OrdenTrabajo({
      ...datosOrdenValida(),
      perito: { identificacion: ADMIN.id, nombre: 'Perito' },
    });
    assert.deepEqual({ ...orden.validar('2026-11-09') }, {});
  });

  test('clasifica la situación de vencimiento', () => {
    const SGEDF = prepararContexto();
    const orden = new SGEDF.OrdenTrabajo(datosOrdenValida());
    assert.equal(orden.situacionVencimiento('2026-02-28'), 'proxima');
    assert.equal(orden.situacionVencimiento('2026-03-10'), 'vencida');
    assert.equal(orden.situacionVencimiento('2026-02-02'), 'en-termino');
  });
});

describe('Servicio de órdenes', () => {
  test('el perito solo ve sus órdenes y el administrador ve todas', () => {
    const SGEDF = prepararContexto();
    registrarOrdenes(SGEDF, ADMIN, ['OT-2026-001', 'OT-2026-002']);
    registrarOrdenes(SGEDF, PERITO_DEMO, ['OT-2026-003']);
    ingresar(SGEDF, ADMIN, 'perito');
    assert.equal(SGEDF.Ordenes.listarVisibles().length, 2);
    ingresar(SGEDF, ADMIN, 'admin');
    assert.equal(SGEDF.Ordenes.listarVisibles().length, 3);
  });

  test('registra una orden y rechaza números duplicados', () => {
    const SGEDF = prepararContexto(PERITO_DEMO, 'perito');
    const primero = SGEDF.Ordenes.crear(datosOrdenValida());
    assert.ok(primero.exito, JSON.stringify(primero.errores));
    assert.equal(primero.orden.perito.identificacion, PERITO_DEMO.id);
    const duplicado = SGEDF.Ordenes.crear(datosOrdenValida());
    assert.equal(duplicado.exito, false);
    assert.match(duplicado.errores.numero, /ya está registrada/);
  });

  test('el administrador no puede registrar ni editar órdenes', () => {
    const SGEDF = prepararContexto();
    registrarOrdenes(SGEDF, PERITO_DEMO, ['OT-2026-003']);
    ingresar(SGEDF, ADMIN, 'admin');
    assert.equal(SGEDF.Ordenes.crear(datosOrdenValida()).exito, false);
    const orden = SGEDF.Ordenes.obtener('OT-2026-003');
    assert.ok(orden);
    assert.equal(SGEDF.Ordenes.puedeEditar(orden), false);
  });

  test('la actualización conserva número y perito y audita el cambio de estado', () => {
    const SGEDF = prepararContexto(ADMIN, 'perito');
    assert.ok(SGEDF.Ordenes.crear(datosOrdenValida('OT-2026-002')).exito);
    const orden = SGEDF.Ordenes.obtener('OT-2026-002').aObjetoPlano();
    const r = SGEDF.Ordenes.actualizar('OT-2026-002', {
      ...orden,
      numero: 'OT-2099-999',
      estado: 'Prorrogada',
    });
    assert.ok(r.exito, JSON.stringify(r.errores));
    assert.equal(r.orden.numero, 'OT-2026-002');
    assert.equal(r.orden.perito.identificacion, ADMIN.id);
    assert.match(SGEDF.Auditoria.listarTodos()[0].detalle, /Vigente → Prorrogada/);
  });

  test('las métricas cuentan órdenes por estado y vencimiento', () => {
    const SGEDF = prepararContexto();
    const hoy = SGEDF.Formato.fechaHoyIso();
    registrarOrdenes(SGEDF, ADMIN, [
      datosOrdenValida('OT-2026-001'),
      datosOrdenValida('OT-2026-002', {
        estado: 'Prorrogada',
        fechaInicio: SGEDF.Formato.sumarDias(hoy, -25),
        fechaVigencia: SGEDF.Formato.sumarDias(hoy, 30),
      }),
      datosOrdenValida('OT-2026-003', {
        estado: 'Resuelta',
        informe: { fechaInforme: '2026-03-01' },
      }),
    ]);
    ingresar(SGEDF, ADMIN, 'admin');
    const m = SGEDF.Ordenes.calcularMetricas(SGEDF.Ordenes.listarVisibles());
    assert.equal(m.total, 3);
    assert.equal(m.vigentes, 1);
    assert.equal(m.prorrogadas, 1);
    assert.equal(m.resueltas, 1);
    assert.equal(m.proximas.length, 1);
    assert.equal(m.vencidas.length, 1);
  });
});

describe('Servicio de usuarios', () => {
  const nuevo = {
    identificacion: '1234567890',
    nombreCompleto: 'Perito Nuevo Prueba',
    correo: 'nuevo@ejemplo.gov.co',
    roles: ['perito'],
    contrasena: 'Segura2026',
    confirmacion: 'Segura2026',
  };

  test('crea un usuario válido con la contraseña resumida', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    const r = SGEDF.Usuarios.crear(nuevo);
    assert.ok(r.exito, JSON.stringify(r.errores));
    const guardado = SGEDF.Usuarios.buscar(nuevo.identificacion);
    assert.notEqual(guardado.hashContrasena, nuevo.contrasena);
    assert.ok(guardado.verificarContrasena(nuevo.contrasena));
  });

  test('valida contraseña débil, confirmación y duplicados', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    const r = SGEDF.Usuarios.crear({
      ...nuevo,
      identificacion: ADMIN.id,
      contrasena: 'debil',
      confirmacion: 'otra',
    });
    assert.equal(r.exito, false);
    assert.ok(r.errores.identificacion && r.errores.contrasena && r.errores.confirmacion);
  });

  test('impide eliminarse a sí mismo y eliminar peritos con órdenes', () => {
    const SGEDF = prepararContexto();
    registrarOrdenes(SGEDF, PERITO_DEMO, ['OT-2026-003']);
    ingresar(SGEDF, ADMIN, 'admin');
    assert.equal(SGEDF.Usuarios.eliminar(ADMIN.id).exito, false);
    const conOrdenes = SGEDF.Usuarios.eliminar(PERITO_DEMO.id);
    assert.equal(conOrdenes.exito, false);
    assert.match(conOrdenes.mensaje, /Desactívelo/);
  });

  test('permite eliminar un perito sin órdenes asignadas', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    assert.ok(SGEDF.Usuarios.eliminar(PERITO_DEMO.id).exito);
    assert.equal(SGEDF.Usuarios.buscar(PERITO_DEMO.id), null);
  });

  test('un usuario desactivado no puede iniciar sesión', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    assert.ok(SGEDF.Usuarios.cambiarEstado(PERITO_DEMO.id, false).exito);
    const r = SGEDF.Autenticacion.iniciarSesion(PERITO_DEMO.id, PERITO_DEMO.clave, 'perito');
    assert.equal(r.exito, false);
  });
});

describe('Servicio de reportes', () => {
  test('genera el reporte de dispositivos con totales', () => {
    const SGEDF = prepararContexto();
    registrarOrdenes(SGEDF, ADMIN, [
      datosOrdenValida('OT-2026-001', { dispositivos: { moviles: 3, simCard: 3 } }),
      datosOrdenValida('OT-2026-002'),
    ]);
    ingresar(SGEDF, ADMIN, 'admin');
    const r = SGEDF.Reportes.generar('dispositivos', {});
    assert.ok(r.exito);
    assert.equal(r.reporte.totales.porTipo.moviles, 4);
    assert.equal(r.reporte.totales.dispositivos, 7);
  });

  test('sin órdenes, el reporte se genera vacío con totales en cero', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    const r = SGEDF.Reportes.generar('dispositivos', {});
    assert.ok(r.exito);
    assert.equal(r.reporte.ordenes.length, 0);
    assert.equal(r.reporte.totales.dispositivos, 0);
  });

  test('valida el rango de fechas del reporte por período', () => {
    const SGEDF = prepararContexto(ADMIN, 'admin');
    const r = SGEDF.Reportes.generar('periodo', { desde: '2026-05-01', hasta: '2026-01-01' });
    assert.equal(r.exito, false);
    assert.ok(r.errores.hasta);
  });

  test('el perito no puede generar reportes de órdenes ajenas', () => {
    const SGEDF = prepararContexto();
    registrarOrdenes(SGEDF, ADMIN, ['OT-2026-001']);
    ingresar(SGEDF, PERITO_DEMO, 'perito');
    const r = SGEDF.Reportes.generar('caso', { numero: 'OT-2026-001' });
    assert.equal(r.exito, false);
  });
});
