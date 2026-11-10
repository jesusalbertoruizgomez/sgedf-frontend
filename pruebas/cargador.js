/**
 * Cargador de pruebas: ejecuta los scripts del navegador dentro de un contexto
 * aislado de Node.js (módulo `vm`) que simula `window`, `localStorage` y
 * `sessionStorage`. Así se prueban modelos y servicios sin abrir un navegador.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

/** Scripts de la capa lógica, en el mismo orden en que los carga index.html. */
const SCRIPTS_LOGICA = [
  'js/config.js',
  'js/utilidades/sha256.js',
  'js/utilidades/formato.js',
  'js/utilidades/validadores.js',
  'js/modelos/usuario.js',
  'js/modelos/orden-trabajo.js',
  'js/modelos/registro-auditoria.js',
  'js/servicios/almacenamiento.js',
  'js/servicios/auditoria.js',
  'js/servicios/usuarios.js',
  'js/servicios/autenticacion.js',
  'js/servicios/ordenes.js',
  'js/servicios/reportes.js',
  'js/servicios/datos-semilla.js',
];

/**
 * Crea un almacén compatible con la interfaz Web Storage.
 * @returns {Storage}
 */
function crearAlmacenSimulado() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    clear: () => datos.clear(),
  };
}

/**
 * Carga la capa lógica del SGEDF en un contexto nuevo y aislado.
 * @returns {Object} Espacio de nombres SGEDF del contexto.
 */
function cargarSgedf() {
  const contexto = {
    console,
    TextEncoder,
    crypto: webcrypto,
    localStorage: crearAlmacenSimulado(),
    sessionStorage: crearAlmacenSimulado(),
  };
  contexto.window = contexto;
  contexto.globalThis = contexto;
  vm.createContext(contexto);

  const raiz = path.resolve(__dirname, '..');
  SCRIPTS_LOGICA.forEach((relativa) => {
    const codigo = fs.readFileSync(path.join(raiz, relativa), 'utf8');
    vm.runInContext(codigo, contexto, { filename: relativa });
  });
  return contexto.SGEDF;
}

module.exports = { cargarSgedf };
