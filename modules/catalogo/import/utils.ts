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
    'cliente_b2b_id',
    'pz_en_caja',
    'activo',
    'destacado',
    'es_conjunto',
    'estado',
  ]

  const exampleRow = [
    'SKU-EJEMPLO-001',
    'Playera Básica Cuello Redondo',
    'Playera de algodón peinado corte regular suave al tacto',
    '100% Algodón',
    'F000-000C',
    '199.00',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '1',
    'true',
    'false',
    'false',
    'borrador',
  ]

  return `${headers.join(',')}\n${exampleRow.join(',')}\n`
}
