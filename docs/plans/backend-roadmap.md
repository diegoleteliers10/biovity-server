# Roadmap de ATS, portal y operaciones internas

**Estado:** aprobado para ejecución
**Actualizado:** 2026-10-10
**Repositorios:** `biovity` y `biovity-server`

Este roadmap convierte la auditoría del ATS y del portal profesional en trabajo ejecutable. La meta es cerrar los flujos de contratación, ayudar al equipo de Biovity a operar la plataforma y medir los resultados con datos confiables.

### Trabajo entregado en esta actualización

- La bandeja de avisos lee y marca avisos desde NestJS.
- El alta de organización crea la organización y vincula al usuario con una transacción de NestJS.
- Si el alta queda incompleta, la cuenta puede completar la organización desde el panel después de verificar el correo.
- Las respuestas para cuentas existentes conservan el mensaje genérico de Better Auth.
- Los cambios administrativos de nombre, tipo y estado usan NestJS. Better Auth elimina las sesiones cuando cambia el estado de una cuenta.
- La migración existente `biovity/lib/db/migrations/004_add_admin_user_type.sql` agrega el tipo `admin` a PostgreSQL.
- Las evaluaciones y notas se leen y escriben por NestJS. La API valida puntajes y permisos de reclutamiento, y solo permite borrar una nota a su autor.
- Las preferencias in-app se guardan con el perfil y `NotificationService` las respeta por canal y tipo de evento.
- La deduplicación in-app usa una reserva con clave única. La migración TypeORM está lista y aún debe aplicarse en cada base de datos.
- Se quitó el control de correo de preferencias hasta que el servicio de envío respete ese ajuste.
- Las transiciones de etapa guardan una nota interna de rechazo en el historial, con actor y fecha, y la vista de postulación muestra el historial a reclutadores.
- La migración de la nota interna está lista. Falta aplicarla en las bases de datos objetivo.
- El plan de seguimiento guarda responsable, próxima acción y fecha objetivo por candidatura. El API valida que el responsable sea owner, admin o recruiter de la misma organización. La pantalla de detalle lo edita; el tablero muestra responsables, antigüedad y atrasos, y filtra por responsable o atraso. Las pruebas del controlador confirman que el acceso denegado bloquea la lectura del historial y la actualización del plan (1 suite, 7 pruebas). `npx tsc --noEmit` pasó.
- El selector de responsables carga todas las páginas e incluye al dueño de la organización. La migración se niega a revertir si ya hay planes guardados. Antes de una reversión manual, se debe exportar esos datos.
- El backend envía avisos in-app de lunes a viernes a las 09:00 de Chile para candidaturas vencidas o sin cambios por siete días. Avisa al responsable o, si no hay uno, al dueño. Aplica preferencias y conserva la reserva de deduplicación por 25 horas.
- ATS-10 agrega una página admin para revisar chats sin organización, inspeccionar participantes e historial, y asignar una organización verificada por chat. Todas las rutas comprueban que el actor tenga una sesión admin autenticada. La asignación guarda el admin y la hora. El sistema deja sin asignar los casos sin evidencia suficiente y bloquea los envíos de organización.
- La migración `1791800000004-ApplicationHiringPlan` está lista. Falta aplicarla en las bases de datos objetivo.
- La bandeja de consultas de contacto ahora tiene estados, responsable, fecha de seguimiento, nota de resolución e historial. La API admin de NestJS posee estos campos y Next.js conserva `is_read` y los datos del formulario. La migración `026_contact_message_operations.sql` está lista y falta aplicarla en las bases de datos objetivo.
- El registro de organización rechaza proveedores personales comunes, exige que el dominio del correo coincida con el dominio del sitio web y requiere verificar ese correo antes del inicio de sesión. Esta es la regla de activación para registros nuevos. La validación corre en el formulario y en el servidor antes de crear la cuenta.
- La cola admin de operaciones muestra ofertas activas vencidas y postulaciones abiertas sin próxima acción o con fecha vencida, con fecha de Chile, filtros y paginación. Es una vista de solo lectura y no requiere migración.
- Los correos de verificación, restablecimiento, bienvenida, lista de espera, invitaciones y cartas de oferta del flujo Next.js entran en una outbox persistente. El alta de lista de espera y su correo se guardan en una transacción. Las invitaciones agotadas y vencidas pueden crear una nueva generación idempotente. El worker limita los reintentos incluso si un proceso se detiene tras tomar una fila. NestJS llama al worker cada cinco minutos por una ruta interna. Admin puede ver fallos y reintentar antes de que venza el contenido. La migración `027_email_outbox.sql` falta aplicarla.
- La verificación legal de empresas tiene estados y solicitudes con historial. Admin puede aprobar o rechazar cada solicitud. La API bloquea la publicación y las acciones de reclutamiento hasta la aprobación. Las ofertas públicas y los perfiles de empresa ocultan organizaciones no verificadas. La migración TypeORM `1791800000005-OrganizationVerification` falta aplicarla.
- Los chats nuevos guardan la organización cuando el servidor valida que el reclutador es miembro. La reutilización de chats incluye esa organización. La migración aditiva `1791800000006-ChatOrganization` combina el propietario directo y las filas de miembros, elimina duplicados y asigna solo cuando queda exactamente una organización. Los chats heredados ambiguos quedan sin asignar y los envíos de organización se bloquean para esos chats. La migración está staged y no se ha aplicado.

