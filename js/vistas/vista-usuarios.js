/**
 * @file Vistas de gestión de usuarios (HU-03) — exclusivas del administrador.
 * @description
 *  - VistaUsuarios: listado con acciones de editar, activar/desactivar y eliminar.
 *  - VistaFormularioUsuario: creación (#/nuevo-usuario) y modificación
 *    (#/editar-usuario/ID) de cuentas.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Usuarios, Formato, UI } = SGEDF;
  const esc = UI.esc;

  /** Opciones de rol para el formulario. */
  const OPCIONES_ROL = Object.freeze([
    { valor: Config.ROLES.PERITO, texto: 'Perito en informática forense' },
    { valor: Config.ROLES.ADMIN, texto: 'Administrador / Responsable del laboratorio' },
  ]);

  /* ------------------------------------------------------------------------
   * Listado de usuarios
   * ---------------------------------------------------------------------- */

  /**
   * Filas de la tabla de usuarios.
   * @param {SGEDF.Usuario[]} usuarios
   * @returns {string}
   */
  function filasUsuarios(usuarios) {
    if (usuarios.length === 0) {
      return UI.filaVacia(7, 'No hay usuarios registrados.');
    }
    return usuarios
      .map((usuario) => {
        const id = esc(usuario.identificacion);
        const estado = usuario.activo
          ? '<span class="insignia insignia-verde">Activo</span>'
          : '<span class="insignia insignia-gris">Inactivo</span>';
        const ultimoAcceso = usuario.ultimoAcceso
          ? Formato.formatearFechaHora(usuario.ultimoAcceso)
          : 'Nunca';
        return `
          <tr>
            <td>${id}</td>
            <td>${esc(usuario.nombreCompleto)}${usuario.grado ? `<br><span class="tarjeta-sub">${esc(usuario.grado)}</span>` : ''}</td>
            <td>${esc(usuario.descripcionRoles)}</td>
            <td>${estado}</td>
            <td>${ultimoAcceso}</td>
            <td>${esc(usuario.correo)}</td>
            <td class="celda-acciones">
              <a class="btn btn-enlace" href="#/editar-usuario/${encodeURIComponent(usuario.identificacion)}">Editar</a>
              <button type="button" class="btn btn-enlace" data-accion="estado" data-id="${id}" data-activo="${usuario.activo}">${usuario.activo ? 'Desactivar' : 'Activar'}</button>
              <button type="button" class="btn btn-enlace peligro" data-accion="eliminar" data-id="${id}">Eliminar</button>
            </td>
          </tr>`;
      })
      .join('');
  }

  /**
   * Procesa las acciones de activar/desactivar y eliminar con confirmación previa.
   * @param {HTMLElement} boton Botón pulsado.
   * @param {HTMLElement} contenedor Contenedor para volver a renderizar.
   */
  async function procesarAccion(boton, contenedor) {
    const { accion, id } = boton.dataset;
    const usuario = Usuarios.buscar(id);
    if (!usuario) {
      return;
    }

    let resultado;
    if (accion === 'estado') {
      const activar = boton.dataset.activo !== 'true';
      const confirmado = await UI.confirmar({
        titulo: activar ? 'Activar usuario' : 'Desactivar usuario',
        mensaje: `¿Confirma ${activar ? 'activar' : 'desactivar'} la cuenta de ${usuario.nombreCompleto}?`,
        textoConfirmar: activar ? 'Activar' : 'Desactivar',
        peligro: !activar,
      });
      if (!confirmado) {
        return;
      }
      resultado = Usuarios.cambiarEstado(id, activar);
    } else if (accion === 'eliminar') {
      const confirmado = await UI.confirmar({
        titulo: 'Eliminar usuario',
        mensaje: `Esta acción no se puede deshacer. ¿Eliminar la cuenta de ${usuario.nombreCompleto}?`,
        textoConfirmar: 'Eliminar',
        peligro: true,
      });
      if (!confirmado) {
        return;
      }
      resultado = Usuarios.eliminar(id);
    } else {
      return;
    }

    UI.notificar(resultado.mensaje, resultado.exito ? 'exito' : 'error');
    if (resultado.exito) {
      montarListado(contenedor);
    }
  }

  /**
   * Renderiza el listado de usuarios.
   * @param {HTMLElement} contenedor
   */
  function montarListado(contenedor) {
    contenedor.innerHTML = `
      <section class="tarjeta">
        <div class="tarjeta-encabezado">
          <div>
            <h3 class="tarjeta-titulo">Gestión de usuarios</h3>
            <p class="tarjeta-sub">Historia de usuario HU-03 · Cree, modifique o elimine cuentas de usuario del sistema</p>
          </div>
          <a class="btn btn-primario" href="#/nuevo-usuario">${UI.icono('registro')}Nuevo usuario</a>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <caption class="solo-lector">Usuarios del sistema</caption>
            <thead>
              <tr>
                <th scope="col">Identificación</th><th scope="col">Nombre completo</th><th scope="col">Rol</th>
                <th scope="col">Estado</th><th scope="col">Último acceso</th><th scope="col">Correo electrónico</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>${filasUsuarios(Usuarios.listar())}</tbody>
          </table>
        </div>
      </section>`;

    contenedor.firstElementChild.addEventListener('click', (evento) => {
      const boton = evento.target.closest('button[data-accion]');
      if (boton) {
        procesarAccion(boton, contenedor);
      }
    });
  }

  /* ------------------------------------------------------------------------
   * Formulario de usuario
   * ---------------------------------------------------------------------- */

  /**
   * Renderiza el formulario de creación o modificación.
   * @param {HTMLElement} contenedor
   * @param {string|null} identificacion Usuario a editar (null para crear).
   */
  function montarFormulario(contenedor, identificacion) {
    const usuario = identificacion ? Usuarios.buscar(identificacion) : null;
    if (identificacion && !usuario) {
      contenedor.innerHTML = `
        <section class="tarjeta">
          <div class="alerta alerta-advertencia" role="alert">El usuario ${esc(identificacion)} no existe.</div>
          <a class="btn" href="#/usuarios">Volver a usuarios</a>
        </section>`;
      return;
    }
    const modoEdicion = Boolean(usuario);
    const datos = usuario || new SGEDF.Usuario({ roles: [Config.ROLES.PERITO] });
    const ayudaContrasena = `Mínimo ${Config.LONGITUD_MINIMA_CONTRASENA} caracteres, con mayúscula, minúscula y número.`;

    contenedor.innerHTML = `
      <section class="tarjeta">
        <h3 class="tarjeta-titulo">${modoEdicion ? `Modificar usuario ${esc(datos.identificacion)}` : 'Crear nuevo usuario'}</h3>
        <p class="tarjeta-sub">${modoEdicion ? 'Deje la contraseña en blanco para conservar la actual' : 'Complete los datos para registrar el nuevo usuario en el sistema'}</p>
        <form id="form-usuario" novalidate>
          <div class="formulario-rejilla">
            ${UI.campo({ nombre: 'identificacion', etiqueta: 'Identificación', valor: datos.identificacion, requerido: true, soloLectura: modoEdicion, placeholder: 'Nro. cédula', atributos: 'maxlength="10" inputmode="numeric" autocomplete="off"' })}
            ${UI.campo({ nombre: 'grado', etiqueta: 'Grado', valor: datos.grado, placeholder: 'Ej. Subintendente, Técnico...', atributos: 'maxlength="60"' })}
            ${UI.campo({ nombre: 'nombreCompleto', etiqueta: 'Nombres y apellidos', valor: datos.nombreCompleto, requerido: true, completo: true, placeholder: 'Nombre completo', atributos: 'maxlength="120" autocomplete="name"' })}
            ${UI.campo({ nombre: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', valor: datos.correo, requerido: true, completo: true, placeholder: 'usuario@correo.policia.gov.co', atributos: 'maxlength="120" autocomplete="email"' })}
            ${UI.grupoOpciones({ nombre: 'roles', etiqueta: 'Rol(es)', opciones: OPCIONES_ROL, seleccionadas: datos.roles, requerido: true })}
            ${UI.campo({ nombre: 'contrasena', etiqueta: modoEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña inicial', tipo: 'password', requerido: !modoEdicion, ayuda: ayudaContrasena, atributos: 'autocomplete="new-password" maxlength="64"' })}
            ${UI.campo({ nombre: 'confirmacion', etiqueta: 'Confirmar contraseña', tipo: 'password', requerido: !modoEdicion, placeholder: 'Repita la contraseña', atributos: 'autocomplete="new-password" maxlength="64"' })}
          </div>
          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primario">${UI.icono('guardar')}${modoEdicion ? 'Guardar cambios' : 'Crear usuario'}</button>
            <a class="btn" href="#/usuarios">Cancelar</a>
          </div>
        </form>
      </section>`;

    const formulario = contenedor.querySelector('#form-usuario');
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const valores = UI.leerFormulario(formulario);
      const resultado = modoEdicion
        ? Usuarios.actualizar(datos.identificacion, valores)
        : Usuarios.crear(valores);

      // Los campos de contraseña se limpian siempre por seguridad.
      formulario.elements.contrasena.value = '';
      formulario.elements.confirmacion.value = '';

      if (!resultado.exito) {
        UI.mostrarErrores(formulario, resultado.errores || {});
        UI.notificar(resultado.mensaje, 'error');
        return;
      }
      UI.notificar(resultado.mensaje, 'exito');
      SGEDF.Enrutador.navegar('usuarios');
    });
  }

  SGEDF.VistaUsuarios = Object.freeze({ montar: montarListado });
  SGEDF.VistaFormularioUsuario = Object.freeze({ montar: montarFormulario });
})((window.SGEDF = window.SGEDF || {}));
