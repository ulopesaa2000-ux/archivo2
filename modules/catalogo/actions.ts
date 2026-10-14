// modules/catalogo/actions.ts
// Barrel de re-exportaciones — mantiene la API pública intacta para todos los consumidores.
// Los módulos reales viven en modules/catalogo/actions/*.ts

export type { ActionResult } from './actions/_shared'

// Core CRUD de productos
export {
  checkSkuExistsAction,
  createProductAction,
  updateProductAction,
  deactivateProductAction,
  cambiarEstadoProductoAction,
  toggleDestacadoAction,
  bulkUpdateProductsAction,
  bulkDeactivateProductsAction,
} from './actions/product'

// Productos Web (ecommerce)
export {
  updateProductoWebAction,
  createProductoWebAction,
} from './actions/web'

// Acabados, Tags, Complementos, Conjunto
export {
  saveAcabadoAction,
  deleteAcabadoAction,
  saveTagAction,
  deleteTagAction,
  saveComplementoAction,
  deleteComplementoAction,
  saveConjuntoItemAction,
  deleteConjuntoItemAction,
} from './actions/detalle'

// Variantes, Colores, Tallas, Medidas
export {
  saveVarianteAction,
  deleteVarianteAction,
  deleteVariantesBatchAction,
  createColorAction,
  createTallaAction,
  saveMedidasAction,
} from './actions/variantes'

// HEX para colores nuevos (biblioteca -> API gratuita -> negro)
export { resolverHexColorAction } from './actions/hex'
export type { HexSugerido, HexFuente } from './actions/hex'

// Imágenes (Storage + producto_imagenes)
export {
  uploadImagenAction,
  updateImagenAction,
  setPrincipalImagenAction,
  deleteImagenAction,
  cambiarUsoImagenAction,
} from './actions/imagenes'

// Familias
export {
  moverProductosDeFamiliaAction,
  renombrarFamiliaAction,
  fetchAtributosDescripcionAction,
  updateDescripcionRapidaAction,
} from './actions/familias'