## Estado actual

La auditoría encontró estas funciones en el código:

- El ATS tiene ofertas, postulaciones, etapas configurables, historial de cambios, evaluaciones, notas, etiquetas, búsqueda de talento, plantillas, calendario, mensajes, ofertas laborales y métricas.
- El portal profesional tiene perfil, CV, búsqueda de empleos, postulaciones, alertas, mensajes, calendario y métricas.
- La API tiene eventos y participantes, miembros de organización, registros de actividad, alertas de empleo, administración y servicios de notificación.
- El frontend y el backend acceden a algunas tablas compartidas. `NotificationService` escribe notificaciones en el backend. Evaluaciones y notas ahora también usan NestJS.

La lista anterior confirma que existen modelos o pantallas. No confirma que los flujos funcionen de extremo a extremo ni que tengan permisos, reintentos y trazabilidad suficientes.

## Reglas de ejecución

1. Verifica el comportamiento actual antes de crear una tabla, pantalla o servicio nuevo.
2. Asigna un único servicio como dueño de cada grupo de campos mutables. Si dos sistemas comparten una tabla, separa los campos y define una API para cada comando antes de cambiar el esquema.
3. Reutiliza el historial de etapas, eventos, evaluaciones y métricas que ya existen cuando cubran el requisito.
4. Mantén la decisión de contratación en manos de una persona. La IA solo aporta evidencia y sugerencias.
5. Define las políticas de datos antes de automatizar la retención o eliminación.
6. Trata la documentación y los issues antiguos como referencias. Confirma cada pendiente contra el código actual.

## Fase 0: verificar flujos y propiedad de datos

**Prioridad:** P0
**Repositorios:** ambos
**Bloquea:** todas las fases que agreguen persistencia o notificaciones

### Trabajo

1. Hecho: documenta los dueños actuales y objetivo en `docs/adr/001-table-ownership.md`.
2. Hecho: migra la lectura y actualización de avisos a la API NestJS.
3. Hecho: migra la creación de organización y el vínculo inicial del usuario a una ruta interna transaccional de NestJS.
4. Hecho: migra evaluaciones y notas a NestJS. La API limita lotes a 100, exige permiso `recruit` y limita el borrado al autor.
5. Hecho: guarda notas internas opcionales de rechazo en el historial y muestra las transiciones a reclutadores. Pendiente: agregar catálogo de motivos definidos por organización.
6. Hecho en parte: el mapa asigna las postulaciones, mensajes, eventos, ofertas y alertas de empleo a NestJS. Los controladores trazados comprueban la propiedad del registro. Pendiente: completar el mapa de rutas y verificar el comportamiento en producción.
7. Hecho en parte (auditoría ATS-07 del 2026-10-10): la creación de postulaciones comprueba rol profesional e identidad de candidato o admin; los cambios de plan y etapa comprueban acceso de reclutamiento, y la transacción comprueba la organización del responsable. Las notas de eventos comprueban permiso de gestión del evento. La respuesta a ofertas usa una transición condicional desde `sent`; las pruebas existentes cubren respuestas simultáneas. La creación de ofertas guarda oferta, chat y mensaje en una transacción. Los registros de contratación comprueban acceso de reclutamiento y el borrado de notas comprueba autor. Las rutas de alertas comprueban que la sesión sea dueña antes de llamar al servicio. Las etiquetas comprueban acceso a los datos de su organización. La escritura de postulaciones inspeccionada en frontend llama a NestJS. Pendiente: las pruebas de controladores usan accesos o servicios simulados y no prueban el recorrido de guardia a base de datos, membresía real ni fallos de persistencia. Las pruebas de zona horaria no prueban permisos ni fallos de persistencia. Las pruebas de ofertas no cubren rollback ante el fallo de cada escritura de la transacción. La configuración de rewrite, cookies y clave interna en producción sigue sin verificar. La auditoría no encontró una regla de retención ni una política de borrado o exportación de datos de candidatos. La relación entre candidato y vacante o postulación para asignar etiquetas sigue como regla de producto abierta; esta auditoría no confirma un defecto. Próximo paso acotado ATS-07-2: probar la autorización y los fallos de persistencia en registros de contratación. La auditoría fue de solo lectura y no verificó producción.
   ATS-07-2 agregó cobertura con los mocks actuales. La denegación bloquea lecturas de evaluaciones y notas, y escrituras de evaluaciones y notas, antes de llamar al servicio. Un lote mixto no devuelve evaluaciones si una candidatura deniega acceso. El borrado primero consulta metadatos, luego comprueba acceso y autor. Los casos nuevos cubren la denegación del borrado, notas ausentes, borrados sin filas afectadas, resultados de escritura ausentes y rechazos de escritura. El servicio real propaga los rechazos de los repositorios simulados.

   `npx jest --runInBand src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts` pasó 2 suites y 24 pruebas. Se agregaron 12 casos del controller y 3 del servicio. `npx tsc --noEmit` pasó con código 0. `git diff --check -- src/interfaces/controllers/application/application-hiring-record.controller.spec.ts src/core/services/application-hiring-record.service.spec.ts odd/tasks/ats-portal-improvements.md docs/plans/backend-roadmap.md` pasó con código 0. Los specs siguen untracked, por lo que el diff solo comprueba los documentos tracked hasta el staging.

   Límites: estos mocks no prueban membresía en la base de datos, restricciones reales de PostgreSQL ni rollback. Un rechazo o resultado ausente no prueba que no exista un registro parcial. Los repositorios guardan antes de recargar el resultado. No se cambió código de producción ni RSVP. El commit y la revisión nativa siguen pendientes. ATS-07 permanece abierto para pruebas de base de datos, permisos y fallos de eventos, rollback de ofertas, configuración de producción y políticas de datos.

