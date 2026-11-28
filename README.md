# Mesa de ayuda de servicios del campus — Backend

API REST de la entrega final, hecha con Node.js, Express y Sequelize. En local usa MySQL (XAMPP) y en el despliegue PostgreSQL (Neon); el código es el mismo para las dos. El frontend está en [Trabajo-Programacion-Web](https://github.com/Nevetzzz15/Trabajo-Programacion-Web).

## Cómo probarlo

Se necesita tener Node.js y XAMPP instalados.

1. Abre el panel de XAMPP y enciende **MySQL**.
2. Copia `.env.example` como `.env` y completa `DB_USER` y `DB_PASSWORD` con un usuario de tu MySQL (en XAMPP recién instalado es `root` sin contraseña). El usuario necesita permiso para crear las bases `mesa_ayuda` y `mesa_ayuda_test`.
3. Instala, crea la base y enciende la API:

```
npm install
npm run db:reset
npm run dev
```

La API queda en http://localhost:3000/api.

`npm run db:reset` borra la base `mesa_ayuda`, la vuelve a crear, corre las migraciones y carga los seeders con `sequelize-cli`. Los datos salen de `src/db/data/seed.json`, que es una copia del seed de la entrega 1. También se pueden correr los pasos por separado:

| Comando              | Qué hace                                           |
| -------------------- | -------------------------------------------------- |
| `npm run db:create`  | Crea la base (`sequelize db:create`)               |
| `npm run db:migrate` | Crea las tablas que falten (`sequelize db:migrate`) |
| `npm run db:seed`    | Carga los datos del seed (`sequelize db:seed:all`)  |
| `npm run db:deploy`  | Corre las migraciones y el seed sin borrar la base  |

Para las pruebas (`npm test`) MySQL debe estar encendido; usan una base aparte, `mesa_ayuda_test`, que se crea con las mismas migraciones y seeders.

## PostgreSQL y despliegue

La base se elige con `DB_DIALECT`: `mysql` (por defecto) o `postgres`. Para usar un PostgreSQL local, pon en el `.env` `DB_DIALECT=postgres`, `DB_PORT=5432` y el usuario y la contraseña de PostgreSQL; los comandos de arriba y `npm test` funcionan igual. Si `DATABASE_URL` existe, se usa en lugar de las variables `DB_*` (con SSL si la cadena trae `sslmode=require`); las pruebas nunca la usan.

El despliegue usa Neon (base de datos), Render (esta API) y Vercel (el frontend). La API está publicada en https://mesa-ayuda-api-2uei.onrender.com/api y la aplicación en https://mesa-ayuda-gilt.vercel.app.

1. **Neon**: crea un proyecto y copia su cadena de conexión (`postgresql://…?sslmode=require`). Carga las tablas y el seed una sola vez desde tu computadora, con la cadena en `DATABASE_URL`: en PowerShell, `$env:DATABASE_URL="<cadena>"; npm run db:deploy`.
2. **Render**: crea un *Web Service* con este repositorio. Build command: `npm install`; start command: `npm start`. Variables de entorno: `DATABASE_URL` (la de Neon), `JWT_SECRET` (una frase larga y secreta), `CORS_ORIGIN` (la URL del frontend en Vercel, sin `/` al final) y `CORREOS_SIMULADOS=true`. Render pone `PORT` y toma la versión de Node de `engines` en `package.json`.
3. **Vercel**: ver el README del frontend; su `VITE_API_URL` es la URL de Render más `/api`.

Render y Vercel están conectados a estos repositorios: cada cambio que llega a `main` se publica solo en unos minutos.

En el plan gratis, Render apaga la API después de un rato sin uso; la primera petición después tarda cerca de un minuto en responder.

## Cuentas de prueba

| Rol        | Correo                          | Contraseña     |
| ---------- | ------------------------------- | -------------- |
| Usuario    | camila.quispe@aloe.ulima.edu.pe | Camila2026     |
| Técnico    | jparedes@ulima.edu.pe           | Tecnico2026    |
| Supervisor | lmendoza@ulima.edu.pe           | Supervisor2026 |
| Bloqueada  | diego.salas@aloe.ulima.edu.pe   | Usuario2026    |

Las demás cuentas del seed usan `Demo2026`. Invitaciones de prueba: `INV-TEC-2026-DEMO`, `INV-SUP-2026-DEMO` y `INV-TEC-2026-VENCIDA`.

## Estructura

```
.sequelizerc.cjs                    rutas que usa sequelize-cli
src/db/config/database.js           configuración de la base (lee el .env)
src/db/models/                      modelos de Sequelize con sus asociaciones, uno por tabla
src/db/migrations/                  migraciones, una por tabla
src/db/seeders/                     seeders, uno por historia
src/db/data/seed.json               copia del seed de la entrega 1
src/routes/                         rutas de la API
src/controllers/                    leen la petición y responden; no tocan la base
src/services/                       reglas de negocio y validaciones
src/repositories/RepositoryBase.js  operaciones comunes sobre un modelo (listar, buscar, crear, actualizar...)
src/repositories/                   un repositorio por tabla, que extiende RepositoryBase
src/middlewares/                    sesión, roles y errores
test/                               pruebas con Vitest y Supertest
```

Las credenciales van en `.env`, que no se sube al repositorio. Los modelos, migraciones y seeders están en CommonJS (`.cjs`), como los genera `sequelize-cli`.

Las rutas con sesión piden el encabezado `Authorization: Bearer <token>`. Los errores responden con el código HTTP que corresponde y un JSON `{ code, message, fieldErrors, details }`.

## Tablas por historia

Son las 17 tablas del `seed.json` de la entrega 1. En MySQL se escriben en minúsculas con guion bajo (`tokensRecuperacion` es `tokens_recuperacion`); los modelos y la API usan los nombres del seed (`underscored` en `database.js` hace la conversión). Cada tabla la crea una sola historia, con su modelo, su migración y su seeder. Las demás historias solo la leen, salvo lo indicado en «Tablas compartidas».

| Historia | Tablas |
| --- | --- |
| HU-1 Cuenta y acceso | usuarios, invitaciones, tokensRecuperacion, solicitudesAcceso, intentosAcceso |
| HU-2 Catálogo de servicios | categorias, subcategorias, sedes, pabellones, ambientes, habilitaciones |
| HU-3 Registro de tickets | tickets |
| HU-4 Cola y asignación | historial |
| HU-5 Atención y cierre | bitacora |
| HU-6 Encuesta de satisfacción | encuestas |
| HU-7 Métricas y usuarios | unidades, vinculos |

`tickets` conserva los campos compartidos por HU-1, HU-2 y HU-4, y HU-3 añade los datos del reporte. `bitacora` guarda los comentarios públicos y las notas internas de la atención (HU-5), además de la nota interna que escribe HU-4 al asignar. `encuestas` (HU-6) guarda una respuesta por ticket cerrado; HU-1 la lee para mostrar las encuestas pendientes y HU-7 su puntaje para la satisfacción por técnico.

### Tablas compartidas

- **usuarios** (HU-1): HU-7 escribe el estado y el motivo de bloqueo al bloquear o desbloquear una cuenta.
- **tickets** (HU-3): HU-4 escribe `asignadoA`, la prioridad y el estado al devolver el ticket a la cola; HU-5 escribe el estado y `cerradoEn`.
- **historial** (HU-4): HU-3 agrega el registro, la cancelación y la reapertura; HU-5 agrega los cambios de estado.
- **bitacora** (HU-5): HU-4 agrega la nota interna al reasignar.
- **unidades** y **vinculos** (HU-7): HU-1 las lee para el formulario de registro.

## HU-1 Cuenta y acceso

| Método | Ruta                                       | Sesión     | Mockup |
| ------ | ------------------------------------------ | ---------- | ------ |
| POST   | /api/auth/login                            | —          | p04, p05 |
| POST   | /api/auth/logout                           | Cualquiera | p10    |
| POST   | /api/auth/registro                         | —          | p06    |
| GET    | /api/auth/registro/opciones                | —          | p06    |
| GET    | /api/auth/correo-disponible?correo=        | —          | p06    |
| POST   | /api/auth/recuperar-contrasena             | —          | p08    |
| GET    | /api/auth/restablecer-contrasena/:token    | —          | p09    |
| POST   | /api/auth/restablecer-contrasena/:token    | —          | p09    |
| GET    | /api/invitaciones/:token                   | —          | p07    |
| GET    | /api/invitaciones/:token/opciones          | —          | p07    |
| POST   | /api/invitaciones/:token/aceptar           | —          | p07    |
| POST   | /api/invitaciones/:token/rechazar          | —          | p07    |
| POST   | /api/invitaciones                          | Supervisor | p16 (botón «Invitar técnico» de HU-2) |
| GET    | /api/cuenta                                | Cualquiera | p10    |
| PATCH  | /api/cuenta                                | Cualquiera | p10    |
| GET    | /api/cuenta/opciones                       | Cualquiera | p10    |
| GET    | /api/cuenta/resumen                        | Cualquiera | p10    |
| GET    | /api/cuenta/contadores                     | Cualquiera | p05, p10, p11 |
| PUT    | /api/cuenta/contrasena                     | Cualquiera | p10    |
| POST   | /api/solicitudes-acceso                    | Cualquiera | p11    |

El token de sesión (JWT) dice de quién es, cuándo vence y la versión de sesión de la cuenta, que se guarda en la columna `version_sesion` de `usuarios`. Al cerrar sesión o al restablecer la contraseña esa versión sube, y los tokens anteriores responden 401 aunque el servidor se reinicie. Como la versión es de la cuenta, cerrar sesión la cierra en todos los equipos.

## HU-2 Catálogo de servicios

| Método | Ruta                                       | Sesión     | Mockup |
| ------ | ------------------------------------------ | ---------- | ------ |
| GET    | /api/categorias                            | Supervisor | p12    |
| GET    | /api/categorias/disponibles                | Cualquiera | p17 (Nuevo ticket de HU-3) |
| GET    | /api/categorias/:id                        | Supervisor | p13    |
| POST   | /api/categorias                            | Supervisor | p13    |
| PATCH  | /api/categorias/:id                        | Supervisor | p13    |
| PATCH  | /api/categorias/:id/estado                 | Supervisor | p12    |
| DELETE | /api/categorias/:id                        | Supervisor | p12    |
| GET    | /api/sedes                                 | Supervisor | p14    |
| POST   | /api/sedes                                 | Supervisor | p14    |
| PATCH  | /api/sedes/:id                             | Supervisor | p14    |
| DELETE | /api/sedes/:id                             | Supervisor | p14    |
| POST   | /api/pabellones                            | Supervisor | p14    |
| PATCH  | /api/pabellones/:id                        | Supervisor | p14    |
| DELETE | /api/pabellones/:id                        | Supervisor | p14    |
| GET    | /api/ambientes                             | Cualquiera | p14, p17 (Nuevo ticket de HU-3) |
| POST   | /api/ambientes                             | Supervisor | p15    |
| PATCH  | /api/ambientes/:id                         | Supervisor | p15    |
| DELETE | /api/ambientes/:id                         | Supervisor | p14    |
| GET    | /api/habilitaciones                        | Supervisor | p16    |
| PUT    | /api/habilitaciones                        | Supervisor | p16    |

- `/api/categorias/:id` sirve para categorías (`cat-01`) y subcategorías (`sub-01`). Si el `POST` trae `categoriaId`, se crea una subcategoría de esa categoría.
- Desactivar algo con tickets en curso responde `409 OPEN_TICKETS`; se confirma volviendo a enviarlo con `confirmado: true`.
- Lo que está en uso no se elimina (`409 IN_USE`, con el motivo); en su lugar se puede desactivar.
- `PUT /api/habilitaciones` recibe `{ "usr-002": ["cat-01", "cat-07"] }`; los técnicos que no vienen no cambian.
- Para contar los tickets por categoría, subcategoría y ambiente, HU-2 agregó `categoria_id`, `subcategoria_id` y `ambiente_id` a `tickets`; HU-3 conserva estas columnas.
- Las migraciones de HU-2 van antes que las de HU-1, porque `usuarios` apunta a `ambientes`. La de `habilitaciones` y su seeder van después, porque apuntan a los técnicos.

## HU-3 Registro de tickets

| Método | Ruta | Sesión |
| ------ | ---- | ------ |
| GET | /api/tickets | Usuario |
| GET | /api/tickets/duplicados?categoriaId=&ambienteId= | Usuario |
| POST | /api/tickets | Usuario |
| PATCH | /api/tickets/:ticketId/cancelacion | Usuario |
| PATCH | /api/tickets/:ticketId/reapertura | Usuario |

Para crear un ticket nuevo se requieren `categoriaId`, `subcategoriaId`, `ambienteId`, `asunto` (máximo 120 caracteres) y `descripcion` (máximo 600). La prioridad y el tiempo esperado se toman de la subcategoría seleccionada. Si ya existe un ticket en curso para la misma categoría y ambiente, se muestra un aviso, pero se puede continuar con el registro; tampoco se revela el código de un ticket reportado por otra persona.

Al crear, cancelar o reabrir un ticket se registra el evento de estado en `historial` dentro de la misma transacción. La reapertura requiere `{ "motivo": "..." }` y solo se permite dentro de los 7 días posteriores al cierre.

## HU-4 Cola y asignación

| Método | Ruta                                  | Sesión     | Mockup |
| ------ | ------------------------------------- | ---------- | ------ |
| GET    | /api/cola                             | Supervisor | p22, p23 |
| GET    | /api/cola/bandeja                     | Técnico    | p24    |
| POST   | /api/cola/asignaciones                | Supervisor | p22 (lote), p23 |
| PATCH  | /api/cola/prioridad                   | Supervisor | p22 (lote), p23 |
| POST   | /api/cola/devoluciones                | Supervisor | p22 (lote), p23 |
| POST   | /api/cola/:ticketId/autoasignacion    | Técnico    | p24    |

- Las acciones del supervisor reciben `{ ids: ["tck-00147", ...] }` y son todo o nada: van en una transacción y, si un ticket no cumple, no se cambia ninguno.
- Asignar: `{ ids, tecnicoId, nota }`. El técnico debe estar activo y habilitado en la categoría de cada ticket. Si el ticket ya tenía técnico es una reasignación y la nota es el motivo (mínimo 10 caracteres). La nota se guarda también en la bitácora como nota interna.
- Cambiar prioridad: `{ ids, prioridad, motivo }`, con motivo de 10 a 240 caracteres. Fija el tiempo esperado de la nueva prioridad (crítica 2 h, alta 8 h, media 24 h, baja 72 h).
- Devolver a la cola: `{ ids }`. El ticket queda abierto y sin técnico.
- Cada acción deja su evento en `historial` (tipos `asignacion` y `prioridad`; la devolución agrega además el estado `abierto`).
- Para la cola, HU-4 utiliza `asunto`, `prioridad`, `tiempo_esperado_horas` y `creado_en` de `tickets`.
- La tabla `bitacora` contiene las notas internas que registra HU-4; HU-5 la utiliza para el flujo de atención.

## HU-5 Atención y cierre

| Método | Ruta                                  | Sesión     | Mockup |
| ------ | ------------------------------------- | ---------- | ------ |
| GET    | /api/atencion                         | Técnico    | p24    |
| GET    | /api/atencion/:codigo                 | Cualquiera | p25    |
| GET    | /api/atencion/:codigo/historial       | Cualquiera | p27    |
| POST   | /api/atencion/:codigo/bitacora        | Cualquiera | p25    |
| PATCH  | /api/atencion/:codigo/estado          | Técnico    | p26    |
| PATCH  | /api/atencion/:codigo/cierre          | Técnico    | p26    |

- `:codigo` es el código del ticket, como `TCK-2026-00144`.
- Ver un ticket: lo ven quien lo reportó, cualquier técnico y el supervisor. Quien lo reportó solo ve los comentarios públicos de la bitácora; el equipo ve también las notas internas. La respuesta trae el reporte con su ambiente, la espera en curso, los tiempos, el desenlace, la bitácora, el historial y lo que la persona puede hacer (`permisos`).
- Bitácora: `{ tipo: 'publico' | 'interno', mensaje }`, hasta 600 caracteres. Comentan quien reportó el ticket, el técnico asignado y el supervisor; las notas internas, solo los dos últimos. Un ticket cerrado o cancelado ya no admite entradas.
- Cambiar estado: `{ estado, motivo, retornoEstimado }`. Solo el técnico asignado. Desde abierto o reabierto se pasa a en atención; desde en atención, a en espera o resuelto; desde en espera, a en atención o resuelto; desde resuelto, a en atención. La espera pide motivo (hasta 240 caracteres) y fecha de retorno (`AAAA-MM-DD`, de hoy en adelante), que se guarda como el fin de ese día en Lima.
- Cerrar: `{ solucion }`, de 10 a 600 caracteres. Solo el técnico asignado, con el ticket en atención o resuelto. Guarda `cerradoEn`; desde ahí quien lo reportó puede responder la encuesta (HU-6).
- Cada cambio de estado y el cierre dejan su evento en `historial` (tipo `estado`). Los tiempos no cuentan las esperas y se comparan con el tiempo esperado del ticket, de su subcategoría o de su categoría.

## HU-6 Encuesta de satisfacción

| Método | Ruta                          | Sesión     | Mockup |
| ------ | ----------------------------- | ---------- | ------ |
| GET    | /api/encuestas                | Cualquiera | p28    |
| GET    | /api/encuestas/satisfaccion   | Supervisor | p29    |
| GET    | /api/encuestas/:codigo        | Cualquiera | p27    |
| PUT    | /api/encuestas/:codigo        | Cualquiera | p27    |

- `:codigo` es el código del ticket, como `TCK-2026-00131`. Solo quien reportó el ticket ve y responde su encuesta; para los demás responde 404.
- Responder: `{ puntajeGeneral, rapidez, trato, solucion, comentario }`, los puntajes enteros del 1 al 5 y el comentario opcional de hasta 500 caracteres. Solo con el ticket cerrado y hasta 7 días después del cierre (el mismo plazo con que HU-1 la muestra como pendiente). Responde 201 al crearla.
- Hay una sola respuesta por ticket: volver a enviarla la edita (200) hasta 7 días después de responderla; luego responde 409 `SURVEY_EDIT_EXPIRED`.
- `GET /api/encuestas/:codigo` devuelve `{ encuesta, abierta, plazoHasta }`: la encuesta o `null`, si hoy se puede responder o editar y hasta cuándo.
- Mis encuestas: las respondidas, de la más reciente a la más antigua, con el técnico, si todavía se pueden editar y el promedio que dio la persona.
- Satisfacción: `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&puntaje=todos|1_3|4_5`. Promedia el puntaje general y los aspectos de las encuestas respondidas en el periodo por técnico (el asignado al ticket) y por categoría, y lista los comentarios filtrados por puntaje. La tasa de respuesta es la parte de los tickets cerrados en el periodo que ya tienen encuesta.

## HU-7 Métricas y usuarios

| Método | Ruta                          | Sesión     | Mockup |
| ------ | ----------------------------- | ---------- | ------ |
| GET    | /api/metricas/tablero         | Supervisor | p30    |
| GET    | /api/metricas/carga-tecnicos  | Supervisor | p31    |
| GET    | /api/usuarios                 | Supervisor | p32    |
| GET    | /api/usuarios/:id             | Supervisor | p33    |
| PATCH  | /api/usuarios/:id/bloqueo     | Supervisor | p33    |
| PATCH  | /api/usuarios/:id/desbloqueo  | Supervisor | p33    |

- Las métricas reciben el periodo como `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`, en días de Lima; si falta, la fecha no existe o el fin va antes del inicio, responden 400.
- Tablero: tickets del periodo, abiertos y sin asignar (cifras de ahora), tiempo promedio de atención sin las esperas, tickets fuera del tiempo esperado y la variación frente al periodo anterior de la misma duración. Trae la distribución por estado, por categoría y los seis ambientes con más tickets.
- Carga por técnico: cada técnico activo con sus tickets en curso, en espera, los resueltos del periodo (cuentan para quien tenía el ticket al resolverlo) y su promedio de atención. El aviso sugiere repartir los tickets críticos con un técnico habilitado en esa categoría.
- La satisfacción por técnico y en la ficha es el promedio del `puntaje` de `encuestas` (HU-6); sin encuestas sale `null`.
- Bloquear: `{ motivo }`, hasta 240 caracteres. No se puede bloquear la propia cuenta ni a quien tiene tickets críticos en curso (409). Guarda el motivo en `motivoBloqueo` y cierra las sesiones de la cuenta; desde ahí no puede ingresar (HU-1 responde 403 `ACCOUNT_BLOCKED`).
- Desbloquear borra el motivo. Si la cuenta ya cambió de estado, ambas operaciones responden 409 `ACCOUNT_CHANGED`.
