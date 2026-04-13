// C:\Users\uriel\Downloads\enero 26\archivo2\tests\e2e\fixtures\env.ts
export const e2eEnv = {
  adminEmail: process.env.TEST_ADMIN_EMAIL ?? '',
  adminPassword: process.env.TEST_ADMIN_PASSWORD ?? '',
  contenedorAutoReceiveId: process.env.TEST_CONTENEDOR_AUTO_RECEIVE_ID ?? '',
  ordenActivaId: process.env.TEST_ORDEN_ACTIVA_ID ?? '',
  ordenTerminalId: process.env.TEST_ORDEN_TERMINAL_ID ?? '',
  ordenSinProductosId: process.env.TEST_ORDEN_SIN_PRODUCTOS_ID ?? '',
  ordenSinCajasId: process.env.TEST_ORDEN_SIN_CAJAS_ID ?? '',
  contenedorSinOrdenesId: process.env.TEST_CONTENEDOR_SIN_ORDENES_ID ?? '',
  contenedorSinPackingId: process.env.TEST_CONTENEDOR_SIN_PACKING_ID ?? '',
} as const

export function hasAuthCredentials() {
  return Boolean(e2eEnv.adminEmail && e2eEnv.adminPassword)
}
