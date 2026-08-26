# scripts/README.md
# Directorio de Scripts del Proyecto (`scripts/`)

Este directorio contiene herramientas utilitarias, diagnósticos, pruebas, actualizaciones y respaldos organizados por ecosistema/módulo funcional.

---

## 📁 Estructura General

```
scripts/
├── backups/                 # [IGNORADO EN GIT] Respaldo de flujos, JSONs y volcados con API keys/datos sensibles
│   ├── backup_ocr_workflow_before_dynamic_plan.json
│   ├── backup_packing_workflow.json
│   └── current_ocr_workflow.json
│
├── n8n/                     # Scripts y utilidades relacionados a flujos de automatización n8n
│   ├── diagnostics/         # Inspección y análisis de errores en workflows n8n
│   │   ├── diagnose_ocr_error.js
│   │   ├── inspect_fn_ocr.js
│   │   └── inspect_n8n_wf.js
│   ├── tests/               # Pruebas de integración, resolución y simulación de flujos
│   │   ├── test_2phase_resolution.js
│   │   ├── test_complete_ocr_flow.js
│   │   ├── test_consistent_resolution.js
│   │   ├── test_full_dynamic_workflow.js
│   │   ├── test_full_ocr_simulation.js
│   │   └── test_parser.js
│   └── updates/             # Scripts para actualizar workflows directamente en la API de n8n
│       ├── update_n8n_ocr.js
│       └── update_n8n_packing.js
│
├── supabase/                # Scripts relacionados a la base de datos PostgreSQL en Supabase
│   ├── diagnostics/         # Inspección de stored procedures, roles y esquemas
│   │   ├── check_sp_promover.js
│   │   ├── cleanup_roles.js
│   │   ├── inspect_roles.js
│   │   ├── inspect_sp_promover.js
│   │   └── inspect_sp_signatures.js
│   ├── queries/             # Consultas de utilidad y exploración de datos
│   │   ├── query.js
│   │   └── query_parameters.js
│   ├── tests/               # Pruebas de stored procedures, pronósticos, navegación y stock
│   │   ├── test_forecast_query.js
│   │   ├── test_matrix_forecast.js
│   │   ├── test_matrix_forecast_complete.js
│   │   ├── test_nav_notas.js
│   │   ├── test_nav_verification.js
│   │   ├── test_pronostico_bodega.js
│   │   ├── test_raw_sql.js
│   │   ├── test_safe_promover.js
│   │   ├── test_sql_full_promotion.js
│   │   ├── test_sql_promover.js
│   │   ├── test_sql_promover_fixed.js
│   │   └── test_stock_pronostico_page.js
│   └── updates/             # Actualización de triggers o funciones remotas
│       └── update_trigger.js
│
└── system/                  # Utilidades del sistema Next.js / desarrollo
    ├── analyze_sku_patterns.js
    ├── clean.js             # Limpieza de caché y temporales
    └── generate_icons.js    # Generación de favicons e iconos PWA
```

---

## 🔒 Seguridad y Backups
La carpeta `scripts/backups/` se encuentra agregada a `.gitignore` para evitar que volcados JSON o respaldos con credenciales/API keys de workflows se suban al repositorio.

## 🚀 Ejecución

Para ejecutar cualquier script desde la raíz del proyecto:

```bash
# Ejemplo: Diagnóstico n8n
node scripts/n8n/diagnostics/diagnose_ocr_error.js

# Ejemplo: Test de pronóstico en Supabase
node scripts/supabase/tests/test_pronostico_bodega.js

# Ejemplo: Limpieza del sistema
node scripts/system/clean.js
```