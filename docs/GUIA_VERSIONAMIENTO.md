# Guía de versionamiento – SGEDF front-end

## 1. Modelo de ramas (GitFlow simplificado)

```
main      ●──────────────────────────────────────────────────────●  v1.0.0
           \                                                    /
develop     ●───●───────●───────●───────●───────●───────●───────●
                 \     / \     / \     / \     / \     / \     /
feature/*         ●───●   ●───●   ●───●   ●───●   ●───●   ●───●
```

| Rama                             | Propósito                                           |
| -------------------------------- | --------------------------------------------------- |
| `main`                           | Versiones estables y entregables (etiquetadas)      |
| `develop`                        | Integración de funcionalidades terminadas           |
| `feature/estructura-base`        | HTML de la SPA, recursos gráficos y hojas de estilo |
| `feature/nucleo`                 | Configuración, utilidades, modelos y persistencia   |
| `feature/autenticacion`          | Inicio de sesión, roles, enrutador y arranque       |
| `feature/hu-01-registro-ordenes` | Registro y actualización de órdenes de trabajo      |
| `feature/hu-02-consulta-ordenes` | Consulta, búsqueda y detalle de órdenes             |
| `feature/reportes`               | Reportes con vista previa e impresión a PDF         |
| `feature/hu-03-gestion-usuarios` | Gestión de usuarios y bitácora de auditoría         |
| `feature/pruebas`                | Pruebas unitarias                                   |
| `feature/documentacion`          | README y documentación técnica                      |

Cada rama `feature/*` se integra a `develop` con `git merge --no-ff`, y `develop` se integra
a `main` al publicar una versión.

## 2. Convención de mensajes (Conventional Commits)

```
tipo(alcance): descripción breve en imperativo

feat(hu-01): registro y actualización de órdenes de trabajo
test: pruebas unitarias de utilidades, modelos y servicios
```

## 3. Comandos de consulta

```bash
git log --oneline --graph --all     # Historial con ramas
git branch -a                       # Ramas del repositorio
git tag -n                          # Versiones etiquetadas
git show v1.0.0                     # Detalle de la versión entregada
```

## 4. Publicación en GitHub

1. Crear en GitHub un repositorio vacío llamado `sgedf-frontend` (sin README ni .gitignore).
2. Desde la carpeta del proyecto ejecutar:

```bash
git remote add origin https://github.com/<usuario>/sgedf-frontend.git
git push -u origin main
git push origin develop
git push origin --tags
```

3. Opcional: publicar también las ramas de funcionalidad con `git push origin --all`.
4. Registrar la URL del repositorio en el archivo `ENLACE_REPOSITORIO.txt` del entregable.

## 5. Clonar y ejecutar

```bash
git clone https://github.com/<usuario>/sgedf-frontend.git
cd sgedf-frontend
npm install
npm start
```
