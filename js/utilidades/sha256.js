/**
 * @file Implementación del algoritmo de resumen criptográfico SHA-256 (FIPS 180-4).
 * @description Se usa para almacenar las contraseñas como resumen con sal, nunca en
 * texto plano. Se implementa en JavaScript puro porque la API `crypto.subtle` del
 * navegador solo está disponible en contextos seguros (HTTPS), y el prototipo
 * también debe funcionar en servidores HTTP de pruebas o abriendo el archivo local.
 *
 * Nota: en producción la verificación de credenciales corresponde al back-end;
 * este módulo cumple el rol de capa de protección en el cliente.
 */
(function (SGEDF) {
  'use strict';

  /** Constantes de ronda: primeros 32 bits de las raíces cúbicas de los 64 primeros primos. */
  const K = Object.freeze([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  /** Valores iniciales del resumen: raíces cuadradas de los 8 primeros primos. */
  const H_INICIAL = Object.freeze([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  /**
   * Rotación circular a la derecha de un entero de 32 bits.
   * @param {number} valor Entero sin signo de 32 bits.
   * @param {number} posiciones Número de bits a rotar.
   * @returns {number}
   */
  function rotarDerecha(valor, posiciones) {
    return (valor >>> posiciones) | (valor << (32 - posiciones));
  }

  /**
   * Añade el relleno (padding) exigido por el estándar: bit 1, ceros y la longitud
   * del mensaje en bits (64 bits big-endian), hasta completar bloques de 512 bits.
   * @param {Uint8Array} bytes Mensaje original.
   * @returns {DataView} Vista sobre el mensaje rellenado.
   */
  function rellenarMensaje(bytes) {
    const longitudTotal = Math.ceil((bytes.length + 9) / 64) * 64;
    const datos = new Uint8Array(longitudTotal);
    datos.set(bytes);
    datos[bytes.length] = 0x80;
    const vista = new DataView(datos.buffer);
    const longitudBits = bytes.length * 8;
    vista.setUint32(longitudTotal - 8, Math.floor(longitudBits / 0x100000000));
    vista.setUint32(longitudTotal - 4, longitudBits >>> 0);
    return vista;
  }

  /**
   * Calcula el resumen SHA-256 de un texto codificado en UTF-8.
   * @param {string} texto Texto de entrada.
   * @returns {string} Resumen en hexadecimal (64 caracteres en minúscula).
   */
  function sha256(texto) {
    const vista = rellenarMensaje(new TextEncoder().encode(String(texto)));
    const h = H_INICIAL.slice();
    const w = new Uint32Array(64);

    for (let desplazamiento = 0; desplazamiento < vista.byteLength; desplazamiento += 64) {
      // 1. Programa de mensajes: 16 palabras del bloque y 48 derivadas.
      for (let t = 0; t < 16; t++) {
        w[t] = vista.getUint32(desplazamiento + t * 4);
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotarDerecha(w[t - 15], 7) ^ rotarDerecha(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotarDerecha(w[t - 2], 17) ^ rotarDerecha(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }

      // 2. Función de compresión (64 rondas).
      let [a, b, c, d, e, f, g, hh] = h;
      for (let t = 0; t < 64; t++) {
        const suma1 = rotarDerecha(e, 6) ^ rotarDerecha(e, 11) ^ rotarDerecha(e, 25);
        const eleccion = (e & f) ^ (~e & g);
        const temporal1 = (hh + suma1 + eleccion + K[t] + w[t]) >>> 0;
        const suma0 = rotarDerecha(a, 2) ^ rotarDerecha(a, 13) ^ rotarDerecha(a, 22);
        const mayoria = (a & b) ^ (a & c) ^ (b & c);
        const temporal2 = (suma0 + mayoria) >>> 0;
        hh = g;
        g = f;
        f = e;
        e = (d + temporal1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temporal1 + temporal2) >>> 0;
      }

      // 3. Acumulación del resultado intermedio.
      [a, b, c, d, e, f, g, hh].forEach((valor, indice) => {
        h[indice] = (h[indice] + valor) >>> 0;
      });
    }

    return h.map((palabra) => palabra.toString(16).padStart(8, '0')).join('');
  }

  /**
   * Genera una sal aleatoria en hexadecimal usando el generador criptográfico del navegador.
   * @param {number} [numeroBytes=16] Longitud de la sal en bytes.
   * @returns {string}
   */
  function generarSal(numeroBytes = 16) {
    const bytes = new Uint8Array(numeroBytes);
    if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      // Respaldo para entornos sin API criptográfica (no recomendado en producción).
      for (let i = 0; i < numeroBytes; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Obtiene el resumen de una contraseña combinada con su sal.
   * @param {string} contrasena Contraseña en texto plano.
   * @param {string} sal Sal asociada al usuario.
   * @returns {string}
   */
  function resumirContrasena(contrasena, sal) {
    return sha256(`${sal}:${contrasena}`);
  }

  SGEDF.Cripto = Object.freeze({ sha256, generarSal, resumirContrasena });
})((window.SGEDF = window.SGEDF || {}));
