# SEIA PAC Intelligence Platform
## Prompt Técnico Maestro para OpenCode / Cursor / Claude Code / GPT-5

---

# Objetivo General

Desarrollar una plataforma desktop-first denominada **SEIA Comunidades**, orientada al monitoreo, seguimiento, análisis, clasificación y reportería de procesos de Participación Ciudadana (PAC) del Sistema de Evaluación de Impacto Ambiental (SEIA) de Chile.

La plataforma reemplaza un flujo ETL basado en n8n por una solución modular orientada a dominio (DDD), capaz de:

- Extraer información desde el portal SEIA.
- Monitorear expedientes ambientales.
- Analizar observaciones ciudadanas.
- Gestionar seguimiento institucional.
- Mantener notas internas.
- Generar reportes ejecutivos.
- Almacenar toda la información en archivos TOML.
- Funcionar completamente en escritorio mediante Electron.
- Permitir capacidades futuras de IA local.

Inspirado en el workflow existente SEIA Pac Analizer v.1.3.5.json. 【1-a3f5a4】

---

# Stack Tecnológico Obligatorio

## Frontend

- Astro 5+
- TypeScript estricto
- TailwindCSS
- Astro Islands
- TanStack Table
- TanStack Query
- ECharts
- Zod
- Shadcn UI

## Desktop

- Electron
- electron-builder
- electron-updater

## Backend Local

- NodeJS 22+
- TypeScript
- Event Bus
- Dependency Injection

## Persistencia

- TOML
- Repository Pattern
- File System Storage
- Local Full Text Search

## Indexación

- FlexSearch o Lunr.js

## Geoespacial

- Leaflet
- OpenStreetMap

## Reportería

- CSV
- XLSX
- Markdown
- HTML
- PDF

## IA Local (Futura)

- Ollama
- Phi-4
- Qwen3
- Llama 3.3

---

# Principios de Arquitectura

## Arquitectura Hexagonal

```txt
Presentation Layer
        │
Application Layer
        │
Domain Layer
        │
Infrastructure Layer
```

---

## Principios

- SOLID
- CQRS
- Domain Driven Design
- Event Driven Architecture
- Dependency Injection
- Repository Pattern
- Adapter Pattern
- Clean Architecture

---

# Arquitectura Base del Proyecto

```txt
project-root/

├── electron/
│
├── src/
│
│   ├── app/
│   │   ├── bootstrap.ts
│   │   ├── config.ts
│   │   └── main.ts
│
│   ├── domain/
│   │
│   │   ├── project/
│   │   ├── pac/
│   │   ├── observation/
│   │   ├── report/
│   │   ├── note/
│   │   ├── automation/
│   │   └── common/
│
│   ├── application/
│   │
│   │   ├── usecases/
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── dto/
│   │   └── handlers/
│
│   ├── infrastructure/
│   │
│   │   ├── scraper/
│   │   ├── parsers/
│   │   ├── repositories/
│   │   ├── exporters/
│   │   ├── indexing/
│   │   ├── scheduler/
│   │   ├── notifications/
│   │   └── ai/
│
│   ├── presentation/
│   │
│   │   ├── astro/
│   │   ├── widgets/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── components/
│
│   └── shared/
│       ├── logger/
│       ├── utils/
│       ├── constants/
│       ├── types/
│       └── events/
│
├── data/
├── exports/
├── reports/
├── indexes/
└── cache/
```

---

# Organización de Persistencia

```txt
data/

├── projects/
│
├── observations/
│
├── notes/
│
├── timelines/
│
├── reports/
│
├── indexes/
│
├── schedules/
│
└── cache/
```

---

# Módulo 1
# Scraper SEIA

Responsabilidades:

- Buscar proyectos.
- Obtener expedientes.
- Detectar PAC.
- Recuperar observaciones.
- Recuperar documentos asociados.
- Actualización incremental.

Fuente principal:

https://seia.sea.gob.cl

---
---

# Catálogo de Endpoints SEIA

La aplicación debe centralizar todos los accesos al portal SEIA mediante adaptadores desacoplados.

## API Gateway

