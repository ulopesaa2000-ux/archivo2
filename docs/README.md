# docs/README.md
# Directorio de Documentación y Muestras del Proyecto (`docs/`)

Este directorio centraliza la documentación arquitectónica, especificaciones de diseño, material de presentaciones y archivos reales de prueba.

---

## 📁 Estructura General

```
docs/
├── architecture/            # 📐 Arquitectura del sistema, especificaciones y esquema de BD
│   ├── DESIGN.md            # Especificaciones de diseño UI/UX y componentes
│   ├── mejoras-implementadas.md # Bitácora de mejoras aplicadas
│   ├── db_dump.txt          # Volcado de referencia del esquema de base de datos
│   ├── replicated-sniffing-quill.md # Documentación técnica complementaria
│   ├── temp_form.json       # Esquema y estructura JSON de formularios
│   └── queries-schema/      # Volcados CSV de funciones, triggers y vistas
│       ├── funciones_y_triggers_27_abril.csv
│       ├── vistas_27_abril.csv
│       └── QUERY_FUNCIONES_TRIGGERS_Y_VISTAS.csv
│
├── presentations/           # 📊 Presentaciones ejecutivas y material de divulgación
│   ├── presentacion.pptx    # Diapositivas en PowerPoint
│   ├── presentacion.pdf     # Diapositivas en formato PDF
│   ├── presentacion.html    # Diapositivas interactivas en HTML
│   ├── presentacion.md      # Resumen en Markdown
│   ├── presentacion-ejecutiva.md # Resumen ejecutivo en Markdown
│   └── code.html            # Recursos visuales de código
│
├── samples/                 # 📦 Muestras reales y archivos de prueba
│   ├── packing-lists/       # Excels reales de Packing Lists de proveedores/contenedores
│   │   ├── 6-2026bo TMB-702 703 704 packing list CORRECT.xls
│   │   ├── 7MOTI-26 FFAU1647859 PACKING LIST MOVAMODA.xlsx
│   │   ├── PACKING LIST MOVAMODA moti 26-03.xlsx
│   │   ├── Packing list-260320.xlsx
│   │   └── TABLA HAMU1553617.xlsx
│   ├── inventory/           # Excels de inventarios consolidados
│   │   └── INV GLOBAL JULIO 2026.xlsx
│   └── captures/            # Capturas de notas físicas, OCR y muestras JSON
│       ├── screen.png
│       └── extracted_bonnie_rows.json
│
└── development/             # 🛠️ Logs de compilación y notas técnicas históricas
    ├── ts-errors.txt
    ├── errors_utf8.txt
    └── README.md
```

---

## 📌 Guía de Uso

- **Para probar importaciones B2B / Packing Lists:** Usar los archivos en `docs/samples/packing-lists/`.
- **Para consultar el esquema y triggers de PostgreSQL:** Revisar `docs/architecture/queries-schema/` y `docs/architecture/db_dump.txt`.
- **Para presentaciones o resúmenes de negocio:** Revisar `docs/presentations/`.
