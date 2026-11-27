# Mesa de ayuda de servicios del campus — Backend

API REST de la entrega final, hecha con Node.js, Express y MySQL (XAMPP). El frontend está en [Trabajo-Programacion-Web](https://github.com/NatalieVigo/Trabajo-Programacion-Web).

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

`npm run db:reset` borra la base `mesa_ayuda` y la vuelve a crear con los archivos de `database/esquema` y los datos de `database/seed.json`, que es una copia del seed de la entrega 1. Hay que volver a correrlo cada vez que cambie algo en `database/`.

Para las pruebas (`npm test`) MySQL debe estar encendido; usan una base aparte, `mesa_ayuda_test`.

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
database/esquema/   tablas, un archivo por historia
database/semilla/   carga del seed, un archivo por historia
database/seed.json  copia del seed de la entrega 1
src/routes/         rutas de la API
src/controllers/    leen la petición y responden; no tocan la base
src/services/       reglas de negocio y validaciones
src/repositories/   consultas SQL
src/middlewares/    sesión, roles y errores
test/               pruebas con Vitest y Supertest
```

Las credenciales van en `.env`, que no se sube al repositorio.

Las rutas con sesión piden el encabezado `Authorization: Bearer <token>`. Los errores responden con el código HTTP que corresponde y un JSON `{ code, message, fieldErrors, details }`.

## Tablas por historia

Son las 17 tablas del `seed.json` de la entrega 1. En SQL se escriben en minúsculas con guion bajo (`tokensRecuperacion` es `tokens_recuperacion`), y la API responde con los nombres del seed. Cada tabla la crea una sola historia, que también carga sus datos semilla. Las demás historias solo la leen, salvo lo indicado en «Tablas compartidas».

| Historia | Tablas |
| --- | --- |
| HU-1 Cuenta y acceso | usuarios, invitaciones, tokensRecuperacion, solicitudesAcceso, intentosAcceso |
| HU-2 Catálogo de servicios | categorias, subcategorias, sedes, pabellones, ambientes, habilitaciones |
| HU-3 Registro de tickets | tickets |
| HU-4 Cola y asignación | historial |
| HU-5 Atención y cierre | bitacora |
| HU-6 Encuesta de satisfacción | encuestas |
| HU-7 Métricas y usuarios | unidades, vinculos |

Por ahora `tickets` (HU-3) tiene solo las columnas que leen HU-1 y HU-2, y `encuestas` (HU-6) solo las que lee HU-1. Cada responsable reemplaza su archivo de `database/esquema` y de `database/semilla` por su versión completa.

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

Las sesiones no se guardan en la base: el token dice de quién es y cuándo vence, y el servidor recuerda en memoria las que se cerraron (al cerrar sesión o al restablecer la contraseña) para responder 401. Si el servidor se reinicia, esa memoria se pierde y un token cerrado vuelve a servir hasta que vence.

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
- Para contar los tickets por categoría, subcategoría y ambiente, HU-2 agregó `categoria_id`, `subcategoria_id` y `ambiente_id` a `tickets`; el responsable de HU-3 las conserva al completar la tabla.