8. Hecho en parte: las notificaciones de postulaciones, mensajes y eventos ocurren después de la escritura principal. Los fallos se registran en logs, sin reintento duradero. `NotificationService` puede absorber errores de inserción. ATS-07 mantiene el resultado del mensaje guardado cuando falla la consulta del perfil emisor o la creación de la notificación. Tres pruebas enfocadas cubren los fallos auxiliares y de persistencia. Pendiente: definir un flujo durable de reintentos y sus responsables.
9. Hecho en parte: `docs/adr/001-table-ownership.md` registra los hallazgos de esta auditoría. Pendiente: completar la revisión de rutas y producción, y resolver la política de destinatario del correo de respuesta de oferta.
10. Hecho en código (ATS-07): las rutas Next.js de carga y descarga comprueban que el usuario autenticado sea participante del chat antes de acceder a Storage. La descarga valida la ruta `messages/<chatId>/<filename>` y responde con `private, no-store`. Cinco pruebas enfocadas, TypeScript, Biome y `git diff --check` del frontend pasan. `git diff --check` del backend sigue mostrando CRLF en tres archivos ajenos a este cambio. Pendiente: verificar en producción y completar la auditoría de rutas y permisos.

### Criterios de salida

- Cada campo mutable tiene un servicio dueño y una ruta de escritura documentados.
- Cada tabla compartida tiene un dueño de esquema para sus migraciones.
- Las llamadas que cruzan repositorios tienen un contrato documentado.
- El equipo puede seguir cada flujo desde la acción del usuario hasta el resultado guardado.
- La lista de pendientes antiguos tiene estado verificado en código.

## Fase 1: entregar avisos de forma confiable

**Prioridad:** P1
**Repositorios:** ambos
**Depende de:** Fase 0

### Trabajo

1. Define el catálogo de eventos y destinatarios: nueva postulación, cambio de etapa, rechazo, entrevista, oferta laboral, respuesta a oferta y mensaje nuevo.
2. Hecho en código para correos iniciados en Next.js: agrega outbox persistente, reintentos, clave idempotente de proveedor y estado. El registro de lista de espera y el correo de bienvenida son atómicos. Una invitación vencida puede reencolarse con una nueva generación. ATS-02 está implementado y sus pruebas enfocadas pasan. NestJS guarda la respuesta final y una intención durable en una transacción. Un puente reintenta el correo mediante una ruta privada de Next.js. El usuario eligió al primer reclutador con acceso activo a la organización. La selección valida el acceso actual del reclutador del chat y, si no es elegible, elige al miembro elegible más antiguo. La outbox acepta una repetición idéntica y rechaza una carga distinta para la misma clave. El puente usa `OFFER_RESPONSE_EMAIL_DISPATCH_URL` y `EMAIL_OUTBOX_SECRET`. No se cambiaron ni verificaron valores de producción. La migración `1791800000008-OfferResponseEmailIntent` está en el código y sigue sin aplicar. Espera a la revisión nativa y al acceso de producción aprobado. ATS-11 está implementado: el repositorio de intención guarda la respuesta, el estado e historial de la candidatura, el mensaje existente y la intención en una sola transacción. Sus pruebas enfocadas pasaron (5 suites, 16 pruebas) y `npx tsc --noEmit` pasó. No hizo falta un cambio de esquema. Las revisiones nativas de ATS-02 y ATS-11 siguen pendientes. Revisar también los eventos restantes.
3. Hecho: respeta las preferencias in-app por canal y tipo de evento. La preferencia de correo queda pendiente hasta que el envío aplique el mismo control.
4. Hecho: reserva cada clave de deduplicación en una tabla con clave única y borra reservas vencidas cada hora.
5. Hecho en código para outbox Next.js: guarda intentos, éxito, fallo y último error. Admin ve correos agotados y puede reintentarlos si el contenido no venció. Las filas agotadas con un lease vencido pasan a estado fallido y no superan el máximo de intentos por fallos del worker.
6. Hecho en código para outbox Next.js: el flujo registra el correo antes de llamar al proveedor; el worker entrega fuera de la transacción del producto.
7. Hecho en código: la ruta del worker valida un secreto compartido. NestJS llama la ruta cada cinco minutos con `EMAIL_OUTBOX_DISPATCH_URL` y `EMAIL_OUTBOX_SECRET`. Pendiente: configurar estas variables y verificar remitente y cron en producción.
8. Agrega avisos dentro del producto y correo donde el evento lo requiera.

