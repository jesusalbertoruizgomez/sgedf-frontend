/**
 * @file Vista de registro y actualización de órdenes de trabajo (HU-01).
 * @description Formulario organizado en las mismas secciones del prototipo:
 * datos de la orden, orden de policía judicial, solicitud FPJ-12, dispositivos y
 * herramientas, e informe FPJ-13. Calcula automáticamente la fecha de vencimiento
 * y el total de dispositivos, y muestra los errores de validación por campo.
 *
 * Rutas: #/registro (nueva orden) y #/editar-orden/OT-AAAA-NNN (actualización).
 */
(function (SGEDF) {
  'use strict';

  const { Config, Autenticacion, Ordenes, OrdenTrabajo, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /**
   * Mensaje cuando la orden no existe o el usuario no puede modificarla.
   * @param {string} numero
   * @returns {string}
   */
  function plantillaSinPermiso(numero) {
    return `
      <section class="tarjeta">
        <div class="alerta alerta-advertencia" role="alert">
          La orden ${esc(numero)} no existe o no tiene permisos para modificarla.
        </div>
        <a class="btn" href="#/consulta">Volver a la consulta</a>
      </section>`;
  }

  /**
   * Genera el formulario completo de la orden.
   * @param {SGEDF.OrdenTrabajo} orden Valores iniciales.
   * @param {boolean} modoEdicion
   * @returns {string}
   */
  function plantillaFormulario(orden, modoEdicion) {
    const pj = orden.policiaJudicial;
    const solicitud = orden.solicitudAnalisis;
    const hoy = Formato.fechaHoyIso();

    const camposDispositivos = Config.TIPOS_DISPOSITIVO.map(({ clave, etiqueta }) =>
      UI.campo({
        nombre: `dispositivos.${clave}`,
        etiqueta,
        tipo: 'number',
        valor: orden.dispositivos[clave],
        atributos: 'min="0" max="999" step="1" inputmode="numeric"',
      })
    ).join('');

    const opcionesDelito = Config.DELITOS_INFORMATICOS.map(
      (delito) => `<option value="${esc(delito)}"></option>`
    ).join('');

    return `
      <section class="tarjeta">
        <div class="tarjeta-encabezado">
          <div>
            <h3 class="tarjeta-titulo">${modoEdicion ? `Actualizar orden ${esc(orden.numero)}` : 'Registrar nueva orden de trabajo'}</h3>
            <p class="tarjeta-sub">Historia de usuario HU-01 · Los campos marcados con <span class="obligatorio">*</span> son obligatorios</p>
          </div>
        </div>
        <div class="alerta alerta-info">Los datos se guardarán en la máquina forense asignada al perito activo.</div>

        <form id="form-orden" novalidate>
          <div class="formulario-rejilla">
            ${UI.seccion('Datos de la orden de trabajo')}
            ${UI.campo({ nombre: 'numero', etiqueta: 'Nro. de orden de trabajo', valor: orden.numero, requerido: true, soloLectura: modoEdicion, placeholder: 'Ej. OT-2026-015', ayuda: 'Formato OT-AAAA-NNN', atributos: 'maxlength="13" autocomplete="off"' })}
            ${UI.campo({ nombre: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'date', valor: orden.fechaInicio, requerido: true, atributos: `max="${hoy}"` })}
            ${UI.campo({ nombre: 'fechaVigencia', etiqueta: 'Vigencia', tipo: 'date', valor: orden.fechaVigencia, requerido: true })}
            ${UI.campo({ nombre: 'clase', etiqueta: 'Clase de orden', tipo: 'select', valor: orden.clase, requerido: true, opciones: Config.CLASES_ORDEN })}
            ${UI.campo({ nombre: 'estado', etiqueta: 'Estado', tipo: 'select', valor: orden.estado, requerido: true, opciones: Config.ESTADOS_ORDEN })}
            ${UI.campo({ nombre: 'perito.identificacion', etiqueta: 'Identificación del perito', valor: orden.perito.identificacion, soloLectura: true })}
            ${UI.campo({ nombre: 'perito.nombre', etiqueta: 'Nombres y apellidos del perito', valor: orden.perito.nombre, soloLectura: true, completo: true })}

            ${UI.seccion('Orden de policía judicial')}
            ${UI.campo({ nombre: 'policiaJudicial.nunc', etiqueta: 'Nro. único de noticia criminal (NUNC)', valor: pj.nunc, requerido: true, placeholder: '21 dígitos', ayuda: 'Número SPOA de 21 dígitos, sin guiones', atributos: 'maxlength="21" inputmode="numeric" autocomplete="off"' })}
            ${UI.campo({ nombre: 'policiaJudicial.delito', etiqueta: 'Delito', valor: pj.delito, requerido: true, placeholder: 'Ej. Acceso abusivo a un sistema informático', atributos: 'list="lista-delitos" maxlength="150"' })}
            ${UI.campo({ nombre: 'policiaJudicial.autoridadSolicitante', etiqueta: 'Autoridad solicitante', valor: pj.autoridadSolicitante, requerido: true, placeholder: 'Ej. Fiscalía 24 Seccional', atributos: 'maxlength="120"' })}
            ${UI.campo({ nombre: 'policiaJudicial.ciudadAutoridad', etiqueta: 'Ciudad autoridad solicitante', valor: pj.ciudadAutoridad, requerido: true, placeholder: 'Ej. Bogotá D.C.', atributos: 'maxlength="80"' })}
            ${UI.campo({ nombre: 'policiaJudicial.plazoDias', etiqueta: 'Plazo de la orden (días)', tipo: 'number', valor: pj.plazoDias || '', requerido: true, placeholder: '30', atributos: 'min="1" max="365" step="1" inputmode="numeric"' })}
            ${UI.campo({ nombre: 'policiaJudicial.fechaVencimiento', etiqueta: 'Fecha de vencimiento', valor: pj.fechaVencimiento ? Formato.formatearFecha(pj.fechaVencimiento) : '', soloLectura: true, ayuda: 'Se calcula con la fecha de inicio y el plazo' })}
            <datalist id="lista-delitos">${opcionesDelito}</datalist>

            ${UI.seccion('Solicitud de análisis FPJ-12')}
            ${UI.campo({ nombre: 'solicitudAnalisis.numero', etiqueta: 'Nro. de solicitud de análisis', valor: solicitud.numero, requerido: true, placeholder: 'FPJ-12-2026-XXX', atributos: 'maxlength="30"' })}
            ${UI.campo({ nombre: 'solicitudAnalisis.nombreSolicitante', etiqueta: 'Nombre policía judicial solicitante', valor: solicitud.nombreSolicitante, requerido: true, placeholder: 'Nombre completo', atributos: 'maxlength="120"' })}
            ${UI.campo({ nombre: 'solicitudAnalisis.dependencia', etiqueta: 'Dependencia PJ solicitante', valor: solicitud.dependencia, requerido: true, placeholder: 'Ej. SIJIN DENAR', atributos: 'maxlength="80"' })}
            ${UI.campo({ nombre: 'solicitudAnalisis.ciudad', etiqueta: 'Ciudad PJ solicitante', valor: solicitud.ciudad, placeholder: 'Ciudad', atributos: 'maxlength="80"' })}
            ${UI.campo({ nombre: 'solicitudAnalisis.telefono', etiqueta: 'Teléfono PJ solicitante', tipo: 'tel', valor: solicitud.telefono, placeholder: 'Ej. 601-3420000', atributos: 'maxlength="20"' })}
            ${UI.campo({ nombre: 'solicitudAnalisis.correo', etiqueta: 'Correo PJ solicitante', tipo: 'email', valor: solicitud.correo, placeholder: 'usuario@correo.policia.gov.co', atributos: 'maxlength="120"' })}

            ${UI.seccion('Dispositivos de almacenamiento digital')}
            <div id="${UI.idCampo('dispositivos')}" class="campo-completo formulario-rejilla tres-columnas" aria-describedby="${UI.idCampo('dispositivos')}-error">
              ${camposDispositivos}
            </div>
            <p id="${UI.idCampo('dispositivos')}-error" class="campo-error campo-completo"></p>
            <p id="total-dispositivos" class="total-dispositivos" aria-live="polite"></p>
            ${UI.campo({ nombre: 'totalGb', etiqueta: 'Total GB analizadas', tipo: 'number', valor: orden.totalGb || '', placeholder: '0.0', atributos: 'min="0" step="0.1" inputmode="decimal"' })}
            ${UI.grupoOpciones({ nombre: 'herramientas', etiqueta: 'Herramientas forenses empleadas', opciones: Config.HERRAMIENTAS_FORENSES, seleccionadas: orden.herramientas, requerido: true })}

            ${UI.seccion('Informe FPJ-13 y entrega')}
            ${UI.campo({ nombre: 'informe.fechaInforme', etiqueta: 'Fecha informe investigador de laboratorio', tipo: 'date', valor: orden.informe.fechaInforme })}
            ${UI.campo({ nombre: 'informe.funcionarioReclama', etiqueta: 'Funcionario que reclama informe', valor: orden.informe.funcionarioReclama, placeholder: 'Nombres y apellidos', atributos: 'maxlength="120"' })}
            ${UI.campo({ nombre: 'informe.fechaReclamacion', etiqueta: 'Fecha de reclamación', tipo: 'date', valor: orden.informe.fechaReclamacion })}
            ${UI.campo({ nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'textarea', valor: orden.observaciones, completo: true, placeholder: 'Anotaciones relevantes del dictamen pericial...', atributos: 'maxlength="2000"' })}
          </div>

          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primario">${UI.icono('guardar')}${modoEdicion ? 'Guardar cambios' : 'Guardar orden'}</button>
            <a class="btn" href="${modoEdicion ? '#/consulta' : '#/dashboard'}">Cancelar</a>
          </div>
        </form>
      </section>`;
  }

  /**
   * Recalcula y muestra la fecha de vencimiento (inicio + plazo).
   * @param {HTMLFormElement} formulario
   */
  function actualizarVencimiento(formulario) {
    const inicio = formulario.elements.fechaInicio.value;
    const plazo = parseInt(formulario.elements['policiaJudicial.plazoDias'].value, 10);
    const vencimiento = plazo > 0 ? Formato.sumarDias(inicio, plazo) : '';
    formulario.elements['policiaJudicial.fechaVencimiento'].value = vencimiento
      ? Formato.formatearFecha(vencimiento)
      : '';
  }

  /**
   * Recalcula y muestra el total de dispositivos digitados.
   * @param {HTMLFormElement} formulario
   */
  function actualizarTotalDispositivos(formulario) {
    const total = Config.TIPOS_DISPOSITIVO.reduce((suma, { clave }) => {
      const valor = parseInt(formulario.elements[`dispositivos.${clave}`].value, 10);
      return suma + (valor > 0 ? valor : 0);
    }, 0);
    formulario.querySelector('#total-dispositivos').textContent = `Total de dispositivos: ${total}`;
  }

  /**
   * Envía el formulario al servicio de órdenes y muestra el resultado.
   * @param {HTMLFormElement} formulario
   * @param {SGEDF.OrdenTrabajo|null} ordenOriginal null cuando es un registro nuevo.
   */
  function guardar(formulario, ordenOriginal) {
    const datos = UI.leerFormulario(formulario);
    const resultado = ordenOriginal
      ? Ordenes.actualizar(ordenOriginal.numero, datos)
      : Ordenes.crear(datos);

    if (!resultado.exito) {
      if (resultado.errores) {
        UI.mostrarErrores(formulario, resultado.errores);
      }
      UI.notificar(resultado.mensaje, 'error');
      return;
    }
    UI.limpiarErrores(formulario);
    UI.notificar(resultado.mensaje, 'exito');
    SGEDF.Enrutador.navegar('consulta');
  }

  /**
   * Renderiza la vista.
   * @param {HTMLElement} contenedor
   * @param {string|null} numero Número de la orden a editar (null para registrar).
   */
  function montar(contenedor, numero) {
    let ordenOriginal = null;
    if (numero) {
      ordenOriginal = Ordenes.obtener(numero);
      if (!ordenOriginal || !Ordenes.puedeEditar(ordenOriginal)) {
        contenedor.innerHTML = plantillaSinPermiso(numero);
        return;
      }
    }

    const usuario = Autenticacion.usuarioActual();
    const valoresIniciales =
      ordenOriginal ||
      new OrdenTrabajo({
        fechaInicio: Formato.fechaHoyIso(),
        perito: { identificacion: usuario.identificacion, nombre: usuario.nombreCompleto },
      });

    contenedor.innerHTML = plantillaFormulario(valoresIniciales, Boolean(ordenOriginal));
    const formulario = contenedor.querySelector('#form-orden');

    formulario.addEventListener('input', (evento) => {
      const nombre = evento.target.name || '';
      if (nombre === 'fechaInicio' || nombre === 'policiaJudicial.plazoDias') {
        actualizarVencimiento(formulario);
      } else if (nombre.startsWith('dispositivos.')) {
        actualizarTotalDispositivos(formulario);
      }
    });
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      guardar(formulario, ordenOriginal);
    });

    actualizarVencimiento(formulario);
    actualizarTotalDispositivos(formulario);
  }

  SGEDF.VistaRegistroOrden = Object.freeze({ montar });
})((window.SGEDF = window.SGEDF || {}));
