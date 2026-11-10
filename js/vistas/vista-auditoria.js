/**
 * @file Vista de la bitácora de auditoría — exclusiva del administrador.
 * @description Consulta de solo lectura de los accesos y operaciones, con filtro
 * por texto (usuario, acción o detalle) y por fecha.
 */
(function (SGEDF) {
  'use strict';

  const { Auditoria, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /** Máximo de registros que se pintan a la vez para mantener la fluidez. */
  const MAX_FILAS = 200;

  /**
   * Clase de la insignia según la naturaleza de la acción.
   * @param {string} accion
   * @returns {string}
   */
  function claseAccion(accion) {
    if (/FALLIDO|BLOQUEO|ELIMINACION/.test(accion)) {
      return 'insignia-roja';
    }
    if (/INICIO_SESION|REGISTRO|CREACION/.test(accion)) {
      return 'insignia-verde';
    }
    if (/CIERRE/.test(accion)) {
      return 'insignia-gris';
    }
    return 'insignia-azul';
  }

  /**
   * Filas de la tabla de auditoría.
   * @param {SGEDF.RegistroAuditoria[]} registros
   * @returns {string}
   */
  function filas(registros) {
    if (registros.length === 0) {
      return UI.filaVacia(5, 'No hay registros en la bitácora para el filtro aplicado.');
    }
    return registros
      .slice(0, MAX_FILAS)
      .map(
        (registro) => `
        <tr>
          <td><time datetime="${esc(registro.fechaHora)}">${Formato.formatearFechaHora(registro.fechaHora)}</time></td>
          <td>${esc(registro.nombreUsuario)}<br><span class="tarjeta-sub">${esc(registro.usuario)}</span></td>
          <td><span class="insignia ${claseAccion(registro.accion)}">${esc(registro.descripcionAccion)}</span></td>
          <td>${esc(registro.detalle)}</td>
          <td class="texto-mono">${esc(registro.ip)}</td>
        </tr>`
      )
      .join('');
  }

  /**
   * Renderiza la bitácora.
   * @param {HTMLElement} contenedor
   */
  function montar(contenedor) {
    contenedor.innerHTML = `
      <section class="tarjeta">
        <h3 class="tarjeta-titulo">Bitácora de auditoría</h3>
        <p class="tarjeta-sub">Registro completo de accesos y operaciones del sistema (solo lectura)</p>
        <form id="form-auditoria" class="barra-filtros" role="search">
          <label class="solo-lector" for="auditoria-texto">Buscar por usuario o acción</label>
          <input id="auditoria-texto" class="control" type="search" placeholder="Buscar por usuario, acción o detalle..." autocomplete="off">
          <label class="solo-lector" for="auditoria-fecha">Fecha</label>
          <input id="auditoria-fecha" class="control" type="date">
          <button type="submit" class="btn btn-primario">Filtrar</button>
          <button type="reset" class="btn">Limpiar</button>
        </form>
        <p id="auditoria-resumen" class="resumen-resultados" aria-live="polite"></p>
        <div class="tabla-contenedor">
          <table class="tabla">
            <caption class="solo-lector">Registros de auditoría</caption>
            <thead>
              <tr>
                <th scope="col">Fecha/Hora</th><th scope="col">Usuario</th><th scope="col">Acción</th>
                <th scope="col">Detalle</th><th scope="col">IP</th>
              </tr>
            </thead>
            <tbody id="auditoria-cuerpo"></tbody>
          </table>
        </div>
        <p class="campo-ayuda">La dirección IP será capturada por el componente back-end; en el front-end se registra como "N/D (cliente)".</p>
      </section>`;

    const raiz = contenedor.firstElementChild;
    const formulario = raiz.querySelector('#form-auditoria');

    /** Aplica los filtros y actualiza la tabla. */
    const filtrar = () => {
      const registros = Auditoria.filtrar({
        texto: raiz.querySelector('#auditoria-texto').value,
        fecha: raiz.querySelector('#auditoria-fecha').value,
      });
      raiz.querySelector('#auditoria-cuerpo').innerHTML = filas(registros);
      const mostrados = Math.min(registros.length, MAX_FILAS);
      raiz.querySelector('#auditoria-resumen').textContent =
        `Mostrando ${mostrados} de ${registros.length} registro(s).`;
    };

    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      filtrar();
    });
    // El evento reset limpia los campos después de dispararse; se filtra al siguiente ciclo.
    formulario.addEventListener('reset', () => window.setTimeout(filtrar, 0));
    filtrar();
  }

  SGEDF.VistaAuditoria = Object.freeze({ montar });
})((window.SGEDF = window.SGEDF || {}));