### Criterios de salida

- Cada evento acordado crea como máximo un aviso lógico por destinatario.
- Los fallos de correo se pueden reintentar y consultar.
- Un reintento usa la misma clave de proveedor. La outbox ofrece entrega al menos una vez y deja documentado el riesgo de repetición después de la ventana de idempotencia.
- Las preferencias de usuario bloquean los canales que el usuario desactivó.
- La aplicación nueva y cada cambio de estado muestran el aviso correcto en el portal.

## Fase 2: hacer que el pipeline indique la próxima acción

**Prioridad:** P1
**Repositorios:** ambos
**Depende de:** Fase 0

### Trabajo

1. Hecho: `application_status_history` guarda actor, hora, estado anterior y estado nuevo. La creación de una candidatura y su estado inicial comparten una transacción. El detalle muestra el historial a reclutadores.
2. Hecho en parte: el equipo puede guardar una nota interna de rechazo. Pendiente: agrega un motivo estructurado por organización y una nota adicional.
3. Hecho en parte: cada etapa tiene una proyección a uno de los seis estados públicos actuales. Pendiente: define reglas explícitas de terminalidad y reapertura para etapas personalizadas.
4. Hecho: la candidatura y su etapa comparten la misma oferta. La API comprueba la oferta y una clave foránea compuesta lo aplica en PostgreSQL.
5. Hecho: el historial guarda IDs y copias de nombres de etapa. La migración también completa los registros iniciales que faltaban.
6. Hecho en código: la migración crea etapas iniciales y asigna las candidaturas actuales. La creación de ofertas nuevas crea el mismo conjunto. Pendiente: aplicar la migración en las bases de datos objetivo.
7. Hecho: el portal y las métricas conservan `application.status` como estado público de resultado.
8. Hecho: el tablero, detalle, scorecard, filtros y acciones masivas usan IDs de etapas configurables. Las herramientas de IA pueden consultar las etapas activas de una oferta y mover la candidatura por ID, con aprobación humana y nota requerida para rechazo.
9. Hecho: la eliminación archiva las etapas personalizadas. La configuración muestra las etapas archivadas y bloquea su edición. La API también rechaza cambios a etapas fijas o archivadas. El reordenamiento solo envía etapas activas. Las candidaturas archivadas siguen visibles y pueden salir de la etapa. No se permiten nuevas transiciones hacia etapas archivadas. Las seis etapas integradas no se pueden archivar mientras las rutas antiguas dependan de ellas.
10. Hecho en código: define responsable, próxima acción y fecha objetivo por candidatura. El API solo acepta un responsable owner, admin o recruiter de la misma organización. El selector carga todos los miembros y al owner. Pendiente: aplicar la migración en las bases de datos objetivo.
11. Hecho en código: muestra antigüedad en la etapa y casos vencidos con fecha de calendario de Chile; permite filtrar por responsable y atraso.
12. Hecho en código: envía recordatorios en días hábiles a las 09:00 de Chile para candidaturas vencidas o sin cambios por siete días. Avisa al responsable o al dueño si no hay responsable. Usa preferencias in-app y una clave diaria con reserva por 25 horas.

### Criterios de salida

- Cada cambio de etapa tiene actor y hora en el historial.
- El tablero usa las etapas configuradas para la oferta y el portal profesional conserva estados de resultado comprensibles.
- La API y la base de datos rechazan una etapa que pertenezca a otra oferta.
- Cada rechazo guarda un motivo definido por la organización.
- El equipo puede filtrar candidaturas por responsable, próxima acción y atraso.
- Renombrar, archivar o reordenar etapas no cambia el historial guardado. Una etapa archivada conserva las candidaturas existentes y no recibe nuevas.
- Las reglas de reapertura y eliminación de etapas no borran el historial.

## Fase 3: guiar la activación de organizaciones y la operación interna

**Prioridad:** P1
**Repositorios:** ambos
**Depende de:** Fases 0 y 1

### Trabajo

