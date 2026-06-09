// modules/catalogo/actions.ts
// Barrel de re-exportaciones — mantiene la API pública intacta para todos los consumidores.
// Los módulos reales viven en modules/catalogo/actions/*.ts
'use server'

export type { ActionResult } from './actions/_shared'

// Core CRUD de productos
export {
  checkSkuExistsAction,
  createProductAction,
  updateProductAction,
  deactivateProductAction,
  cambiarEstadoProductoAction,
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

// Imágenes (Storage + producto_imagenes)
export {
  uploadImagenAction,
  updateImagenAction,
  setPrincipalImagenAction,
  deleteImagenAction,
} from './actions/imagenes'

// Familias
export {
  moverProductosDeFamiliaAction,
  renombrarFamiliaAction,
} from './actions/familias'
