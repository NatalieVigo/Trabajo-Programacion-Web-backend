# Mesa de ayuda de servicios del campus — Backend

API REST de la entrega final, hecha con Node.js, Express, Sequelize y MySQL (XAMPP). El frontend está en [Trabajo-Programacion-Web](https://github.com/NatalieVigo/Trabajo-Programacion-Web).

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

Para las pruebas (`npm test`) MySQL debe estar encendido; usan una base aparte, `mesa_ayuda_test`, que se crea con las mismas migraciones y seeders.

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

Por ahora `categorias` y `ambientes` (HU-2), `tickets` (HU-3) y `encuestas` (HU-6) tienen solo las columnas que lee HU-1. Cada responsable reemplaza su modelo, su migración y su seeder por la versión completa.

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