1. Hecho para registros nuevos: se rechazan proveedores personales comunes; el dominio del correo corporativo debe coincidir con el del sitio web; Better Auth exige verificar ese correo antes de iniciar sesión. Esto verifica el control del correo y del dominio, no la existencia legal de la empresa. Pendiente: audita cuentas antiguas contra esta regla y define la completitud del perfil.
2. Hecho en código: conserva el alta básica con correo corporativo verificado. La verificación legal usa estados `unverified`, `pending`, `verified`, `rejected` y `suspended`, solicitudes con historial, datos legales, fuente de registro, revisor, fecha y motivo de decisión. Admin puede aprobar o rechazar solicitudes. La API permite guardar borradores y perfiles antes de aprobar. Bloquea la publicación y las acciones de reclutamiento hasta que la empresa quede verificada. Las vistas públicas ocultan ofertas y perfiles de empresas no verificadas. ATS-04 agrega pruebas enfocadas para bloquear nuevos pedidos en estados verificado y suspendido, permitir reenvío tras rechazo, guardar motivo y revisor, y evitar una segunda revisión; el control de la cola admin ahora exige identidad admin autenticada. Las nuevas pruebas públicas verifican que el perfil y la lista de empresas filtren por estado verificado y que la consulta de vacantes públicas exija una organización verificada. Las pruebas públicas pasaron (2 suites, 3 pruebas); las pruebas de solicitud, revisión y cola admin pasaron aparte (2 suites, 12 pruebas). `npx tsc --noEmit` pasó. Decisión del usuario: las organizaciones existentes quedan `unverified` hasta una revisión legal admin. Pendiente: revisión nativa, prueba integral y aplicación de `1791800000005-OrganizationVerification` en las bases objetivo. Antes de migrar, inventaría las empresas existentes y planifica su revisión inicial.
3. Pendiente: crea una cola interna que muestre organizaciones nuevas, hitos faltantes y la próxima fecha de seguimiento.
   - ATS-12, implementado en código: agrega un filtro de lectura en la cola admin para encontrar organizaciones sin trabajos activos. Usa `job.status = active` como regla para un trabajo activo. Conserva la búsqueda, la paginación y los filtros actuales de trabajos vencidos y seguimiento de postulaciones. Las pruebas enfocadas (1 suite, 4 pruebas en backend; 2 pruebas en frontend), `npx tsc --noEmit` en ambos repositorios y los chequeos `git diff --check` acotados pasaron. No existe un commit de unidad de trabajo. La revisión nativa RDD sigue pendiente porque el usuario no eligió la estrategia de cadena. Este filtro no completa la cola general ni define asignación, responsables, fechas de seguimiento, cambios de estado o acciones de escritura. La parte del criterio sobre actividad reciente sigue pendiente.
4. Hecho en código para consultas de contacto y señales de vacantes/postulaciones: las colas admin filtran, buscan y paginan; la de contacto permite asignar, resolver, reabrir y consultar cambios. La cola de vacantes/postulaciones es de solo lectura. ATS-07 ahora crea la oferta, reutiliza o crea el chat, inserta el mensaje, actualiza el último mensaje y guarda el vínculo en una transacción. Las pruebas enfocadas pasaron (2 suites, 8 pruebas), al igual que `npx tsc --noEmit` y el `git diff --check` limitado a los seis archivos del task. La notificación ocurre después del commit y sigue como mejor esfuerzo. La revisión nativa y la auditoría completa de rutas siguen pendientes. Pendiente: integra ofertas incompletas y fallos de correo o IA en colas accionables.
5. Hecho en código para consultas de contacto: asigna un administrador y un estado. Pendiente: define responsables, estado y próxima acción para el resto de tareas internas.
6. Define rutinas y tiempos objetivo para revisar organizaciones, moderar ofertas, responder consultas y resolver reportes.
7. Hecho en código para consultas de contacto: registra actor, hora y cambios en el historial. Pendiente: añade acciones de soporte para las otras colas.
8. Empieza con estas colas concretas. No crees un CRM genérico hasta que el equipo confirme otros casos de uso.

### Criterios de salida

- El equipo puede encontrar organizaciones sin oferta activa o sin actividad reciente.
- Cada tarea interna tiene responsable, estado y siguiente fecha de acción.
- El equipo puede ver consultas y reportes abiertos y cerrados.
- Las acciones administrativas quedan en el registro de actividad.

## Fase 4: coordinar entrevistas y registrar sus resultados

**Prioridad:** P2
**Repositorios:** ambos
**Depende de:** Fase 1

### Trabajo

