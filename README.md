# Estacionamiento

App web de portafolio para operar un estacionamiento de una sucursal. El primer hito cubre entrada por placa, ocupación, salida e historial reciente.

## Arranque local

Con Docker Desktop iniciado, desde esta carpeta ejecuta:

```powershell
docker compose up --build -d
```

Abre [http://localhost:8080](http://localhost:8080). El primer arranque compila Java y Vue, inicia PostgreSQL y aplica la migración de Flyway. Java, Maven y Node.js se usan dentro de los contenedores. Si el puerto está ocupado, define `PARKING_PORT` antes de levantar Compose.

Registra `ABC-123`, comprueba que baja la disponibilidad y registra la salida. La app guarda la estancia y el importe en PostgreSQL. Para este hito, el sistema empieza con 12 plazas y una cuota de 25 MXN por hora iniciada, con mínimo de una hora. La salida registra el importe calculado.

`docker compose down` detiene los servicios y conserva la base de datos.

## Verificaciones

GitHub Actions construye las imágenes, ejecuta las pruebas de Vitest, comprueba los tipos y el build de Vue, ejecuta Maven y prueba el flujo completo por HTTP contra PostgreSQL. El workflow está configurado para PR y push a `develop` y `main`. Para volverlo obligatorio, marca `parking-flow` como check requerido en las reglas de ambas ramas de GitHub.

Para correr las pruebas de TypeScript y Vue dentro de Docker, ejecuta `docker build --target build ./frontend`. Las pruebas `*.test.ts` están junto al código que verifican.

Con Compose activo, puedes reproducir la comprobación en un contenedor de Node:

```powershell
docker compose run --rm smoke
```

El hito está limitado a uso local. La autenticación, la administración de tarifas desde la web y el despliegue corresponden a etapas posteriores.

## Migraciones de PostgreSQL

Flyway aplica automáticamente los archivos SQL en `backend/src/main/resources/db/migration/` al arrancar Spring Boot. `V1__parking.sql` crea las tablas, las restricciones y la configuración inicial. Para cambiar el esquema, agrega una migración como `V2__descripcion_del_cambio.sql`. Conserva intactas las migraciones que ya se aplicaron. La prueba HTTP de CI arranca con una base nueva y verifica el flujo sobre el esquema creado por Flyway.