```txt
src/
├── infrastructure/
│   └── seia/
│       ├── SeiaApiClient.ts
│       ├── ProjectApi.ts
│       ├── PacApi.ts
│       ├── DocumentApi.ts
│       ├── DescriptionApi.ts
│       ├── ScheduleApi.ts
│       └── types.ts
```

---

# Configuración Base

## seia.toml

```toml
[seia]

base_url = "https://seia.sea.gob.cl"

[seia.endpoints]

projects = "/busqueda/buscarProyectoResumenAction.php"

project_sheet = "/expediente/ficha/fichaPrincipal.php"

records = "/expediente/xhr_expediente.php"

pac_documents = "/expediente/xhr_documentos_pac.php"

schedule = "/expediente/newPlazos.php"

document_receivers = "/documentos/verDestinatarios.php"

representative_point = "/mapa/visualizacion/PuntoRepresentativo/index.php"

project_file = "/expediente/expediente.php"
```

---

# Endpoint 1
# Búsqueda de Proyectos

Método:

POST

URL:

https://seia.sea.gob.cl/busqueda/buscarProyectoResumenAction.php
```

Parámetros observados:

```txt
nombre
titular
selectRegion
selectComuna
tipoPresentacion
projectStatus
PresentacionMin
PresentacionMax
CalificaMin
CalificaMax
sectores_economicos
razoningreso
id_tipoexpediente
offset
limit
orderColumn
orderDir
```

Respuesta esperada:

```typescript
interface SearchProjectsResponse {
  data: ProjectSearchResult[];
  pages:number;
  totalRegistros:number;
}
```

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 2
# Ficha del Proyecto

Método:

GET

URL

```txt
https://seia.sea.gob.cl/expediente/expediente.php?id_expediente={ID}&modo=ficha
```

Obtiene:

- descripción
- titular
- inversión
- tipología
- fechas
- estado

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 3
# Expediente Ambiental

Método:

GET

URL

```txt
https://seia.sea.gob.cl/expediente/xhr_expediente.php?incluyePac=1&id_expediente={ID}
```

Retorna:

- expedientes
- documentos
- registros administrativos
- antecedentes PAC

Mapear a:

```typescript
interface DossierRecord {
  id:number;
  register:string;
  title:string;
  date:string;
}
```

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 4
# Documentos PAC

Método:

GET

URL

```txt
https://seia.sea.gob.cl/expediente/xhr_documentos_pac.php?incluyePac=2&id_expediente={ID}
```

Retorna:

- observaciones ciudadanas
- informes PAC
- resoluciones
- solicitudes PAC
- registros

Este endpoint constituye la fuente principal para:

- timeline
- estadísticas PAC
- análisis ciudadano

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 5
# Destinatarios del Documento

Método:

GET

URL

```txt
https://seia.sea.gob.cl/documentos/verDestinatarios.php?id_documento={ID}
```

Se utiliza para:

- identificar remitentes
- identificar destinatarios
- reconstruir la red de actores

Modelo:

```typescript
interface Participant {
  name:string;
  organization?:string;
}
```

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 6
# Contenido de Observaciones

El workflow identifica documentos de observación y consulta directamente el contenido HTML.

Los documentos contienen información extraíble desde:

```html
<p>
Nombre:
...
Observación:
...
</p>
```

Modelo destino:

```typescript
interface CitizenObservation {

  id:string;

  projectId:string;

  sender:string;

  submittedAt:Date;

  subject?:string;

  category?:string;

  content:string;

  sourceUrl:string;
}
```

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 7
# Plazos de Evaluación

Método:

GET

URL

```txt
https://seia.sea.gob.cl/expediente/newPlazos.php?modo=ficha&id_expediente={ID}
```

Información asociada:

- plazos legales
- suspensiones
- reanudaciones
- vencimientos

Modelo:

```typescript
interface EvaluationSchedule {

  legalDays:number;

  elapsedDays:number;

  suspendedDays:number;

  remainingDays:number;

  status:
    | "active"
    | "suspended"
    | "expired";
}
```

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Endpoint 8
# Mapa del Proyecto

Método:

GET

URL

```txt
https://seia.sea.gob.cl/mapa/visualizacion/PuntoRepresentativo/index.php?idExpediente={ID}
```

Utilizar para:

- visualización geográfica
- clustering
- análisis territorial
- capas regionales

Fuente: SEIA Pac Analizer v.1.3.5.json. 【1-f1e4c8】

---

# Servicio Unificado

```typescript
export interface SeiaGateway {

