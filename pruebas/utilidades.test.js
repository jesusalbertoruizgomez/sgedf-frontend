/**
 * Pruebas unitarias de las utilidades: SHA-256, formato de fechas y validadores.
 * Ejecución: npm test
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { cargarSgedf } = require('./cargador');

const SGEDF = cargarSgedf();

describe('Cripto.sha256', () => {
  const casos = ['', 'abc', 'Forense2026', 'ñandú y acción — UTF-8 ✓', 'x'.repeat(1000)];

  casos.forEach((texto) => {
    test(`coincide con node:crypto para "${texto.slice(0, 20)}"`, () => {
      const esperado = createHash('sha256').update(texto, 'utf8').digest('hex');
      assert.equal(SGEDF.Cripto.sha256(texto), esperado);
    });
  });

  test('la sal cambia el resumen de la misma contraseña', () => {
    const sal1 = SGEDF.Cripto.generarSal();
    const sal2 = SGEDF.Cripto.generarSal();
    assert.equal(sal1.length, 32);
    assert.notEqual(
      SGEDF.Cripto.resumirContrasena('Clave123', sal1),
      SGEDF.Cripto.resumirContrasena('Clave123', sal2)
    );
  });
});

describe('Formato', () => {
  const { Formato } = SGEDF;

  test('sumarDias atraviesa meses y años bisiestos', () => {
    assert.equal(Formato.sumarDias('2028-02-27', 2), '2028-02-29');
    assert.equal(Formato.sumarDias('2026-12-20', 30), '2027-01-19');
    assert.equal(Formato.sumarDias('fecha-mala', 3), '');
  });

  test('diasEntre calcula diferencias positivas y negativas', () => {
    assert.equal(Formato.diasEntre('2026-01-01', '2026-01-31'), 30);
    assert.equal(Formato.diasEntre('2026-01-31', '2026-01-01'), -30);
  });

  test('parsearFechaIso rechaza fechas inexistentes', () => {
    assert.equal(Formato.parsearFechaIso('2026-02-30'), null);
    assert.ok(Formato.parsearFechaIso('2026-02-28'));
  });

  test('formatearFecha usa DD/MM/AAAA', () => {
    assert.equal(Formato.formatearFecha('2026-03-10'), '10/03/2026');
    assert.equal(Formato.formatearFecha(''), '—');
  });

  test('escaparHtml neutraliza etiquetas (prevención de XSS)', () => {
    assert.equal(
      Formato.escaparHtml('<img src=x onerror="alert(1)">'),
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'
    );
  });

  test('normalizarTexto elimina tildes y mayúsculas', () => {
    assert.equal(
      Formato.normalizarTexto('  Acceso ABUSIVO Informático '),
      'acceso abusivo informatico'
    );
  });
});

describe('Validadores', () => {
  const { Validadores } = SGEDF;

  test('número de orden de trabajo', () => {
    assert.ok(Validadores.esNumeroOrdenTrabajo('OT-2026-015'));
    assert.ok(!Validadores.esNumeroOrdenTrabajo('OT-26-15'));
    assert.ok(!Validadores.esNumeroOrdenTrabajo('2026-015'));
  });

  test('NUNC de 21 dígitos', () => {
    assert.ok(Validadores.esNunc('110016000014202600024'));
    assert.ok(!Validadores.esNunc('11001600014032024'));
    assert.ok(!Validadores.esNunc('11001600001420260002A'));
  });

  test('correo y cédula', () => {
    assert.ok(Validadores.esCorreo('perito@correo.policia.gov.co'));
    assert.ok(!Validadores.esCorreo('perito@'));
    assert.ok(Validadores.esCedula('1100503738'));
    assert.ok(!Validadores.esCedula('12345'));
  });

  test('política de contraseñas', () => {
    assert.ok(Validadores.esContrasenaSegura('Forense2026'));
    assert.ok(!Validadores.esContrasenaSegura('forense2026'));
    assert.ok(!Validadores.esContrasenaSegura('Forense'));
    assert.ok(!Validadores.esContrasenaSegura('FORENSE2026'));
  });

  test('enteros y números no negativos', () => {
    assert.ok(Validadores.esEnteroNoNegativo('3'));
    assert.ok(!Validadores.esEnteroNoNegativo('-1'));
    assert.ok(!Validadores.esEnteroNoNegativo('2.5'));
    assert.ok(Validadores.esNumeroNoNegativo('2.5'));
  });
});
