# Tests

Este directorio contiene todos los archivos de pruebas del proyecto.

## Estructura

- `e2e/` - Pruebas end-to-end (Playwright)
  - `test_query.mts` - Consulta de prueba
  - `test2.mts` - Prueba 2
  - `test3.mts` - Prueba 3
  - `test4.mts` - Prueba 4
  - `test5.mts` - Prueba 5
  - `test-auth-query.js` - Prueba de autenticación
  - `test-login.js` - Prueba de login

- `unit/` - Pruebas unitarias
  - `test-env.ts` - Prueba de entorno
  - `test-info.js` - Prueba de información

- `integration/` - Pruebas de integración
  - `test-query.js` - Prueba de consulta integrada

## Ejecutar pruebas

```bash
# E2E tests
npm run test:e2e

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration
```

## Notas

Las pruebas están organizadas por tipo y nivel de abstracción. Todas las pruebas deben ser ejecutadas antes de cualquier despliegue.