  searchProjects(
    criteria: SearchCriteria
  ): Promise<Project[]>;

  getProject(
    projectId:string
  ): Promise<Project>;

  getPacRecords(
    projectId:string
  ): Promise<PacRecord[]>;

  getDossier(
    projectId:string
  ): Promise<DossierRecord[]>;

  getSchedule(
    projectId:string
  ): Promise<EvaluationSchedule>;

  getDocumentParticipants(
    documentId:string
  ): Promise<Participant[]>;

  getObservationContent(
    url:string
  ): Promise<CitizenObservation>;

}
```

---

# Caché Recomendada

```txt
cache/

├── projects/
├── dossiers/
├── pac/
├── schedules/
├── documents/
└── maps/
```

TTL:

- Proyectos activos: 24 horas
- PAC activas: 6 horas
- Observaciones: 12 horas
- Mapas: 7 días
- Expedientes cerrados: 30 días

## Interface

```typescript
export interface ScraperService {

  findProjects(): Promise<Project[]>;

  findByRegion(
    region: string
  ): Promise<Project[]>;

  fetchProject(
    id: string
  ): Promise<Project>;

  fetchPac(
    id: string
  ): Promise<PacRecord[]>;

  fetchObservations(
    id: string
  ): Promise<Observation[]>;
}
```

---

# Módulo 2
# Gestión de Proyectos

Debe permitir:

- CRUD lógico local
- Etiquetado
- Favoritos
- Proyectos críticos
- Seguimiento institucional

Campos mínimos:

- Expediente
- Nombre
- Titular
- Región
- Comuna
- Estado
- Tipo
- PAC activas
- Fecha actualización

---

# Esquema TOML Proyecto

```toml
[project]

id = "2165225291"

name = "Parque Solar Alicanto"

short_name = "Alicanto"

workflow = "DIA"

status = "En Evaluación"

created_at = "2026-01-15T10:00:00Z"

updated_at = "2026-01-18T16:00:00Z"

[owner]

name = "PSF Alicanto Solar SPA"

rut = ""

[location]

region = "Valparaíso"

commune = "Casablanca"

latitude = -33.217

longitude = -71.423

[pac]

enabled = true

records_total = 87

observations_total = 52

[tracking]

favorite = true

critical = false

followed = true
```

---

# Módulo 3
# Observaciones Ciudadanas

Debe capturar:

- Autor
- Fecha
- Documento
- Categoría
- Texto
- Resumen

Categorías:

- Agua
- Turismo
- Patrimonio
- Biodiversidad
- Energía
- Salud
- Paisaje
- Comunidad
- Riesgos
- Transporte
- Ruido
- Aire

---

## Esquema TOML

```toml
id = "OBS-001"

project_id = "2165225291"

sender = "Junta de Vecinos"

date = "2026-01-18"

category = "Turismo"

subcategory = "Paisaje"

importance = 0.81

sentiment = "neutral"

summary = """
Posible afectación
paisajística.
"""

content = """
Texto completo de observación.
"""

[keywords]

items = [
  "turismo",
  "paisaje",
  "impacto visual"
]
```

---

# Módulo 4
# Notas Institucionales

Permitir:

- Seguimiento
- Minutas
- Comentarios
- Compromisos
- Tareas

---

## Esquema TOML

```toml
id = "NOTE-001"

project_id = "2165225291"

author = "Carlos Campos"

priority = "high"

created_at = "2026-01-18"

updated_at = "2026-01-20"

content = """
Revisar implicancias
para planificación energética regional.
"""

tags = [
   "energia",
   "seremi",
   "valparaiso"
]

[status]

done = false

due_date = "2026-02-01"
```

---

# Módulo 5
# Timeline

Construir línea temporal unificada.

Eventos:

- Ingreso
- PAC
- Adenda
- ICSARA
- Observación
- RCA
- Archivado

---

## Esquema TOML

```toml
[[events]]

date = "2026-01-15"

type = "PAC_STARTED"

title = "Inicio PAC"

