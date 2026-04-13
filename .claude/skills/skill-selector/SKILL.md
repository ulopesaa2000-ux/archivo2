---
name: skill-selector
description: Analiza mensajes del usuario y selecciona automáticamente la skill más apropiada del sistema basado en el contexto del proyecto inv-tienda. Use esta skill cuando necesite determinar qué skill del sistema aplicar para una tarea específica.
---

# Skill Selector para inv-tienda

Esta skill analiza mensajes del usuario y selecciona automáticamente la skill más apropiada del sistema basándose en el contexto del proyecto definido en `.agents/AGENTS.md`.

## Cuándo usar esta skill

Use esta skill cuando:
- No esté seguro cuál skill del sistema aplicar para una tarea específica
- Necesite una recomendación basada en el contexto del proyecto inv-tienda
- Quiera automatizar la selección de skills para tareas recurrentes
- Esté explorando qué capacidades están disponibles en el proyecto

## Cómo usar

```
skill: "skill-selector", args: "su mensaje o solicitud aquí"
```

Ejemplos:
```
skill: "skill-selector", args: "Necesito optimizar mis consultas a la base de datos Postgres"
skill: "skill-selector", args: "Quiero mejorar el rendimiento de mis componentes React"
skill: "skill-selector", args: "Cómo implementar autenticación con Supabase"
```

## Proceso de selección

La skill funciona así:
1. **Lee su mensaje**: Analiza el texto de su solicitud
2. **Consulta el contexto del proyecto**: Revisa `.agents/AGENTS.md` para entender las reglas, stack y objetivos
3. **Evalúa las skills disponibles**: Examina todas las skills en `.agents/skills/`
4. **Selecciona la más apropiada**: Usa coincidencias de palabras clave y contexto del proyecto
5. **Proporciona recomendación**: Sugiere la skill específica y explica por qué

## Skills del sistema disponibles

Las skills que puede seleccionar incluyen:
- `supabase-postgres-best-practices`: Para optimización de Postgres y Supabase
- `vercel-react-best-practices`: Para optimización de React y Next.js
- `playwright-best-practices`: Para testing y automatización
- `accessibility`: Para mejoras de accesibilidad (WCAG)
- `seo`: Para optimización de motores de búsqueda
- Y muchas más relacionadas con frontend, backend, bases de datos, etc.

## Salida

Al invocar esta skill, recibirá:
1. Análisis de su solicitud
2. Lista de skills relevantes encontradas
3. Recomendación específica de skill a usar
4. Instrucciones sobre cómo invocar la skill recomendada
5. Actualización opcional de CLAUDE.md con la información de skills

## Ejemplo de uso en el flujo de trabajo

1. Usuario tiene una tarea pero no sabe qué skill usar
2. Invoca: `skill: "skill-selector", args: "Necesito crear un hook personalizado para manejo de estado global"`
3. La skill analiza y podría recomendar: `typescript-advanced-types` o `nodejs-best-practices`
4. Usuario luego invoca la skill recomendada: `skill: "typescript-advanced-types"`
5. La skill seleccionada proporciona la asistencia específica necesaria

## Integración con el proyecto

Esta skill respeta las reglas del proyecto inv-tienda:
- Sigue las reglas de negocio y código de AGENTS.md
- Recomienda skills que sean apropiadas para el stack (Next.js, Supabase, TypeScript, etc.)
- Ayuda a mantener consistencia en el uso de las mejores prácticas del proyecto