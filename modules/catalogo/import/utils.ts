// modules/catalogo/import/utils.ts

export function getCsvTemplate(): string {
  const headers = [
    'sku_base',
    'nombre',
    'descripcion',
    'composicion',
    'familia',
    'precio_ec',
    'marca_id',
    'genero_id',
    'tipo_prenda_id',
    'edad_id',
    'tela_ext_id',
    'tela_forro_id',
    'persona_id',
    'proveedor_id',
    'pz_en_caja',
    'activo',
    'destacado',
    'es_conjunto',
    'estado',
  ]
  return headers.join(',') + '\n'
}
