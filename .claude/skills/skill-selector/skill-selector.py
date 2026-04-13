#!/usr/bin/env python3
"""
Skill Selector para inv-tienda
Lee las skills disponibles en .agents/skills/ y ayuda a seleccionar la más apropiada
"""

import os
import re
from pathlib import Path

def read_skill_file(skill_path):
    """Lee un archivo SKILL.md y extrae información clave"""
    try:
        with open(skill_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extraer metadata básica
        name_match = re.search(r'^name:\s*(.+)$', content, re.MULTILINE)
        desc_match = re.search(r'^description:\s*(.+)$', content, re.MULTILINE)

        name = name_match.group(1).strip() if name_match else "Unknown"
        description = desc_match.group(1).strip() if desc_match else "No description"

        # Extraer cuándo aplicar (sección When to Apply)
        when_to_apply = ""
        when_match = re.search(r'## When to Apply\s*\n(.*?)(?:\n##|\Z)', content, re.DOTALL | re.IGNORECASE)
        if when_match:
            when_to_apply = when_match.group(1).strip()

        return {
            'name': name,
            'description': description,
            'when_to_apply': when_to_apply,
            'path': str(skill_path),
            'content_preview': content[:500] + "..." if len(content) > 500 else content
        }
    except Exception as e:
        return {
            'name': 'Error',
            'description': f'Error reading file: {str(e)}',
            'when_to_apply': '',
            'path': str(skill_path),
            'content_preview': ''
        }

def scan_available_skills():
    """Escanea el directorio .agents/skills/ para encontrar todas las skills disponibles"""
    skills_dir = Path('.agents/skills')
    if not skills_dir.exists():
        return []

    skills = []
    for skill_dir in skills_dir.iterdir():
        if skill_dir.is_dir():
            skill_file = skill_dir / 'SKILL.md'
            if skill_file.exists():
                skill_info = read_skill_file(skill_file)
                skills.append(skill_info)

    return sorted(skills, key=lambda x: x['name'])

def analyze_request_for_skill(request, skills):
    """Analiza la solicitud del usuario y sugiere la skill más apropiada"""
    request_lower = request.lower()

    # Palabras clave para cada skill (basado en nombres y descripciones comunes)
    skill_keywords = {
        'supabase-postgres-best-practices': ['postgres', 'postgresql', 'supabase', 'sql', 'query', 'database', 'db', 'rls', 'row level security'],
        'vercel-react-best-practices': ['react', 'vercel', 'next.js', 'nextjs', 'frontend', 'ui', 'component'],
        'playwright-best-practices': ['test', 'testing', 'playwright', 'e2e', 'browser', 'automation'],
        'accessibility': ['accessibility', 'a11y', 'accessible', 'wcga', 'screen reader'],
        'seo': ['seo', 'search engine', 'optimization', 'meta', 'google', 'search'],
        'frontend-design': ['design', 'ui', 'ux', 'frontend', 'css', 'styling', 'layout'],
        'typescript-advanced-types': ['typescript', 'types', 'interface', 'type', 'ts'],
        'tailwind-v4-shadcn': ['tailwind', 'shadcn', 'css', 'styling', 'ui'],
        'next-best-practices': ['next.js', 'nextjs', 'next', 'ssr', 'ssg', 'app router'],
        'next-cache-components': ['cache', 'caching', 'next.js', 'nextjs', 'performance'],
        'next-upgrade': ['upgrade', 'migration', 'next.js', 'nextjs', 'version'],
        'shadcn': ['shadcn', 'ui', 'component', 'design'],
        'tailwind-css-patterns': ['tailwind', 'css', 'styling', 'utility'],
        'nodejs-backend-patterns': ['nodejs', 'node.js', 'backend', 'server', 'api'],
        'nodejs-best-practices': ['nodejs', 'node.js', 'backend', 'best practices']
    }

    # Calcular puntuación para cada skill
    skill_scores = {}
    for skill in skills:
        skill_name = skill['name']
        score = 0

        # Verificar coincidencias en palabras clave
        if skill_name in skill_keywords:
            for keyword in skill_keywords[skill_name]:
                if keyword in request_lower:
                    score += 1

        # Verificar coincidencias en descripción y cuándo aplicar
        text_to_search = (skill['description'] + ' ' + skill['when_to_apply']).lower()
        for word in request_lower.split():
            if len(word) > 3 and word in text_to_search:  # Solo palabras significativas
                score += 1

        skill_scores[skill_name] = score

    # Devolver la skill con la puntuación más alta (mínimo 1 para considerar relevante)
    if skill_scores:
        best_skill = max(skill_scores, key=skill_scores.get)
        if skill_scores[best_skill] > 0:
            return best_skill, skill_scores[best_skill]

    return None, 0

def update_claude_md(skills, recommended_skill=None):
    """Actualiza el archivo CLAUDE.md con información sobre las skills disponibles"""
    claude_path = Path('CLAUDE.md')

    # Leer contenido existente si existe
    existing_content = ""
    if claude_path.exists():
        with open(claude_path, 'r', encoding='utf-8') as f:
            existing_content = f.read()

    # Generar sección de skills
    skills_section = "\n## Skills Disponibles\n\n"
    skills_section += "Esta sección lista las skills del sistema disponibles en `.agents/skills/` que pueden ser invocadas para tareas específicas.\n\n"

    for skill in skills:
        skills_section += f"### {skill['name']}\n"
        skills_section += f"**Descripción**: {skill['description']}\n"
        if skill['when_to_apply']:
            skills_section += f"**Cuándo aplicar**: {skill['when_to_apply'][:200]}...\n" if len(skill['when_to_apply']) > 200 else f"**Cuándo aplicar**: {skill['when_to_apply']}\n"
        skills_section += f"**Archivo**: `{skill['path']}`\n\n"

    if recommended_skill:
        skills_section += f"### Recomendación para la solicitud actual\n\n"
        skills_section += f"**Skill recomendada**: {recommended_skill}\n"
        skills_section += f"Para usar esta skill, ejecute: `skill: \"{recommended_skill}\"`\n\n"

    # Determinar dónde insertar la sección (al final o reemplazando una existente)
    if "## Skills Disponibles" in existing_content:
        # Reemplazar sección existente
        parts = existing_content.split("## Skills Disponibles")
        # Mantener todo antes de la sección y agregar la nueva
        new_content = parts[0] + skills_section
        # Si hay más contenido después, preservarlo (pero evitamos duplicar secciones similares)
        if len(parts) > 1:
            # Buscar el próximo encabezado de nivel 2 o fin del documento
            remaining = parts[1]
            next_header_match = re.search(r'\n## [^\n]', remaining)
            if next_header_match:
                # Mantener el contenido desde el próximo encabezado de nivel 2
                new_content += remaining[next_header_match.start():]
    else:
        # Agregar al final
        new_content = existing_content.rstrip() + "\n" + skills_section

    # Escribir el archivo actualizado
    with open(claude_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return str(claude_path)

def main():
    """Función principal"""
    print("Escaneando skills disponibles en .agents/skills/...")

    skills = scan_available_skills()
    print(f"Encontradas {len(skills)} skills:")
    for skill in skills:
        print(f"  - {skill['name']}")

    # Para esta primera ejecución, usaremos una solicitud de ejemplo
    # En un uso real, esto vendría del argumento o input del usuario
    example_request = "Necesito optimizar mis consultas a Postgres y mejorar el rendimiento de la base de datos"
    print(f"\nAnalizando solicitud de ejemplo: \"{example_request}\"")

    recommended_skill, score = analyze_request_for_skill(example_request, skills)

    if recommended_skill:
        print(f"Skill recomendada: {recommended_skill} (puntuacion: {score})")
    else:
        print("No se encontro una skill claramente apropiada para la solicitud")
        # Si no hay recomendacion clara, sugerir la primera como ejemplo
        if skills:
            recommended_skill = skills[0]['name']
            print(f"Usando la primera skill disponible como ejemplo: {recommended_skill}")

    print("\nActualizando CLAUDE.md con información de skills...")
    claude_path = update_claude_md(skills, recommended_skill)
    print(f"CLAUDE.md actualizado en: {claude_path}")

    print("\nProximos pasos:")
    print("  1. Revise el archivo CLAUDE.md para ver la sección de skills disponibles")
    print("  2. Para usar una skill específica, invoque: skill: \"nombre-de-la-skill\"")
    print("  3. Ejemplo: skill: \"supabase-postgres-best-practices\"")

    return 0

if __name__ == "__main__":
    exit(main())