1. Hecho y verificado con pruebas focalizadas: `Event` guarda `applicationId`, NestJS valida su relación con la candidatura y permite filtrar por ese ID. El detalle de candidatura lista sus entrevistas vinculadas. Backend: 2 suites y 2 pruebas. Frontend: 1 prueba. Pendiente: aplicar/verificar este flujo con la base de datos objetivo.
2. Implementado y corregido, alcance ATS-05-TZ: guarda la hora como un instante UTC y la zona IANA elegida por quien organiza, con `America/Santiago` por defecto. Cada participante ve su hora local y la zona del evento. El API conserva el instante y la zona en creación y edición, y rechaza zonas con desplazamiento numérico. El formulario rechaza horas nuevas inexistentes o repetidas por el cambio de horario. El calendario semanal cubre las 24 horas y coloca el evento de Tokio el domingo a las 00:30. La evidencia figura en `odd/tasks/ats-portal-improvements.md`.

   Las pruebas focalizadas pasaron: backend, 1 suite y 3 pruebas del API. Frontend, 8 pruebas del API, de las vistas y del calendario semanal. Los tipos, los formatos focalizados y las comprobaciones directas del cambio de horario pasaron. El diff del frontend pasó. El diff normal del backend falla solo por los tres archivos CRLF existentes, y `git -c core.whitespace=cr-at-eol diff --check` pasó.

   Las pruebas fallaron antes de las dos correcciones, y Sentinel devolvió APPROVE después. La aprobación RDD nativa sigue pendiente. La migración `1791800000009-EventTimeZone.ts` está ignorada por Git y no se ha aplicado. No se ejecutó ningún stage, commit, servidor, build ni migración. La previsión supera 400 líneas modificadas y no permite aislar un conteo exacto de esta parte entre cambios anteriores. El usuario eligió `feature-branch-chain`: una rama `codex/ats-portal-improvements` para ambos repositorios. Los commits de trabajo se planifican por slice y sus IDs se registran en `odd/tasks/ats-portal-improvements.md`.

   ATS-07-3: las pruebas con mocks bloquean la creación o edición denegadas antes del servicio. El rechazo al guardar un evento o sus participantes impide el commit y los avisos. El rechazo de edición impide los avisos. Un fallo de aviso después de guardar conserva el resultado exitoso y llega al logger. `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts src/core/services/event.service.spec.ts` pasó 2 suites y 13 pruebas. Se agregaron 2 casos del controller y 5 del servicio. `npx tsc --noEmit` y el diff acotado pasaron con código 0. No hubo RED de comportamiento ni cambios de producción, reglas RSVP o historial. Los mocks no prueban sesiones por cookie, membresía real, restricciones de PostgreSQL, rollback real ni entrega duradera. Las llamadas de rollback solo prueban el orden de control. El commit y la revisión nativa están pendientes.

3. Pendiente, ATS-05-1: aplica reglas de RSVP y guarda el historial de cambios. La exploración del 2026-10-10 confirmó que `PATCH /events/:id/participants/:userId` comprueba la identidad solicitante y el acceso RSVP al evento. El servicio acepta el estado recibido. La auditoría original no encontró una prueba del controller RSVP. ATS-05-1a agregó pruebas con mocks para rechazar una identidad ausente o distinta antes de comprobar acceso o llamar al servicio. Una identidad coincidente llega a la comprobación RSVP, cuya denegación bloquea el servicio. Los cambios y cancelaciones del organizador, y los cambios de RSVP, activan avisos in-app best-effort después de guardar. Los modelos actuales de evento y participante no muestran historial. El frontend permite crear, editar y borrar eventos, y muestra hora, enlace y estado. Antes de definir pruebas de transición, el usuario debe decidir si una persona puede cambiar una respuesta aceptada o rechazada y si puede responder después de cancelar o completar el evento. No se debe inventar esta política.
   ATS-05-1a: `npx jest --runInBand src/interfaces/controllers/event/event.controller.spec.ts` pasó 1 suite y 6 pruebas, incluidas las 3 existentes de filtros y zona horaria. `npx tsc --noEmit` y el diff acotado pasaron con código 0. No hubo RED de comportamiento porque estas pruebas cubren reglas existentes sin cambios de producción. Los mocks no prueban el guard global de sesión por cookie, membresía real en base de datos, persistencia ni política de transición RSVP. El commit y la revisión nativa siguen pendientes. Las reglas de transición, el historial, los fallos de persistencia y los avisos siguen abiertos.

4. Pendiente: envía recordatorios idempotentes y notifica cambios a todos los participantes. La notificación actual después de guardar es best-effort y no acredita entrega confiable a todos.
5. Pendiente: registra el resultado de la entrevista y la evaluación de cada entrevistador.
6. Pendiente: revisa la necesidad de sincronizar calendarios externos con organizaciones usuarias antes de elegir proveedores.

### Criterios de salida

- Cada entrevista enlaza una candidatura, un instante UTC, una zona IANA del evento y participantes. La creación y edición conservan el instante y la zona. Cada participante ve su hora local y la zona del evento.
- Un cambio o cancelación llega a todas las personas afectadas.
- Las personas pueden confirmar o rechazar asistencia.
- Cada participante puede cambiar su RSVP solo según las reglas que apruebe el producto. Las respuestas a eventos cancelados o completados siguen la política aprobada.
- El historial registra quién cambió el evento o el RSVP, cuándo y qué valores cambiaron.
- La organización puede registrar el resultado de la entrevista.