description = "PAC oficialmente abierta"

[[events]]

date = "2026-01-20"

type = "NEW_OBSERVATION"

title = "Nueva observación"

description = "Observación ciudadana ingresada"
```

---

# Módulo 6
# Event Bus

Todos los módulos deben comunicarse mediante eventos.

```typescript
export enum Events {

 PROJECT_CREATED,

 PROJECT_UPDATED,

 PAC_FETCHED,

 PAC_UPDATED,

 OBSERVATION_CREATED,

 OBSERVATION_CLASSIFIED,

 TIMELINE_UPDATED,

 REPORT_GENERATED,

 EXPORT_FINISHED
}
```

---

# Módulo 7
# Automatizaciones

Motor basado en reglas.

---

## Reglas TOML

```toml
[[rules]]

id = "R001"

name = "Proyecto Crítico"

condition = """
project.pac.observations_total > 50
"""

action = """
project.tracking.critical=true
"""

enabled = true


[[rules]]

id = "R002"

name = "Nueva observación"

condition = """
new_observation=true
"""

action = """
create_notification
"""

enabled = true
```

---

# Módulo 8
# Indexación y Búsqueda

Utilizar:

- FlexSearch
- Lunr

Indexar:

- proyectos
- PAC
- observaciones
- notas

---

## Consultas

```txt
estado:evaluacion

region:valparaiso

tipologia:solar

critical:true

turismo AND paisaje

energia AND hidrogeno
```

---

# Módulo 9
# Reportería

Generar automáticamente:

## Informes

- Ejecutivo
- Regional
- Proyecto
- PAC

---

## Exportaciones

- CSV
- XLSX
- Markdown
- HTML
- PDF

---

## Interface

```typescript
interface ReportService {

 generateCsv(
   projectId:string
 ): Promise<string>;

 generateXlsx(
   projectId:string
 ): Promise<string>;

 generateMarkdown(
   projectId:string
 ): Promise<string>;

 generateHtml(
   projectId:string
 ): Promise<string>;

 generatePdf(
   projectId:string
 ): Promise<string>;
}
```

---

# Módulo 10
# Dashboard Ejecutivo

KPIs

- PAC activas
- PAC cerradas
- Observaciones nuevas
- Proyectos críticos
- Proyectos energéticos
- Proyectos por región
- Participación ciudadana por mes

Visualizaciones:

- Timeline
- Treemap
- Heatmap regional
- Series temporales
- Ranking de proyectos

---

# Módulo 11
# Mapas

Implementar Leaflet.

Capas:

- Proyectos
- Comunas
- Regiones
- PAC

Funciones:

- Clustering
- Heatmap
- Filtros espaciales

---

# Módulo 12
# CQRS

## Commands

```txt
CreateProject
UpdateProject
CreateObservation
ClassifyObservation
CreateNote
GenerateReport
ExportCsv
ExportPdf
```

## Queries

```txt
GetProject
GetProjects
GetObservations
GetStatistics
SearchProjects
SearchObservations
GetTimeline
```

---

# Módulo 13
# IA Local (Roadmap)

Integración opcional Ollama.

Capacidades:

- Resumir observaciones.
- Detectar temas recurrentes.
- Clustering semántico.
- RAG local.
- Consultas sobre expedientes históricos.

Ejemplos:

"mostrar proyectos solares con observaciones sobre turismo"

"resumir PAC de proyectos energéticos en Valparaíso"

"identificar actores recurrentes"

"comparar dos expedientes"

---

# Entregables Esperados

## MVP

- Astro
- Electron
- TypeScript
- TOML
- Scraper SEIA
- Gestión PAC
- Notas
- Timeline
- CSV
- PDF
- Dashboard

## Versión 2.0

- IA local
- RAG
- Alertas
- Multiusuario local
- Sincronización OneDrive
- API REST
- API GraphQL
- SDK de plugins para SEA, SMA, SEC, CEN, MDSF y BNUP

## Resultado Final

Una plataforma de inteligencia territorial ambiental de escritorio orientada a organismos públicos, consultoras y analistas ambientales que permita monitorear, almacenar, analizar y explotar información de procesos PAC del SEIA de manera local, auditable y extensible.
``