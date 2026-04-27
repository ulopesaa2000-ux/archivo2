// C:\Users\uriel\Downloads\enero 26\archivo2\tests\unit\config\types.test.ts
import { describe, expect, it } from 'vitest'
import { MODULOS_ORDEN, buildPermisosCompletos, type PermisoModulo } from '@/modules/config/types'

describe('modules/config/types', () => {
  it('buildPermisosCompletos rellena todos los modulos faltantes en false', () => {
    const permisosBase: PermisoModulo[] = [
      {
        modulo: 'config_usuarios',
        puede_leer: true,
        puede_crear: false,
        puede_editar: false,
        puede_eliminar: false,
      },
    ]

    const result = buildPermisosCompletos(permisosBase)

    expect(Object.keys(result)).toHaveLength(MODULOS_ORDEN.length)
    expect(result.config_usuarios.puede_leer).toBe(true)
    expect(result.config_roles.puede_leer).toBe(false)
    expect(result.catalogo_productos.puede_crear).toBe(false)
  })

  it('buildPermisosCompletos preserva los permisos explícitos recibidos', () => {
    const permisosBase: PermisoModulo[] = [
      {
        modulo: 'inventario_notas',
        puede_leer: true,
        puede_crear: true,
        puede_editar: true,
        puede_eliminar: false,
      },
    ]

    const result = buildPermisosCompletos(permisosBase)

    expect(result.inventario_notas).toEqual(permisosBase[0])
  })
})
