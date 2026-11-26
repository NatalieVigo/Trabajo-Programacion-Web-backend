# Mesa de ayuda de servicios del campus — Backend

API REST de la entrega final, hecha con Node.js, Express y MySQL (XAMPP). El frontend está en [Trabajo-Programacion-Web](https://github.com/NatalieVigo/Trabajo-Programacion-Web).

## Estructura

```
database/esquema/   tablas, un archivo por historia
database/semilla/   carga del seed, un archivo por historia
src/routes/         rutas de la API
src/controllers/    leen la petición y responden; no tocan la base
src/services/       reglas de negocio y validaciones
src/repositories/   consultas SQL
src/middlewares/    sesión, roles y errores
test/               pruebas
```

Las credenciales van en `.env`, que no se sube al repositorio.

## Tablas por historia

Son las 17 tablas del `seed.json` de la entrega 1, con los mismos nombres. Cada tabla la crea una sola historia, que también carga sus datos semilla. Las demás historias solo la leen, salvo lo indicado en «Tablas compartidas».

| Historia | Tablas |
| --- | --- |
| HU-1 Cuenta y acceso | usuarios, invitaciones, tokensRecuperacion, solicitudesAcceso, intentosAcceso |
| HU-2 Catálogo de servicios | categorias, subcategorias, sedes, pabellones, ambientes, habilitaciones |
| HU-3 Registro de tickets | tickets |
| HU-4 Cola y asignación | historial |
| HU-5 Atención y cierre | bitacora |
| HU-6 Encuesta de satisfacción | encuestas |
| HU-7 Métricas y usuarios | unidades, vinculos |

### Tablas compartidas

- **usuarios** (HU-1): HU-7 escribe el estado y el motivo de bloqueo al bloquear o desbloquear una cuenta.
- **tickets** (HU-3): HU-4 escribe `asignadoA`, la prioridad y el estado al devolver el ticket a la cola; HU-5 escribe el estado y `cerradoEn`.
- **historial** (HU-4): HU-3 agrega el registro, la cancelación y la reapertura; HU-5 agrega los cambios de estado.
- **bitacora** (HU-5): HU-4 agrega la nota interna al reasignar.
- **unidades** y **vinculos** (HU-7): HU-1 las lee para el formulario de registro.
