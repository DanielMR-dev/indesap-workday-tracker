# Indesap Workday Tracker

Aplicación web para registrar jornadas laborales: un trabajador podrá identificarse con un código, iniciar y finalizar su jornada y consultar el tiempo transcurrido. La Fase 2 proporciona una API de jornadas persistente; la interfaz definitiva se desarrollará posteriormente.

## Tecnologías

- Frontend: React, TypeScript, Vite y Tailwind CSS.
- Backend: Node.js, Express, TypeScript, Zod y better-sqlite3 (SQLite).
- Herramientas: npm workspaces, ESLint y tsx.

## Estructura

```text
apps/
  api/src/        # Aplicación Express, configuración, esquema y middleware
  web/src/        # Aplicación React y estilos
.env.example      # Variables de entorno de ejemplo
```

## Requisitos

- Node.js 22.12 o superior y npm compatible.
- Herramientas de compilación nativa de Node.js si no hay binario precompilado de better-sqlite3 disponible (Python, compilador C++ y herramientas de construcción).

## Instalación y configuración

Desde la raíz del repositorio:

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

El archivo `.env` es opcional: sin él se utilizan el puerto `3000` y `data/workday.sqlite`. `PORT` configura el puerto de la API y el destino del proxy de Vite; `DATABASE_PATH` indica la ruta de SQLite, absoluta o relativa a la raíz. Las variables del entorno tienen prioridad sobre `.env`. Reinicia los servidores después de cambiar la configuración.

La inicialización crea el directorio y el esquema si no existen; también ocurre al iniciar la API y es segura de repetir. La base local no se incluye en Git. El esquema habilita claves foráneas en la conexión y restringe a una jornada activa por trabajador. Para rutas personalizadas, mantén la base de datos fuera de los archivos versionados.

## Comandos

| Comando | Función |
| --- | --- |
| `npm run dev` | Inicia API y frontend simultáneamente. |
| `npm run dev:api` | Inicia la API en modo desarrollo. |
| `npm run dev:web` | Inicia Vite en modo desarrollo. |
| `npm run db:init` | Inicializa SQLite sin iniciar la API. |
| `npm run db:seed` | Inserta dos trabajadores ficticios si sus códigos no existen. |
| `npm run typecheck` | Comprueba TypeScript en ambos proyectos. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run build` | Compila ambos proyectos. |
| `npm run start -w @indesap/api` | Inicia la API compilada después de `npm run build`. |

Abre <http://localhost:5173>. Vite envía las solicitudes `/api` a la API local. El frontend de esta fase solo presenta una pantalla inicial; no incluye el flujo de jornadas.

## Health check

`GET http://localhost:3000/api/health` responde:

```json
{"status":"ok","service":"indesap-workday-api"}
```

Si cambiaste `PORT`, utiliza ese puerto. Durante el desarrollo también se puede acceder mediante `http://localhost:5173/api/health`.

## API de jornadas — Fase 2

Ejecuta `npm run db:seed` desde la raíz para registrar `EMP001` (Empleado de prueba uno) y `EMP002` (Empleado de prueba dos). El seed es explícito e idempotente: conserva los trabajadores existentes y sus jornadas. Para probar la API, inicia `npm run dev:api` en otra terminal. Los ejemplos usan el puerto predeterminado.

| Método y ruta | Resultado |
| --- | --- |
| `POST /api/sessions/start` | Inicia una jornada; `201` si se creó. |
| `GET /api/sessions/active/:code` | Devuelve el trabajador y su jornada activa, o `session: null`; `200`. |
| `POST /api/sessions/end` | Finaliza la jornada activa; `200` si se actualizó. |

Los POST reciben JSON con `code` como string no vacío. Se eliminan los espacios exteriores y el código se busca exactamente, respetando mayúsculas y minúsculas.

```bash
curl -i -X POST http://localhost:3000/api/sessions/start \
  -H 'Content-Type: application/json' -d '{"code":"EMP001"}'
curl -i http://localhost:3000/api/sessions/active/EMP001
curl -i -X POST http://localhost:3000/api/sessions/end \
  -H 'Content-Type: application/json' -d '{"code":"EMP001"}'
```

Ejemplo de respuesta de inicio (`201`):

```json
{
  "id": 1,
  "startedAt": "2026-11-10T13:00:00.000Z",
  "endedAt": null,
  "workedSeconds": null,
  "employee": { "id": 1, "code": "EMP001", "name": "Empleado de prueba uno" }
}
```

La consulta activa devuelve `200` y separa el trabajador de la sesión:

```json
{
  "employee": { "id": 1, "code": "EMP001", "name": "Empleado de prueba uno" },
  "session": { "id": 1, "startedAt": "2026-11-10T13:00:00.000Z", "endedAt": null, "workedSeconds": null }
}
```

Si no hay jornada activa, `session` es `null`. La respuesta de finalización conserva la forma de inicio, con `endedAt` y `workedSeconds` definidos; por ejemplo, al terminar a las `2026-11-10T21:00:00.000Z`, `workedSeconds` es `28800`.

El servidor genera las fechas UTC en ISO 8601 y calcula `floor((fin - inicio) / 1000)` en segundos. Una fecha inicial inválida o un reloj del servidor que retrocede impiden finalizar la jornada. SQLite conserva las jornadas entre reinicios; un índice único parcial impide dos jornadas activas por trabajador, incluso ante solicitudes concurrentes. La finalización solo modifica una fila que siga activa.

Los errores tienen forma `{"error":{"code":"...","message":"..."}}`:

| HTTP | Código | Motivo |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Código inválido o JSON mal formado. |
| `404` | `EMPLOYEE_NOT_FOUND` | El código no identifica un trabajador. |
| `409` | `ACTIVE_SESSION_EXISTS` | Ya existe una jornada activa. |
| `409` | `NO_ACTIVE_SESSION` | No hay jornada activa que finalizar. |
| `413` | `PAYLOAD_TOO_LARGE` | El cuerpo supera el límite del analizador JSON. |
| `500` | `INTERNAL_SERVER_ERROR` | Error inesperado; no se exponen detalles internos. |

## Estado

Fases 1 y 2 implementadas: base técnica, API y persistencia de jornadas. El frontend conserva la pantalla inicial; el formulario y el cronómetro visual pertenecen a la Fase 3 y la suite exhaustiva de pruebas a la Fase 4.