La siguiente tarea de implementación ATS-05-1 debe probar las reglas aprobadas, la autorización del controller, los fallos de persistencia, el historial y el comportamiento de avisos. La política RSVP pendiente bloquea las pruebas de transición y cualquier cambio de regla. El plan y la evidencia están en `odd/tasks/ats-portal-improvements.md`.

La entrega usa `feature-branch-chain`: una rama, `codex/ats-portal-improvements`, compartida por ambos repositorios. Agrupa cada slice en un commit de trabajo y registra su ID en el plan. Esta actualización documental no crea un commit.

## Fase 5: completar evaluación y control de IA

**Prioridad:** P2
**Repositorios:** ambos
**Depende de:** Fases 0 y 2

### Trabajo

1. Hecho: migra evaluaciones y notas a NestJS con permiso `recruit`, límite de 100 evaluaciones por lote y borrado de notas solo por su autor.
2. Hecho: valida puntajes de 0 a 5, contextos permitidos y justificación para evaluaciones neutrales o negativas.
3. Define criterios de evaluación por etapa y rol entrevistador.
4. Muestra evidencia que sustenta las sugerencias de IA y permite corregirlas.
5. Guarda quién revisó o cambió una sugerencia de IA y por qué.
6. Evita que un puntaje de IA avance o rechace una candidatura sin una acción humana.
7. Hecho en código: limita el acceso a CV, notas y evaluaciones según el rol de organización. La ruta CV de URL firmada valida sesión, permiso del backend y ruta almacenada antes de acceder a Storage. Sus pruebas cubren sesión ausente, rutas inválidas y distintas, denegación del backend, ausencia de acceso a Storage y caché privada. `node --test tests/cv-security.test.cjs` pasó (8 pruebas, incluyendo la cobertura previa de borrado).

### Criterios de salida

- Cada evaluación muestra criterios, autor y fecha.
- Una recomendación de IA incluye evidencia y permite una decisión humana distinta.
- El registro de actividad muestra cambios a la evaluación y a las sugerencias de IA.
- Un miembro sin permiso no puede leer notas o datos de candidatos.

## Fase 6: medir el embudo y la calidad del servicio

**Prioridad:** P2
**Repositorios:** ambos
**Depende de:** Fases 1, 2 y 4

### Trabajo

1. Define el significado y la fuente de cada métrica antes de agregarla a un panel.
2. Agrega tiempo por etapa, tiempo hasta primera respuesta, conversión entre etapas, tiempo hasta contratación y ofertas sin respuesta.
3. Registra la fuente de cada oferta y candidatura con una taxonomía acordada.
4. Compara cohortes por periodo, tipo de cargo y fuente. No mezcles grupos con distinto volumen o contexto.
5. Permite revisar las filas fuente de cada cifra agregada.
6. Usa los resultados para decidir dónde hacen falta recomendaciones de empleo y matching de candidatos.

### Criterios de salida

- Cada métrica tiene una definición y una fuente documentadas.
- Los conteos del panel se pueden comparar con las filas fuente.
- La fuente de una oferta o candidatura se conserva durante el proceso.
- El panel muestra tiempos y conversiones con los filtros acordados.

## Fase 7: definir el ciclo de vida de datos de candidatos

**Prioridad:** P1 para definir política; P2 para automatizar
**Repositorios:** ambos
**Depende de:** Fase 0 y revisión de política de producto y legal

### Trabajo

1. Define qué datos se guardan, para qué se usan y durante cuánto tiempo.
2. Define cómo una persona solicita una copia, corrección o eliminación de sus datos.
3. Incluye CV y archivos, postulaciones, mensajes, notas, evaluaciones, puntajes de IA y respaldos alcanzables.
4. Define excepciones, como una retención aprobada, y quién puede autorizarlas.
5. Implementa exportación y eliminación con una bitácora que indique qué datos se borraron o por qué se retuvieron.
6. Comunica los cambios y solicita consentimiento cuando el producto lo requiera.

### Criterios de salida

- La política define retención por tipo de dato y finalidad.
- Una solicitud se puede seguir desde su recepción hasta su cierre.
- La exportación incluye todos los datos dentro del alcance acordado.
- La eliminación verifica registros y archivos. Cada excepción tiene responsable y motivo.

## Trabajo técnico pendiente por verificar

El roadmap del 2026-08-24 describía estos temas como pendientes. El código actual ya contiene varias de esas piezas. Verifica comportamiento de producción antes de abrir trabajo nuevo.

