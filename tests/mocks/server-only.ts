// tests/mocks/server-only.ts
/**
 * Stub de `server-only` para vitest.
 * Next lo provee en runtime, pero no existe como paquete resoluble fuera del
 * build de Next (los módulos de solo-servidor fallan al importarse en tests).
 */
export {}
