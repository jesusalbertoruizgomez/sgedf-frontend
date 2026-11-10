/**
 * @file Capa de persistencia del front-end.
 * @description Encapsula el acceso a `localStorage` (datos) y `sessionStorage`
 * (sesión activa) mediante repositorios con serialización JSON. Si el navegador
 * bloquea el almacenamiento (p. ej. modo privado estricto), se usa un almacén en
 * memoria para que la aplicación siga funcionando.
 *
 * Esta capa es el único punto que deberá reemplazarse por llamadas a la API REST
 * cuando se integre el componente back-end con la base de datos MySQL.
 */
(function (SGEDF) {
  'use strict';

  /**
   * Crea un almacén en memoria con la misma interfaz mínima de Web Storage.
   * @returns {{getItem: Function, setItem: Function, removeItem: Function}}
   */
  function crearAlmacenEnMemoria() {
    const datos = new Map();
    return {
      getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
      setItem: (clave, valor) => datos.set(clave, String(valor)),
      removeItem: (clave) => datos.delete(clave),
    };
  }

  /**
   * Obtiene un almacén del navegador verificando que realmente se pueda escribir en él.
   * @param {'localStorage'|'sessionStorage'} nombre
   * @returns {Storage|Object}
   */
  function obtenerAlmacen(nombre) {
    const clavePrueba = '__sgedf_prueba__';
    try {
      const almacen = window[nombre];
      almacen.setItem(clavePrueba, clavePrueba);
      almacen.removeItem(clavePrueba);
      return almacen;
    } catch {
      console.warn(`SGEDF: ${nombre} no disponible; se usará almacenamiento en memoria.`);
      return crearAlmacenEnMemoria();
    }
  }

  /**
   * Crea un repositorio clave-valor con serialización JSON sobre un almacén.
   * @param {Storage|Object} almacen
   * @returns {{leer: Function, escribir: Function, eliminar: Function}}
   */
  function crearRepositorio(almacen) {
    return Object.freeze({
      /**
       * Lee y deserializa un valor.
       * @param {string} clave
       * @param {*} [valorPorDefecto=null] Valor devuelto si no existe o está corrupto.
       * @returns {*}
       */
      leer(clave, valorPorDefecto = null) {
        try {
          const texto = almacen.getItem(clave);
          return texto === null ? valorPorDefecto : JSON.parse(texto);
        } catch {
          console.error(`SGEDF: el valor almacenado en "${clave}" no es JSON válido.`);
          return valorPorDefecto;
        }
      },

      /**
       * Serializa y guarda un valor.
       * @param {string} clave
       * @param {*} valor
       * @throws {Error} Si se supera la cuota de almacenamiento.
       */
      escribir(clave, valor) {
        try {
          almacen.setItem(clave, JSON.stringify(valor));
        } catch (error) {
          throw new Error(
            `No fue posible guardar la información (${error.name}). Libere espacio e intente de nuevo.`
          );
        }
      },

      /**
       * Elimina una clave.
       * @param {string} clave
       */
      eliminar(clave) {
        almacen.removeItem(clave);
      },
    });
  }

  SGEDF.Almacenamiento = Object.freeze({
    /** Datos persistentes (usuarios, órdenes, bitácora). */
    local: crearRepositorio(obtenerAlmacen('localStorage')),
    /** Datos de la pestaña actual (sesión del usuario). */
    sesion: crearRepositorio(obtenerAlmacen('sessionStorage')),
  });
})((window.SGEDF = window.SGEDF || {}));