| Tema | Evidencia actual | Siguiente paso |
|---|---|---|
| Verificación local ATS-08, 2026-10-10 | Backend: `npx jest --runInBand` pasó 46 suites y 203 tests. Frontend: `node --test tests/*.test.cjs` pasó 193 tests, sin fallos ni omisiones. `npx tsc --noEmit` pasó en ambos repositorios. Los cuatro comandos salieron con código 0. ESLint revisó 133 archivos TypeScript cambiados y reportó 1.470 errores en 72 archivos: 1.392 de Prettier y 78 de reglas TypeScript, sin advertencias. Biome revisó 94 archivos cambiados compatibles y reportó 5 errores, 3 advertencias y 1 aviso informativo. Ambos comandos de lint salieron con código 1. No se comparó con la base. `git diff --check` del backend salió con código 2 por CRLF en tres archivos. La variante `git -c core.whitespace=cr-at-eol diff --check` pasó. Los controles de diff del frontend y de cambios staged en ambos repositorios pasaron | Mantener ATS-08 abierto para revisar los errores de lint, completar la revisión nativa y verificar producción. No se inició un servidor, se ejecutó un build ni se aplicaron migraciones |
| Validación de entorno, guards por rol, filtros HTTP y throttling | Configuración y clases presentes en `biovity-server/src` | Revisar rutas, límites efectivos y configuración de producción |
| Notificaciones y correo | `NotificationService` guarda avisos in-app y reserva claves con una restricción única. Next.js ya tiene `email_outbox` para los correos enumerados arriba. `EmailService` de NestJS aún envía directo y registra fallos por excepción/log | Pasar el correo de respuesta de oferta de NestJS por el contrato outbox. Aplicar `027_email_outbox.sql`, configurar el puente cron y revisar entregas en producción |
| Historial y etapas | `application_status_history` guarda actor, hora, nota interna y snapshots de etapa. `application` referencia una etapa de la misma oferta. Tablero, detalle, scorecard, acciones masivas y herramientas de IA usan etapas configurables. El plan de seguimiento persiste responsable, próxima acción y fecha objetivo | Aplicar las migraciones pendientes. Después, agregar motivos estructurados, recordatorios y reglas de terminalidad/reapertura |
| Métricas | Existe `organization-metrics.service.ts` con tiempos y conversiones | Acordar definiciones, fuentes y controles de los datos |
| Eventos y entrevistas | Existen `Event`, `EventParticipant` y páginas de calendario | Validar vinculación con candidaturas, avisos, cambios y resultados |
| Expiración de ofertas y cron | Existe un cron semanal para informes. El roadmap anterior describía vencimiento automático como pendiente | Confirmar tareas programadas y seguridad de rutas cron en producción |
| Privacidad y ciclo de vida de datos | No se confirmó un flujo integral en esta revisión | Inventariar datos y archivos antes de definir automatizaciones |
| Frontera de escritores y migraciones | Notificaciones, alta de organización, cambios administrativos de usuarios, evaluaciones y notas ya usan NestJS | Trazar los flujos restantes y actualizar la matriz de ownership |
| Asociación de organización en chats | Los chats nuevos validan la membresía y los envíos de organización usan la organización guardada en el chat. Los chats heredados sin una coincidencia única quedan sin asignar y bloquean esos envíos | Aplicar `1791800000006-ChatOrganization` y `1791800000007-ChatOrganizationReview` en el despliegue aprobado. Definir el proceso operativo de revisión admin y asignación de chats heredados |
| Revisión admin de chats heredados | ATS-10 está implementado y sus rutas requieren un admin autenticado. La página limita la cola a chats sin organización, muestra participantes e historial y permite asignar una organización verificada por chat. La escritura condicional conserva asignaciones existentes y registra el actor y la hora. Las pruebas enfocadas del controller pasaron: 1 suite y 5 tests. El typecheck del backend pasó. RDD está activo, pero el STATUS nativo pidió una captura de selección que esta sesión no puede ejecutar. No se inició una transacción de revisión | Completar la revisión técnica nativa. Aplicar `1791800000006-ChatOrganization` y `1791800000007-ChatOrganizationReview` después de la revisión, con credenciales y contexto de despliegue definidos. `1791800000006-ChatOrganization` está staged. `1791800000007-ChatOrganizationReview` está ignorada por Git. `1791800000000-application-hiring-records` está untracked y su estado en producción no está verificado. Definir el proceso operativo para asignar chats cuando haya evidencia suficiente |

## Orden de ejecución

```text
Fase 0: propiedad de datos y flujos
  ├── Fase 1: avisos confiables
  │     ├── Fase 3: activación y operación interna
  │     └── Fase 4: entrevistas
  ├── Fase 2: pipeline accionable
  │     ├── Fase 5: evaluación y control de IA
  │     └── Fase 6: métricas
  └── Fase 7: política y ciclo de vida de datos
```

No inicies una fase dependiente hasta que sus criterios de salida tengan evidencia en los dos repositorios y, cuando aplique, en producción. Actualiza este documento cuando una revisión cambie el alcance o revele una función ya completa.
