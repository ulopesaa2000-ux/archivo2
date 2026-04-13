# Guía para Actualizar Next.js en el Proyecto inv-tienda

## Estado Actual
- **Next.js**: 15.4.9 (según package.json)
- **React**: 19.2.1
- **React DOM**: 19.2.1
- **Versión más reciente disponible**: 16.2.3

## Pasos para Actualizar a Next.js 16.2.3

### 1. Preparación
```bash
# Asegúrate de tener un estado limpio en git
git status
git add .
git commit -m "Backup antes de actualizar Next.js"
```

### 2. Actualizar Dependencias Principales
```bash
# Actualizar Next.js, React y React DOM a sus últimas versiones
npm install next@latest react@latest react-dom@latest
```

Esto instalará:
- next@16.2.3
- react@19.2.1 (mantendrá la misma versión ya que es reciente)
- react-dom@19.2.1 (mantendrá la misma versión ya que es reciente)

### 3. Actualizar Dependencias de Desarrollo
```bash
# Actualizar @types/react y @types/react-dom
npm install @types/react@latest @types/react-dom@latest --save-dev

# Actualizar eslint-config-next (importante: esta versión está desactualizada)
npm install eslint-config-next@latest --save-dev
```

### 4. Verificar otras dependencias relacionadas
Revisa si necesitas actualizar:
- `@next/codemod` (si planeas usar codemods)
- Otras dependencias de Next.js específicas

### 5. Posibles Cambios Rompedores (Next.js 15 → 16)

Según la documentación oficial de Next.js, al actualizar de v15 a v16, revisa:

#### Cambios en el Enrutamiento y Parámetros
- En Next.js 15+, los parámetros de ruta en `generateStaticParams` y `generateMetadata` son asíncronos
- Verifica tus archivos en `app/` que usen estas funciones

#### Cambios en Configuración
- Revisa `next.config.ts` por cualquier configuración obsoleta
- La estructura de configuración puede haber cambiado

#### API de Solicitud
- Next.js 15 introdujo cambios en las APIs de solicitud asíncrona
- Si usas `cookies()`, `headers()`, etc., verifica que se usen correctamente

#### Tipo de Datos
- Verifica que tus tipos de TypeScript sean compatibles
- Actualiza `@types/react` y `@types/react-dom` como se indicó arriba

### 6. Ejecutar Codemods (Opcional pero Recomendado)
Next.js proporciona codemods para automatizar cambios rotundos:

```bash
# Instalar el codemod si no lo tienes
npm install -g @next/codemod

# Ejecutar codemods relevantes para la actualización de 15→16
# Revisa https://nextjs.org/docs/app/guides/upgrading/codemods para la lista completa

# Ejemplos comunes (ajusta según tu versión específica):
npx @next/codemod@latest next-async-request-api ./app
npx @next/codemod@latest next-request-geo-ip ./app
npx @next/codemod@latest next-dynamic-access-named-export ./app
```

### 7. Probar la Actualización
```bash
# Limpiar caché de Next.js (opcional pero recomendado)
npm run clean

# Intentar construir el proyecto
npm run build

# Si la construcción funciona, probar en desarrollo
npm run dev
```

### 8. Verificación Post-Actualización
Después de actualizar, verifica:
- [ ] Todas las páginas cargan correctamente
- [ ] Las funciones de datos (getStaticProps, getServerSideProps, etc.) funcionan
- [ ] Las rutas dinámicas funcionan
- [ ] Los componentes de shadcn/ui siguen funcionando
- [ ] Las integraciones con Supabase siguen funcionando
- [ ] Los tests de e2e (si los tienes) pasan
- [ ] Linting no muestra errores nuevos

### 9. Solución de Problemas Comunes

#### Error: "Invalid prop type"
- Puede deberse a incompatibilidad entre versiones de React y sus tipos
- Solución: Asegúrate de que `@types/react` y `@types/react-dom` coincidan con tu versión de React

#### Error: "Module not found: next/xxx"
- Algunos módulos internos de Next.js pueden haber cambiado de nombre o ubicación
- Solución: Revisa las importaciones y actualízalas según la guía de migración

#### Error en build relacionado con CSS
- Puede ser por cambios en cómo Next.js maneja CSS o PostCSS
- Solución: Verifica tu configuración de Tailwind CSS y PostCSS

#### Problemas de compatibilidad con Supabase
- Después de actualizar Next.js, verifica que las funciones de Supabase SSR continúen funcionando
- Si experimentas problemas con `createServerComponentClient` o `createRouteHandlerClient`, revisa la documentación de Supabase para Next.js
- Las versiones actuales en tu proyecto:
  - `@supabase/ssr`: ^0.9.0
  - `@supabase/supabase-js`: ^2.100.0
- Estas versiones son generalmente compatibles con Next.js 16, pero se recomienda:
  1. Revisar la documentación oficial de Supabase para Next.js: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
  2. Considerar actualizar a las últimas versiones si hay problemas:
     ```bash
     npm install @supabase/ssr@latest @supabase/supabase-js@latest
     ```
  3. Probar exhaustivamente las rutas que usan Supabase después de la actualización

### 10. Actualización del package.json Esperada
Después de la actualización, tu sección de dependencias debería verse aproximadamente así:

```json
"dependencies": {
  "next": "16.2.3",
  "react": "19.2.1",
  "react-dom": "19.2.1",
  // ... resto de dependencias sin cambios significativos
},
"devDependencies": {
  "@types/react": "latest",
  "@types/react-dom": "latest",
  "eslint-config-next": "latest",
  // ... resto de devDependencies
}
```

## Referencias Oficiales
- Guía de actualización de Next.js: https://nextjs.org/docs/app/guides/upgrading
- Codemods para Next.js: https://nextjs.org/docs/app/guides/upgrading/codemods
- Guía específica para v16: https://nextjs.org/docs/app/guides/upgrading/version-16
- Política de versiones de Next.js: https://nextjs.org/docs/app/building-your-application/upgrading

## Notas Especiales para el Proyecto inv-tienda
Dado que este proyecto usa:
- Supabase (verifica que `@supabase/ssr` y `@supabase/supabase-js` sean compatibles)
- shadcn/ui (verifica que siga funcionando con las nuevas versiones)
- TypeScript (asegúrate de que los tipos estén actualizados)
- Playwright para testing (debería seguir funcionando, pero verifica después de la actualización)

Se recomienda hacer esta actualización en una rama separada y probar exhaustivamente antes de fusionarla a main.