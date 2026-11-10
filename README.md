# Indesap Workday Tracker

Aplicación web para registrar jornadas laborales: un trabajador podrá identificarse con un código, iniciar y finalizar su jornada y consultar el tiempo transcurrido. La Fase 1 establece únicamente la base técnica; el flujo de jornadas se implementará en fases posteriores.

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

## Estado

Fase 1 completada: base técnica inicial verificada. Las funcionalidades de identificación y gestión de jornadas pertenecen a fases posteriores.
