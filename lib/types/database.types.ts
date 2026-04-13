export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  "inv-tienda": {
    Tables: {
      acabado_producto: {
        Row: {
          created_at: string | null
          detalle_acabado_id: number | null
          id: number
          localizacion_id: number | null
          patron_acabado_id: number | null
          producto_id: number | null
          tipo_acabado_id: number | null
        }
        Insert: {
          created_at?: string | null
          detalle_acabado_id?: number | null
          id?: number
          localizacion_id?: number | null
          patron_acabado_id?: number | null
          producto_id?: number | null
          tipo_acabado_id?: number | null
        }
        Update: {
          created_at?: string | null
          detalle_acabado_id?: number | null
          id?: number
          localizacion_id?: number | null
          patron_acabado_id?: number | null
          producto_id?: number | null
          tipo_acabado_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acabado_producto_detalle_acabado_id_fkey"
            columns: ["detalle_acabado_id"]
            referencedRelation: "detalle_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_localizacion_id_fkey"
            columns: ["localizacion_id"]
            referencedRelation: "localizacion_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_patron_acabado_id_fkey"
            columns: ["patron_acabado_id"]
            referencedRelation: "patron_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_tipo_acabado_id_fkey"
            columns: ["tipo_acabado_id"]
            referencedRelation: "tipo_acabado"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_inventario: {
        Row: {
          accion: string
          bodega_id: number
          caja_id: number | null
          cajas_anterior: number | null
          cajas_nuevo: number | null
          fecha_auditoria: string | null
          id: number
          nota_id: number | null
          piezas_anterior: number | null
          piezas_nuevo: number | null
          producto_id: number
          usuario_id: number
        }
        Insert: {
          accion: string
          bodega_id: number
          caja_id?: number | null
          cajas_anterior?: number | null
          cajas_nuevo?: number | null
          fecha_auditoria?: string | null
          id?: number
          nota_id?: number | null
          piezas_anterior?: number | null
          piezas_nuevo?: number | null
          producto_id: number
          usuario_id: number
        }
        Update: {
          accion?: string
          bodega_id?: number
          caja_id?: number | null
          cajas_anterior?: number | null
          cajas_nuevo?: number | null
          fecha_auditoria?: string | null
          id?: number
          nota_id?: number | null
          piezas_anterior?: number | null
          piezas_nuevo?: number | null
          producto_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_inventario_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "auditoria_inventario_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "auditoria_inventario_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_nota_id_fkey"
            columns: ["nota_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_inventario_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      bodegas: {
        Row: {
          activa: boolean | null
          ciudad: string | null
          codigo: string
          created_at: string | null
          direccion: string | null
          es_virtual: boolean | null
          id: number
          nombre: string
          telefono: string | null
        }
        Insert: {
          activa?: boolean | null
          ciudad?: string | null
          codigo: string
          created_at?: string | null
          direccion?: string | null
          es_virtual?: boolean | null
          id?: number
          nombre: string
          telefono?: string | null
        }
        Update: {
          activa?: boolean | null
          ciudad?: string | null
          codigo?: string
          created_at?: string | null
          direccion?: string | null
          es_virtual?: boolean | null
          id?: number
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      caja_detalles: {
        Row: {
          caja_id: number
          cantidad: number
          color_id: number | null
          created_at: string | null
          id: number
          talla_id: number | null
          variante_id: number | null
        }
        Insert: {
          caja_id: number
          cantidad: number
          color_id?: number | null
          created_at?: string | null
          id?: number
          talla_id?: number | null
          variante_id?: number | null
        }
        Update: {
          caja_id?: number
          cantidad?: number
          color_id?: number | null
          created_at?: string | null
          id?: number
          talla_id?: number | null
          variante_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caja_detalles_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_color_id_fkey"
            columns: ["color_id"]
            referencedRelation: "cat_colores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_talla_id_fkey"
            columns: ["talla_id"]
            referencedRelation: "cat_tallas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "caja_detalles_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "caja_detalles_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_variantes_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_detalles_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas_producto: {
        Row: {
          activo: boolean | null
          alto_cm: number | null
          ancho_cm: number | null
          cbm: number | null
          codigo_caja: string
          colores: string | null
          costo_total_caja: number | null
          created_at: string | null
          id: number
          largo_cm: number | null
          nombre_pack: string | null
          peso_bruto_kg: number | null
          piezas_por_caja: number | null
          producto_id: number | null
          proveedor_id: number | null
          tallas: string | null
        }
        Insert: {
          activo?: boolean | null
          alto_cm?: number | null
          ancho_cm?: number | null
          cbm?: number | null
          codigo_caja: string
          colores?: string | null
          costo_total_caja?: number | null
          created_at?: string | null
          id?: number
          largo_cm?: number | null
          nombre_pack?: string | null
          peso_bruto_kg?: number | null
          piezas_por_caja?: number | null
          producto_id?: number | null
          proveedor_id?: number | null
          tallas?: string | null
        }
        Update: {
          activo?: boolean | null
          alto_cm?: number | null
          ancho_cm?: number | null
          cbm?: number | null
          codigo_caja?: string
          colores?: string | null
          costo_total_caja?: number | null
          created_at?: string | null
          id?: number
          largo_cm?: number | null
          nombre_pack?: string | null
          peso_bruto_kg?: number | null
          piezas_por_caja?: number | null
          producto_id?: number | null
          proveedor_id?: number | null
          tallas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_proveedor_id_fkey"
            columns: ["proveedor_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      carrito_items: {
        Row: {
          cantidad: number
          carrito_id: number
          created_at: string | null
          id: number
          precio_unitario: number
          variante_id: number
        }
        Insert: {
          cantidad?: number
          carrito_id: number
          created_at?: string | null
          id?: number
          precio_unitario: number
          variante_id: number
        }
        Update: {
          cantidad?: number
          carrito_id?: number
          created_at?: string | null
          id?: number
          precio_unitario?: number
          variante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "carrito_items_carrito_id_fkey"
            columns: ["carrito_id"]
            referencedRelation: "carritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrito_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "carrito_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrito_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "carrito_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_variantes_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrito_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      carritos: {
        Row: {
          created_at: string | null
          id: number
          session_id: string | null
          updated_at: string | null
          usuario_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          session_id?: string | null
          updated_at?: string | null
          usuario_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          session_id?: string | null
          updated_at?: string | null
          usuario_id?: number | null
        }
        Relationships: []
      }
      cat_colores: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          hex_code: string | null
          id: number
          nombre: string
          nombre_intern: string | null
          orden_display: number
          tipo_color: string
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          hex_code?: string | null
          id?: number
          nombre: string
          nombre_intern?: string | null
          orden_display: number
          tipo_color: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          hex_code?: string | null
          id?: number
          nombre?: string
          nombre_intern?: string | null
          orden_display?: number
          tipo_color?: string
        }
        Relationships: []
      }
      cat_edades: {
        Row: {
          created_at: string | null
          edad_talla: string | null
          id: number
          orden: number | null
          rango: string
        }
        Insert: {
          created_at?: string | null
          edad_talla?: string | null
          id?: number
          orden?: number | null
          rango: string
        }
        Update: {
          created_at?: string | null
          edad_talla?: string | null
          id?: number
          orden?: number | null
          rango?: string
        }
        Relationships: []
      }
      cat_estados_nota: {
        Row: {
          codigo: string
          color: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          codigo: string
          color?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          codigo?: string
          color?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      cat_generos: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          id: number
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nombre: string
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      cat_marcas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: number
          logo_url: string | null
          nombre: string
          ORDEN: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: number
          logo_url?: string | null
          nombre: string
          ORDEN?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: number
          logo_url?: string | null
          nombre?: string
          ORDEN?: number | null
        }
        Relationships: []
      }
      cat_tallas: {
        Row: {
          activo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          es_extra: boolean | null
          id: number
          nombre: string | null
          orden: number | null
          talla_us: string | null
          tamano_cab_mx: string | null
          tamano_dama_mx: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          es_extra?: boolean | null
          id?: number
          nombre?: string | null
          orden?: number | null
          talla_us?: string | null
          tamano_cab_mx?: string | null
          tamano_dama_mx?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          es_extra?: boolean | null
          id?: number
          nombre?: string | null
          orden?: number | null
          talla_us?: string | null
          tamano_cab_mx?: string | null
          tamano_dama_mx?: string | null
        }
        Relationships: []
      }
      cat_telas: {
        Row: {
          composicion: string | null
          created_at: string | null
          elasticidad_tela: string | null
          familia_tela: string | null
          id: number
          instrucciones_base_cuidado: string | null
          nombre: string
          orden: number | null
          ref_gral: string | null
          tag_atributo: string | null
          tela_comercial: string | null
          tela_descripcion: string | null
          tela_fibra: string | null
          tela_material: string | null
          temperatura: string | null
          transparencia: string | null
          vis_ind: boolean | null
        }
        Insert: {
          composicion?: string | null
          created_at?: string | null
          elasticidad_tela?: string | null
          familia_tela?: string | null
          id?: number
          instrucciones_base_cuidado?: string | null
          nombre: string
          orden?: number | null
          ref_gral?: string | null
          tag_atributo?: string | null
          tela_comercial?: string | null
          tela_descripcion?: string | null
          tela_fibra?: string | null
          tela_material?: string | null
          temperatura?: string | null
          transparencia?: string | null
          vis_ind?: boolean | null
        }
        Update: {
          composicion?: string | null
          created_at?: string | null
          elasticidad_tela?: string | null
          familia_tela?: string | null
          id?: number
          instrucciones_base_cuidado?: string | null
          nombre?: string
          orden?: number | null
          ref_gral?: string | null
          tag_atributo?: string | null
          tela_comercial?: string | null
          tela_descripcion?: string | null
          tela_fibra?: string | null
          tela_material?: string | null
          temperatura?: string | null
          transparencia?: string | null
          vis_ind?: boolean | null
        }
        Relationships: []
      }
      cat_tipo_prenda: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion_prenda: string | null
          id: number
          nombre: string
          orden: number | null
          sup_inf_compl: string | null
          vista_web: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_prenda?: string | null
          id?: number
          nombre: string
          orden?: number | null
          sup_inf_compl?: string | null
          vista_web?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_prenda?: string | null
          id?: number
          nombre?: string
          orden?: number | null
          sup_inf_compl?: string | null
          vista_web?: string | null
        }
        Relationships: []
      }
      cat_tipos_movimiento: {
        Row: {
          afecta_inventario: number
          codigo: string
          created_at: string | null
          id: number
          nombre: string
          requiere_destino: boolean | null
        }
        Insert: {
          afecta_inventario: number
          codigo: string
          created_at?: string | null
          id?: number
          nombre: string
          requiere_destino?: boolean | null
        }
        Update: {
          afecta_inventario?: number
          codigo?: string
          created_at?: string | null
          id?: number
          nombre?: string
          requiere_destino?: boolean | null
        }
        Relationships: []
      }
      complemento_producto: {
        Row: {
          corte_forma_id: number | null
          created_at: string | null
          descripcion_adicional: string | null
          id: number
          material_id: number | null
          parte_prenda_id: number | null
          producto_id: number | null
          tipo_comp_id: number | null
        }
        Insert: {
          corte_forma_id?: number | null
          created_at?: string | null
          descripcion_adicional?: string | null
          id?: number
          material_id?: number | null
          parte_prenda_id?: number | null
          producto_id?: number | null
          tipo_comp_id?: number | null
        }
        Update: {
          corte_forma_id?: number | null
          created_at?: string | null
          descripcion_adicional?: string | null
          id?: number
          material_id?: number | null
          parte_prenda_id?: number | null
          producto_id?: number | null
          tipo_comp_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "complemento_producto_corte_forma_id_fkey"
            columns: ["corte_forma_id"]
            referencedRelation: "corte_forma_comp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_material_id_fkey"
            columns: ["material_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_parte_prenda_id_fkey"
            columns: ["parte_prenda_id"]
            referencedRelation: "parte_prenda_comp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_tipo_comp_id_fkey"
            columns: ["tipo_comp_id"]
            referencedRelation: "tipo_comp"
            referencedColumns: ["id"]
          },
        ]
      }
      config_ecommerce: {
        Row: {
          campos_contacto_requeridos: Json | null
          created_at: string
          email_notificaciones: string | null
          id: number
          mensaje_precio_variable: string | null
          minimo_unidades: number | null
          modo_operacion: string
          mostrar_medidas_tabla: boolean | null
          mostrar_precios: boolean
          mostrar_sku: boolean | null
          mostrar_stock: boolean | null
          mostrar_variantes_agotadas: boolean | null
          multiplo_cajas: boolean
          notificar_whatsapp: boolean | null
          numero_whatsapp: string | null
          permitir_checkout_invitado: boolean | null
          requiere_aprobacion: boolean | null
          texto_boton_agregar: string | null
          texto_boton_finalizar: string | null
          tipo_orden_generada: string | null
          tipo_precio_visible: string | null
          tipo_venta: string
          titulo_seccion_carrito: string | null
          updated_at: string
          updated_by: number | null
        }
        Insert: {
          campos_contacto_requeridos?: Json | null
          created_at?: string
          email_notificaciones?: string | null
          id?: number
          mensaje_precio_variable?: string | null
          minimo_unidades?: number | null
          modo_operacion?: string
          mostrar_medidas_tabla?: boolean | null
          mostrar_precios?: boolean
          mostrar_sku?: boolean | null
          mostrar_stock?: boolean | null
          mostrar_variantes_agotadas?: boolean | null
          multiplo_cajas?: boolean
          notificar_whatsapp?: boolean | null
          numero_whatsapp?: string | null
          permitir_checkout_invitado?: boolean | null
          requiere_aprobacion?: boolean | null
          texto_boton_agregar?: string | null
          texto_boton_finalizar?: string | null
          tipo_orden_generada?: string | null
          tipo_precio_visible?: string | null
          tipo_venta?: string
          titulo_seccion_carrito?: string | null
          updated_at?: string
          updated_by?: number | null
        }
        Update: {
          campos_contacto_requeridos?: Json | null
          created_at?: string
          email_notificaciones?: string | null
          id?: number
          mensaje_precio_variable?: string | null
          minimo_unidades?: number | null
          modo_operacion?: string
          mostrar_medidas_tabla?: boolean | null
          mostrar_precios?: boolean
          mostrar_sku?: boolean | null
          mostrar_stock?: boolean | null
          mostrar_variantes_agotadas?: boolean | null
          multiplo_cajas?: boolean
          notificar_whatsapp?: boolean | null
          numero_whatsapp?: string | null
          permitir_checkout_invitado?: boolean | null
          requiere_aprobacion?: boolean | null
          texto_boton_agregar?: string | null
          texto_boton_finalizar?: string | null
          tipo_orden_generada?: string | null
          tipo_precio_visible?: string | null
          tipo_venta?: string
          titulo_seccion_carrito?: string | null
          updated_at?: string
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "config_ecommerce_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "appsheet_login"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "config_ecommerce_updated_by_fkey"
            columns: ["updated_by"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      contenedores: {
        Row: {
          buque: string | null
          cbm_total: number | null
          codigo_contenedor: string
          created_at: string | null
          estado: string | null
          fecha_eta: string | null
          fecha_etd: string | null
          id: number
          naviera: string | null
          numero_bl: string | null
          numero_contenedor: string | null
          orden: number | null
          peso_total_kg: number | null
          puerto_destino: string | null
          puerto_origen: string | null
          updated_at: string | null
        }
        Insert: {
          buque?: string | null
          cbm_total?: number | null
          codigo_contenedor: string
          created_at?: string | null
          estado?: string | null
          fecha_eta?: string | null
          fecha_etd?: string | null
          id?: number
          naviera?: string | null
          numero_bl?: string | null
          numero_contenedor?: string | null
          orden?: number | null
          peso_total_kg?: number | null
          puerto_destino?: string | null
          puerto_origen?: string | null
          updated_at?: string | null
        }
        Update: {
          buque?: string | null
          cbm_total?: number | null
          codigo_contenedor?: string
          created_at?: string | null
          estado?: string | null
          fecha_eta?: string | null
          fecha_etd?: string | null
          id?: number
          naviera?: string | null
          numero_bl?: string | null
          numero_contenedor?: string | null
          orden?: number | null
          peso_total_kg?: number | null
          puerto_destino?: string | null
          puerto_origen?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      corte_forma_comp: {
        Row: {
          corte_forma_en: string | null
          id: number
          nombre: string
        }
        Insert: {
          corte_forma_en?: string | null
          id?: number
          nombre: string
        }
        Update: {
          corte_forma_en?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      despachos: {
        Row: {
          bodega_destino_id: number | null
          bodega_origen_id: number | null
          chofer: string | null
          created_at: string | null
          estado: string | null
          fecha_programada: string | null
          fecha_real_salida: string | null
          fecha_recepcion: string | null
          id: number
          updated_at: string | null
          vehiculo_info: string | null
        }
        Insert: {
          bodega_destino_id?: number | null
          bodega_origen_id?: number | null
          chofer?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_programada?: string | null
          fecha_real_salida?: string | null
          fecha_recepcion?: string | null
          id?: number
          updated_at?: string | null
          vehiculo_info?: string | null
        }
        Update: {
          bodega_destino_id?: number | null
          bodega_origen_id?: number | null
          chofer?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_programada?: string | null
          fecha_real_salida?: string | null
          fecha_recepcion?: string | null
          id?: number
          updated_at?: string | null
          vehiculo_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "despachos_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "despachos_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "despachos_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "despachos_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
        ]
      }
      despachos_detalles: {
        Row: {
          caja_id: number | null
          cantidad_cajas_cargadas: number | null
          cantidad_cajas_recibidas: number | null
          cantidad_cajas_solicitadas: number
          created_at: string | null
          despacho_id: number | null
          id: number
          producto_id: number | null
        }
        Insert: {
          caja_id?: number | null
          cantidad_cajas_cargadas?: number | null
          cantidad_cajas_recibidas?: number | null
          cantidad_cajas_solicitadas: number
          created_at?: string | null
          despacho_id?: number | null
          id?: number
          producto_id?: number | null
        }
        Update: {
          caja_id?: number | null
          cantidad_cajas_cargadas?: number | null
          cantidad_cajas_recibidas?: number | null
          cantidad_cajas_solicitadas?: number
          created_at?: string | null
          despacho_id?: number | null
          id?: number
          producto_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "despachos_detalles_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_despacho_id_fkey"
            columns: ["despacho_id"]
            referencedRelation: "despachos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      detalle_acabado: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string
          tipo: string | null
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre: string
          tipo?: string | null
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string
          tipo?: string | null
        }
        Relationships: []
      }
      historial_estados_nota: {
        Row: {
          comentario: string | null
          estado_anterior_id: number | null
          estado_nuevo_id: number
          fecha_cambio: string | null
          id: number
          nota_id: number
          usuario_id: number
        }
        Insert: {
          comentario?: string | null
          estado_anterior_id?: number | null
          estado_nuevo_id: number
          fecha_cambio?: string | null
          id?: number
          nota_id: number
          usuario_id: number
        }
        Update: {
          comentario?: string | null
          estado_anterior_id?: number | null
          estado_nuevo_id?: number
          fecha_cambio?: string | null
          id?: number
          nota_id?: number
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "historial_estados_nota_estado_anterior_id_fkey"
            columns: ["estado_anterior_id"]
            referencedRelation: "cat_estados_nota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_nota_estado_nuevo_id_fkey"
            columns: ["estado_nuevo_id"]
            referencedRelation: "cat_estados_nota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estados_nota_nota_id_fkey"
            columns: ["nota_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_stock: {
        Row: {
          bodega_id: number
          caja_id: number | null
          cajas: number
          created_at: string | null
          created_by: number | null
          id: number
          piezas_sueltas: number
          producto_id: number
          ubicacion_pasillo: string | null
          updated_at: string | null
          updated_by: number | null
        }
        Insert: {
          bodega_id: number
          caja_id?: number | null
          cajas?: number
          created_at?: string | null
          created_by?: number | null
          id?: number
          piezas_sueltas?: number
          producto_id: number
          ubicacion_pasillo?: string | null
          updated_at?: string | null
          updated_by?: number | null
        }
        Update: {
          bodega_id?: number
          caja_id?: number | null
          cajas?: number
          created_at?: string | null
          created_by?: number | null
          id?: number
          piezas_sueltas?: number
          producto_id?: number
          ubicacion_pasillo?: string | null
          updated_at?: string | null
          updated_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      localizacion_acabado: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      medidas_producto: {
        Row: {
          created_at: string | null
          id: number
          medida_cm: number
          medida_ft: number
          producto_id: number
          punto_medida_id: number
          talla_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          medida_cm: number
          medida_ft: number
          producto_id: number
          punto_medida_id: number
          talla_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          medida_cm?: number
          medida_ft?: number
          producto_id?: number
          punto_medida_id?: number
          talla_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_punto_medida_id_fkey"
            columns: ["punto_medida_id"]
            referencedRelation: "puntos_medida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_talla_id_fkey"
            columns: ["talla_id"]
            referencedRelation: "cat_tallas"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_detalle_productos: {
        Row: {
          caja_id: number | null
          cajas: number
          created_at: string | null
          id: number
          nota_id: number
          piezas_sueltas: number | null
          producto_id: number | null
          variante_id: number | null
        }
        Insert: {
          caja_id?: number | null
          cajas: number
          created_at?: string | null
          id?: number
          nota_id: number
          piezas_sueltas?: number | null
          producto_id?: number | null
          variante_id?: number | null
        }
        Update: {
          caja_id?: number | null
          cajas?: number
          created_at?: string | null
          id?: number
          nota_id?: number
          piezas_sueltas?: number | null
          producto_id?: number | null
          variante_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_detalle_productos_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_nota_id_fkey"
            columns: ["nota_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_variantes_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_inventario: {
        Row: {
          bodega_destino_id: number | null
          bodega_origen_id: number
          created_at: string | null
          estado_id: number
          fecha_confirmacion: string | null
          fecha_nota: string | null
          id: number
          nota_original_id: number | null
          nota_referencia: string | null
          numero_nota: string
          observaciones: string | null
          tipo_movimiento_id: number
          total_cajas: number | null
          usuario_id: number
        }
        Insert: {
          bodega_destino_id?: number | null
          bodega_origen_id: number
          created_at?: string | null
          estado_id: number
          fecha_confirmacion?: string | null
          fecha_nota?: string | null
          id?: number
          nota_original_id?: number | null
          nota_referencia?: string | null
          numero_nota: string
          observaciones?: string | null
          tipo_movimiento_id: number
          total_cajas?: number | null
          usuario_id: number
        }
        Update: {
          bodega_destino_id?: number | null
          bodega_origen_id?: number
          created_at?: string | null
          estado_id?: number
          fecha_confirmacion?: string | null
          fecha_nota?: string | null
          id?: number
          nota_original_id?: number | null
          nota_referencia?: string | null
          numero_nota?: string
          observaciones?: string | null
          tipo_movimiento_id?: number
          total_cajas?: number | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_inventario_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_inventario_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "notas_inventario_bodega_destino_id_fkey"
            columns: ["bodega_destino_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "notas_inventario_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_inventario_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "notas_inventario_bodega_origen_id_fkey"
            columns: ["bodega_origen_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "notas_inventario_estado_id_fkey"
            columns: ["estado_id"]
            referencedRelation: "cat_estados_nota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_inventario_nota_original_id_fkey"
            columns: ["nota_original_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_inventario_tipo_movimiento_id_fkey"
            columns: ["tipo_movimiento_id"]
            referencedRelation: "cat_tipos_movimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_cajas: {
        Row: {
          caja_id: number
          cantidad_cajas: number
          created_at: string | null
          id: number
          orden_id: number
        }
        Insert: {
          caja_id: number
          cantidad_cajas?: number
          created_at?: string | null
          id?: number
          orden_id: number
        }
        Update: {
          caja_id?: number
          cantidad_cajas?: number
          created_at?: string | null
          id?: number
          orden_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_cajas_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "ordenes_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "v_contenedor_packing"
            referencedColumns: ["orden_id"]
          },
        ]
      }
      orden_items: {
        Row: {
          cantidad: number
          created_at: string | null
          id: number
          orden_id: number
          precio_unitario: number
          subtotal: number
          variante_id: number
        }
        Insert: {
          cantidad: number
          created_at?: string | null
          id?: number
          orden_id: number
          precio_unitario: number
          subtotal: number
          variante_id: number
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          id?: number
          orden_id?: number
          precio_unitario?: number
          subtotal?: number
          variante_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_items_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "ordenes_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "orden_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "orden_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_variantes_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_items_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_b2b: {
        Row: {
          cbm_orden: number | null
          cliente_b2b_id: number | null
          contenedor_id: number | null
          created_at: string | null
          estado: string | null
          fecha_orden: string | null
          folio_proveedor: string | null
          id: number
          moneda: string
          observaciones: string | null
          proveedor_id: number | null
          tipo_cambio: number | null
          total_cajas: number | null
          total_piezas: number | null
          updated_at: string | null
        }
        Insert: {
          cbm_orden?: number | null
          cliente_b2b_id?: number | null
          contenedor_id?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_orden?: string | null
          folio_proveedor?: string | null
          id?: number
          moneda?: string
          observaciones?: string | null
          proveedor_id?: number | null
          tipo_cambio?: number | null
          total_cajas?: number | null
          total_piezas?: number | null
          updated_at?: string | null
        }
        Update: {
          cbm_orden?: number | null
          cliente_b2b_id?: number | null
          contenedor_id?: number | null
          created_at?: string | null
          estado?: string | null
          fecha_orden?: string | null
          folio_proveedor?: string | null
          id?: number
          moneda?: string
          observaciones?: string | null
          proveedor_id?: number | null
          tipo_cambio?: number | null
          total_cajas?: number | null
          total_piezas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_b2b_cliente_b2b_id_fkey"
            columns: ["cliente_b2b_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_contenedor_id_fkey"
            columns: ["contenedor_id"]
            referencedRelation: "contenedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_contenedor_id_fkey"
            columns: ["contenedor_id"]
            referencedRelation: "v_contenedor_resumen"
            referencedColumns: ["contenedor_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_proveedor_id_fkey"
            columns: ["proveedor_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_b2b_detalles: {
        Row: {
          cajas_pedidas: number | null
          cantidad_aprobada: number | null
          cantidad_solicitada: number
          cbm_detalle: number | null
          created_at: string | null
          estado_producto: string | null
          id: number
          importe_total: number | null
          orden_id: number | null
          peso_bruto_kg: number | null
          piezas_pedidas: number | null
          precio_acordado: number | null
          precio_unitario: number | null
          precio_yuan: number | null
          producto_id: number | null
        }
        Insert: {
          cajas_pedidas?: number | null
          cantidad_aprobada?: number | null
          cantidad_solicitada: number
          cbm_detalle?: number | null
          created_at?: string | null
          estado_producto?: string | null
          id?: number
          importe_total?: number | null
          orden_id?: number | null
          peso_bruto_kg?: number | null
          piezas_pedidas?: number | null
          precio_acordado?: number | null
          precio_unitario?: number | null
          precio_yuan?: number | null
          producto_id?: number | null
        }
        Update: {
          cajas_pedidas?: number | null
          cantidad_aprobada?: number | null
          cantidad_solicitada?: number
          cbm_detalle?: number | null
          created_at?: string | null
          estado_producto?: string | null
          id?: number
          importe_total?: number | null
          orden_id?: number | null
          peso_bruto_kg?: number | null
          piezas_pedidas?: number | null
          precio_acordado?: number | null
          precio_unitario?: number | null
          precio_yuan?: number | null
          producto_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_b2b_detalles_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "ordenes_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "v_contenedor_packing"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          created_at: string | null
          estado: string | null
          fecha_orden: string | null
          folio_orden: string | null
          id: number
          persona_id: number | null
          proveedor_id: number | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          estado?: string | null
          fecha_orden?: string | null
          folio_orden?: string | null
          id?: number
          persona_id?: number | null
          proveedor_id?: number | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          estado?: string | null
          fecha_orden?: string | null
          folio_orden?: string | null
          id?: number
          persona_id?: number | null
          proveedor_id?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_persona_id_fkey"
            columns: ["persona_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_venta: {
        Row: {
          created_at: string | null
          direccion_envio: Json | null
          email_cliente: string
          envio: number | null
          estado: string
          fecha_entrega: string | null
          fecha_envio: string | null
          fecha_orden: string | null
          id: number
          impuestos: number | null
          metodo_pago: string | null
          nombre_cliente: string
          notas_cliente: string | null
          numero_orden: string
          numero_rastreo: string | null
          subtotal: number
          telefono_cliente: string | null
          total: number
          updated_at: string | null
          usuario_id: number | null
        }
        Insert: {
          created_at?: string | null
          direccion_envio?: Json | null
          email_cliente: string
          envio?: number | null
          estado?: string
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_orden?: string | null
          id?: number
          impuestos?: number | null
          metodo_pago?: string | null
          nombre_cliente: string
          notas_cliente?: string | null
          numero_orden: string
          numero_rastreo?: string | null
          subtotal: number
          telefono_cliente?: string | null
          total: number
          updated_at?: string | null
          usuario_id?: number | null
        }
        Update: {
          created_at?: string | null
          direccion_envio?: Json | null
          email_cliente?: string
          envio?: number | null
          estado?: string
          fecha_entrega?: string | null
          fecha_envio?: string | null
          fecha_orden?: string | null
          id?: number
          impuestos?: number | null
          metodo_pago?: string | null
          nombre_cliente?: string
          notas_cliente?: string | null
          numero_orden?: string
          numero_rastreo?: string | null
          subtotal?: number
          telefono_cliente?: string | null
          total?: number
          updated_at?: string | null
          usuario_id?: number | null
        }
        Relationships: []
      }
      parte_prenda_comp: {
        Row: {
          id: number
          nombre: string
          tipo: string | null
        }
        Insert: {
          id?: number
          nombre: string
          tipo?: string | null
        }
        Update: {
          id?: number
          nombre?: string
          tipo?: string | null
        }
        Relationships: []
      }
      patron_acabado: {
        Row: {
          estampado_patron: string
          id: number
          subcategoria: string | null
          tipo_acabado: string | null
        }
        Insert: {
          estampado_patron: string
          id?: number
          subcategoria?: string | null
          tipo_acabado?: string | null
        }
        Update: {
          estampado_patron?: string
          id?: number
          subcategoria?: string | null
          tipo_acabado?: string | null
        }
        Relationships: []
      }
      personas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          direccion: string | null
          email_contacto: string | null
          id: number
          identificacion_fiscal: string | null
          nombre_completo: string
          telefono_contacto: string | null
          tipo_entidad: string
          updated_at: string | null
          usuario_id: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email_contacto?: string | null
          id?: number
          identificacion_fiscal?: string | null
          nombre_completo: string
          telefono_contacto?: string | null
          tipo_entidad: string
          updated_at?: string | null
          usuario_id?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          direccion?: string | null
          email_contacto?: string | null
          id?: number
          identificacion_fiscal?: string | null
          nombre_completo?: string
          telefono_contacto?: string | null
          tipo_entidad?: string
          updated_at?: string | null
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "appsheet_login"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "personas_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      producto_conjunto: {
        Row: {
          cantidad: number
          created_at: string | null
          es_requerido: boolean | null
          id: number
          orden: number | null
          producto_hijo_id: number | null
          producto_padre_id: number | null
        }
        Insert: {
          cantidad?: number
          created_at?: string | null
          es_requerido?: boolean | null
          id?: number
          orden?: number | null
          producto_hijo_id?: number | null
          producto_padre_id?: number | null
        }
        Update: {
          cantidad?: number
          created_at?: string | null
          es_requerido?: boolean | null
          id?: number
          orden?: number | null
          producto_hijo_id?: number | null
          producto_padre_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      producto_imagenes: {
        Row: {
          alt_text: string | null
          created_at: string | null
          es_principal: boolean | null
          id: number
          orden: number | null
          origen_imagen: string
          producto_id: number
          url: string
          uso_imagen: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          es_principal?: boolean | null
          id?: number
          orden?: number | null
          origen_imagen?: string
          producto_id: number
          url: string
          uso_imagen?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          es_principal?: boolean | null
          id?: number
          orden?: number | null
          origen_imagen?: string
          producto_id?: number
          url?: string
          uso_imagen?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      producto_tags: {
        Row: {
          created_at: string | null
          id: number
          producto_id: number | null
          ref_tag_id: number | null
          tipo_tag_id: number | null
          valor_texto: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          producto_id?: number | null
          ref_tag_id?: number | null
          tipo_tag_id?: number | null
          valor_texto?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          producto_id?: number | null
          ref_tag_id?: number | null
          tipo_tag_id?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_ref_tag_id_fkey"
            columns: ["ref_tag_id"]
            referencedRelation: "ref_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_tipo_tag_id_fkey"
            columns: ["tipo_tag_id"]
            referencedRelation: "tipo_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean | null
          composicion: string | null
          created_at: string | null
          descripcion: string | null
          destacado: boolean | null
          edad_id: number | null
          es_conjunto: boolean | null
          estado: string | null
          familia: string | null
          genero_id: number | null
          id: number
          marca_id: number | null
          nombre: string | null
          persona_id: number | null
          precio_ec: number | null
          proveedor_id: number | null
          pz_en_caja: number | null
          sku_base: string
          tela_ext_id: number | null
          tela_forro_id: number | null
          tipo_prenda_id: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          composicion?: string | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          edad_id?: number | null
          es_conjunto?: boolean | null
          estado?: string | null
          familia?: string | null
          genero_id?: number | null
          id?: number
          marca_id?: number | null
          nombre?: string | null
          persona_id?: number | null
          precio_ec?: number | null
          proveedor_id?: number | null
          pz_en_caja?: number | null
          sku_base: string
          tela_ext_id?: number | null
          tela_forro_id?: number | null
          tipo_prenda_id?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          composicion?: string | null
          created_at?: string | null
          descripcion?: string | null
          destacado?: boolean | null
          edad_id?: number | null
          es_conjunto?: boolean | null
          estado?: string | null
          familia?: string | null
          genero_id?: number | null
          id?: number
          marca_id?: number | null
          nombre?: string | null
          persona_id?: number | null
          precio_ec?: number | null
          proveedor_id?: number | null
          pz_en_caja?: number | null
          sku_base?: string
          tela_ext_id?: number | null
          tela_forro_id?: number | null
          tipo_prenda_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_edad_id_fkey"
            columns: ["edad_id"]
            referencedRelation: "cat_edades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_genero_id_fkey"
            columns: ["genero_id"]
            referencedRelation: "cat_generos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            referencedRelation: "cat_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_persona_id_fkey"
            columns: ["persona_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tela_ext_id_fkey"
            columns: ["tela_ext_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tela_forro_id_fkey"
            columns: ["tela_forro_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tipo_prenda_id_fkey"
            columns: ["tipo_prenda_id"]
            referencedRelation: "cat_tipo_prenda"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_web: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion_seo: string | null
          destacado: boolean | null
          disponible_mayorista: boolean | null
          en_oferta: boolean | null
          fecha_publicacion: string | null
          id: number
          keywords: string | null
          modo_override: string | null
          nuevo: boolean | null
          orden_display: number | null
          precio_negociable: boolean | null
          precio_oferta: number | null
          precio_publico: number
          producto_id: number
          slug: string
          titulo_seo: string | null
          unidad_venta: string | null
          updated_at: string | null
          visitas: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_seo?: string | null
          destacado?: boolean | null
          disponible_mayorista?: boolean | null
          en_oferta?: boolean | null
          fecha_publicacion?: string | null
          id?: number
          keywords?: string | null
          modo_override?: string | null
          nuevo?: boolean | null
          orden_display?: number | null
          precio_negociable?: boolean | null
          precio_oferta?: number | null
          precio_publico: number
          producto_id: number
          slug: string
          titulo_seo?: string | null
          unidad_venta?: string | null
          updated_at?: string | null
          visitas?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion_seo?: string | null
          destacado?: boolean | null
          disponible_mayorista?: boolean | null
          en_oferta?: boolean | null
          fecha_publicacion?: string | null
          id?: number
          keywords?: string | null
          modo_override?: string | null
          nuevo?: boolean | null
          orden_display?: number | null
          precio_negociable?: boolean | null
          precio_oferta?: number | null
          precio_publico?: number
          producto_id?: number
          slug?: string
          titulo_seo?: string | null
          unidad_venta?: string | null
          updated_at?: string | null
          visitas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_web_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      puntos_medida: {
        Row: {
          clasificacion: string
          created_at: string | null
          id: number
          position: string | null
          punto_medida: string
          size_inch: string
        }
        Insert: {
          clasificacion: string
          created_at?: string | null
          id?: number
          position?: string | null
          punto_medida: string
          size_inch: string
        }
        Update: {
          clasificacion?: string
          created_at?: string | null
          id?: number
          position?: string | null
          punto_medida?: string
          size_inch?: string
        }
        Relationships: []
      }
      ref_tag: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          ingles_name: string | null
          nombre: string
          orden: number | null
          sup_inf: string | null
          tipo_tag_id: number
          updated_at: string | null
          valor_booleano: boolean | null
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          ingles_name?: string | null
          nombre: string
          orden?: number | null
          sup_inf?: string | null
          tipo_tag_id: number
          updated_at?: string | null
          valor_booleano?: boolean | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          ingles_name?: string | null
          nombre?: string
          orden?: number | null
          sup_inf?: string | null
          tipo_tag_id?: number
          updated_at?: string | null
          valor_booleano?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_tag_tipo_tag_id_fkey"
            columns: ["tipo_tag_id"]
            referencedRelation: "tipo_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      rol_permisos: {
        Row: {
          created_at: string | null
          id: number
          modulo: string
          puede_crear: boolean | null
          puede_editar: boolean | null
          puede_eliminar: boolean | null
          puede_leer: boolean | null
          rol_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          modulo: string
          puede_crear?: boolean | null
          puede_editar?: boolean | null
          puede_eliminar?: boolean | null
          puede_leer?: boolean | null
          rol_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          modulo?: string
          puede_crear?: boolean | null
          puede_editar?: boolean | null
          puede_eliminar?: boolean | null
          puede_leer?: boolean | null
          rol_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "rol_permisos_rol_id_fkey"
            columns: ["rol_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: number
          nivel_acceso: number
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nivel_acceso: number
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nivel_acceso?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_acabado: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: number
          nombre: string
        }
        Update: {
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_comp: {
        Row: {
          complemento_en: string | null
          id: number
          nombre: string
        }
        Insert: {
          complemento_en?: string | null
          id?: number
          nombre: string
        }
        Update: {
          complemento_en?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      tipo_tag: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          descripcion: string | null
          es_multiple: boolean | null
          icono: string | null
          id: number
          nombre: string
          orden: number | null
          tipo_dato: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          es_multiple?: boolean | null
          icono?: string | null
          id?: number
          nombre: string
          orden?: number | null
          tipo_dato?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          es_multiple?: boolean | null
          icono?: string | null
          id?: number
          nombre?: string
          orden?: number | null
          tipo_dato?: string | null
        }
        Relationships: []
      }
      usuario_bodegas: {
        Row: {
          bodega_id: number
          created_at: string | null
          id: number
          puede_confirmar_notas: boolean | null
          puede_consultar: boolean | null
          puede_crear_notas: boolean | null
          puede_transferir: boolean | null
          usuario_id: number
        }
        Insert: {
          bodega_id: number
          created_at?: string | null
          id?: number
          puede_confirmar_notas?: boolean | null
          puede_consultar?: boolean | null
          puede_crear_notas?: boolean | null
          puede_transferir?: boolean | null
          usuario_id: number
        }
        Update: {
          bodega_id?: number
          created_at?: string | null
          id?: number
          puede_confirmar_notas?: boolean | null
          puede_consultar?: boolean | null
          puede_crear_notas?: boolean | null
          puede_transferir?: boolean | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuario_bodegas_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_bodegas_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "usuario_bodegas_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
        ]
      }
      usuario_permisos: {
        Row: {
          created_at: string | null
          es_super_admin: boolean | null
          puede_aprobar_notas_inventario: boolean | null
          puede_crear_notas_inventario: boolean | null
          puede_gestionar_compras_b2b: boolean | null
          puede_gestionar_contenedores: boolean | null
          puede_gestionar_ecommerce: boolean | null
          puede_ver_inventario: boolean | null
          updated_at: string | null
          usuario_id: number
        }
        Insert: {
          created_at?: string | null
          es_super_admin?: boolean | null
          puede_aprobar_notas_inventario?: boolean | null
          puede_crear_notas_inventario?: boolean | null
          puede_gestionar_compras_b2b?: boolean | null
          puede_gestionar_contenedores?: boolean | null
          puede_gestionar_ecommerce?: boolean | null
          puede_ver_inventario?: boolean | null
          updated_at?: string | null
          usuario_id: number
        }
        Update: {
          created_at?: string | null
          es_super_admin?: boolean | null
          puede_aprobar_notas_inventario?: boolean | null
          puede_crear_notas_inventario?: boolean | null
          puede_gestionar_compras_b2b?: boolean | null
          puede_gestionar_contenedores?: boolean | null
          puede_gestionar_ecommerce?: boolean | null
          puede_ver_inventario?: boolean | null
          updated_at?: string | null
          usuario_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "usuario_permisos_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "appsheet_login"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "usuario_permisos_usuario_id_fkey"
            columns: ["usuario_id"]
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean | null
          appsheet_activo: boolean
          appsheet_pin: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: number
          nombre_completo: string
          rol_id: number
          telefono: string | null
          tenant: string
          ultimo_acceso: string | null
          username: string
        }
        Insert: {
          activo?: boolean | null
          appsheet_activo?: boolean
          appsheet_pin?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          nombre_completo: string
          rol_id: number
          telefono?: string | null
          tenant?: string
          ultimo_acceso?: string | null
          username: string
        }
        Update: {
          activo?: boolean | null
          appsheet_activo?: boolean
          appsheet_pin?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          nombre_completo?: string
          rol_id?: number
          telefono?: string | null
          tenant?: string
          ultimo_acceso?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_rol_id_fkey"
            columns: ["rol_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      variantes_producto: {
        Row: {
          activo: boolean | null
          color_id: number
          costo_promedio: number | null
          created_at: string | null
          id: number
          precio_venta: number | null
          producto_id: number
          sku_completo: string
          talla_id: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          color_id: number
          costo_promedio?: number | null
          created_at?: string | null
          id?: number
          precio_venta?: number | null
          producto_id: number
          sku_completo: string
          talla_id: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          color_id?: number
          costo_promedio?: number | null
          created_at?: string | null
          id?: number
          precio_venta?: number | null
          producto_id?: number
          sku_completo?: string
          talla_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variantes_producto_color_id_fkey"
            columns: ["color_id"]
            referencedRelation: "cat_colores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_talla_id_fkey"
            columns: ["talla_id"]
            referencedRelation: "cat_tallas"
            referencedColumns: ["id"]
          },
        ]
      }
      z_proveedores_archivado: {
        Row: {
          activo: boolean | null
          calidades: string | null
          contacto: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          generos: string | null
          id: number
          ini_user: string | null
          nombre: string
          orden: number | null
          precios: string | null
          tallas: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          calidades?: string | null
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          generos?: string | null
          id?: number
          ini_user?: string | null
          nombre: string
          orden?: number | null
          precios?: string | null
          tallas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          calidades?: string | null
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          generos?: string | null
          id?: number
          ini_user?: string | null
          nombre?: string
          orden?: number | null
          precios?: string | null
          tallas?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      appsheet_login: {
        Row: {
          activo: boolean | null
          contrasena: string | null
          correo: string | null
          nivel_acceso: number | null
          nombre: string | null
          nombre_corto: string | null
          perfil: string | null
          tel: string | null
          usuario: string | null
          usuario_id: number | null
        }
        Relationships: []
      }
      contenedor_cajas: {
        Row: {
          caja_id: number | null
          cantidad_cajas: number | null
          contenedor_id: number | null
          created_at: string | null
          id: number | null
          orden_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_cajas_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "ordenes_b2b"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_cajas_orden_id_fkey"
            columns: ["orden_id"]
            referencedRelation: "v_contenedor_packing"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_contenedor_id_fkey"
            columns: ["contenedor_id"]
            referencedRelation: "contenedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_contenedor_id_fkey"
            columns: ["contenedor_id"]
            referencedRelation: "v_contenedor_resumen"
            referencedColumns: ["contenedor_id"]
          },
        ]
      }
      v_catalogo_listado: {
        Row: {
          activo: boolean | null
          colores_disponibles: Json | null
          created_at: string | null
          descripcion: string | null
          destacado: boolean | null
          edad_rango: string | null
          en_oferta: boolean | null
          es_conjunto: boolean | null
          estado: string | null
          familia: string | null
          genero_codigo: string | null
          genero_nombre: string | null
          id: number | null
          imagen_principal: string | null
          marca_logo: string | null
          marca_nombre: string | null
          nombre: string | null
          precio_oferta: number | null
          precio_publico: number | null
          precio_variante_max: number | null
          precio_variante_min: number | null
          sku_base: string | null
          tallas_disponibles: Json | null
          tipo_prenda_clasificacion: string | null
          tipo_prenda_nombre: string | null
          tipo_prenda_vista_web: string | null
          total_variantes_activas: number | null
          updated_at: string | null
          web_activo: boolean | null
          web_destacado: boolean | null
          web_fecha_publicacion: string | null
          web_nuevo: boolean | null
          web_orden_display: number | null
          web_slug: string | null
          web_titulo_seo: string | null
          web_visitas: number | null
        }
        Relationships: []
      }
      v_catalogo_web: {
        Row: {
          descripcion: string | null
          destacado: boolean | null
          en_oferta: boolean | null
          genero: string | null
          imagen_principal: string | null
          marca: string | null
          nombre: string | null
          nuevo: boolean | null
          precio_oferta: number | null
          precio_publico: number | null
          producto_id: number | null
          sku_base: string | null
          slug: string | null
          stock_total: number | null
          tipo_prenda: string | null
          total_variantes: number | null
        }
        Relationships: []
      }
      v_contenedor_packing: {
        Row: {
          cajas_pedidas: number | null
          cantidad_cajas: number | null
          cbm_detalle: number | null
          cbm_por_caja: number | null
          cbm_subtotal_caja: number | null
          codigo_caja: string | null
          codigo_contenedor: string | null
          colores_caja: string | null
          composicion: string | null
          estado_contenedor: string | null
          estado_orden: string | null
          fecha_eta: string | null
          fecha_etd: string | null
          folio_proveedor: string | null
          importe_total: number | null
          marca: string | null
          moneda: string | null
          nombre_pack: string | null
          numero_bl: string | null
          numero_contenedor: string | null
          orden_id: number | null
          peso_bruto_caja: number | null
          peso_total_caja: number | null
          piezas_pedidas: number | null
          piezas_por_caja: number | null
          piezas_solicitadas: number | null
          precio_unitario: number | null
          precio_yuan: number | null
          producto_id: number | null
          producto_nombre: string | null
          proveedor: string | null
          sku_base: string | null
          tallas_caja: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_b2b_detalles_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_contenedor_resumen: {
        Row: {
          buque: string | null
          cajas_totales: number | null
          cbm_ocupado: number | null
          cbm_total: number | null
          codigo_contenedor: string | null
          contenedor_id: number | null
          estado: string | null
          fecha_eta: string | null
          fecha_etd: string | null
          naviera: string | null
          numero_bl: string | null
          numero_contenedor: string | null
          pct_cbm_ocupado: number | null
          peso_total_kg: number | null
          piezas_totales: number | null
          puerto_destino: string | null
          puerto_origen: string | null
          total_ordenes: number | null
          total_proveedores: number | null
          valor_total_usd: number | null
        }
        Relationships: []
      }
      v_inventario_disponible: {
        Row: {
          bodega_codigo: string | null
          bodega_id: number | null
          bodega_nombre: string | null
          cajas: number | null
          color: string | null
          color_hex: string | null
          piezas_sueltas: number | null
          precio_venta: number | null
          producto_id: number | null
          producto_nombre: string | null
          sku_base: string | null
          sku_completo: string | null
          talla: string | null
          talla_codigo: string | null
          total_piezas: number | null
          ubicacion_pasillo: string | null
          updated_at: string | null
          variante_id: number | null
        }
        Relationships: []
      }
      v_nota_detalle_completo: {
        Row: {
          cajas: number | null
          color: string | null
          detalle_id: number | null
          modo_detalle: string | null
          nota_id: number | null
          numero_nota: string | null
          piezas_sueltas: number | null
          precio_venta: number | null
          producto_id: number | null
          producto_nombre: string | null
          pz_en_caja: number | null
          sku_base: string | null
          sku_completo: string | null
          talla: string | null
          total_piezas: number | null
          valor_total: number | null
          variante_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_detalle_productos_nota_id_fkey"
            columns: ["nota_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_producto_variantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["variante_id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "v_variantes_disponibles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_detalle_productos_variante_id_fkey"
            columns: ["variante_id"]
            referencedRelation: "variantes_producto"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_acabados: {
        Row: {
          created_at: string | null
          detalle_acabado_descripcion: string | null
          detalle_acabado_id: number | null
          detalle_acabado_nombre: string | null
          detalle_acabado_tipo: string | null
          id: number | null
          localizacion_id: number | null
          localizacion_nombre: string | null
          patron_acabado_id: number | null
          patron_nombre: string | null
          patron_subcategoria: string | null
          patron_tipo_acabado: string | null
          producto_id: number | null
          tipo_acabado_id: number | null
          tipo_acabado_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acabado_producto_detalle_acabado_id_fkey"
            columns: ["detalle_acabado_id"]
            referencedRelation: "detalle_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_localizacion_id_fkey"
            columns: ["localizacion_id"]
            referencedRelation: "localizacion_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_patron_acabado_id_fkey"
            columns: ["patron_acabado_id"]
            referencedRelation: "patron_acabado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acabado_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "acabado_producto_tipo_acabado_id_fkey"
            columns: ["tipo_acabado_id"]
            referencedRelation: "tipo_acabado"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_cajas: {
        Row: {
          alto_cm: number | null
          ancho_cm: number | null
          cbm: number | null
          codigo_caja: string | null
          colores: string | null
          costo_total_caja: number | null
          created_at: string | null
          id: number | null
          largo_cm: number | null
          nombre_pack: string | null
          persona_id: number | null
          peso_bruto_kg: number | null
          piezas_por_caja: number | null
          producto_id: number | null
          proveedor_email: string | null
          proveedor_nombre: string | null
          proveedor_tipo: string | null
          tallas: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cajas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "cajas_producto_proveedor_id_fkey"
            columns: ["persona_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_complementos: {
        Row: {
          corte_forma_id: number | null
          corte_forma_nombre: string | null
          corte_forma_nombre_en: string | null
          created_at: string | null
          descripcion_adicional: string | null
          id: number | null
          material_composicion: string | null
          material_id: number | null
          material_nombre: string | null
          material_tipo: string | null
          parte_prenda_id: number | null
          parte_prenda_nombre: string | null
          parte_prenda_tipo: string | null
          producto_id: number | null
          tipo_comp_id: number | null
          tipo_comp_nombre: string | null
          tipo_comp_nombre_en: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complemento_producto_corte_forma_id_fkey"
            columns: ["corte_forma_id"]
            referencedRelation: "corte_forma_comp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_material_id_fkey"
            columns: ["material_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_parte_prenda_id_fkey"
            columns: ["parte_prenda_id"]
            referencedRelation: "parte_prenda_comp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complemento_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "complemento_producto_tipo_comp_id_fkey"
            columns: ["tipo_comp_id"]
            referencedRelation: "tipo_comp"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_conjunto: {
        Row: {
          cantidad: number | null
          created_at: string | null
          es_requerido: boolean | null
          hijo_activo: boolean | null
          hijo_descripcion: string | null
          hijo_estado: string | null
          hijo_imagen: string | null
          hijo_nombre: string | null
          hijo_precio_publico: number | null
          hijo_sku: string | null
          hijo_slug: string | null
          id: number | null
          orden: number | null
          producto_hijo_id: number | null
          producto_padre_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_hijo_id_fkey"
            columns: ["producto_hijo_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_conjunto_producto_padre_id_fkey"
            columns: ["producto_padre_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_producto_detalle: {
        Row: {
          activo: boolean | null
          composicion: string | null
          created_at: string | null
          descripcion: string | null
          destacado: boolean | null
          edad_id: number | null
          edad_rango: string | null
          edad_talla: string | null
          es_conjunto: boolean | null
          estado: string | null
          familia: string | null
          genero_codigo: string | null
          genero_id: number | null
          genero_nombre: string | null
          id: number | null
          imagen_principal: string | null
          marca_id: number | null
          marca_logo: string | null
          marca_nombre: string | null
          nombre: string | null
          persona_id: number | null
          persona_nombre: string | null
          persona_tipo: string | null
          precio_ec: number | null
          proveedor_id: number | null
          pz_en_caja: number | null
          sku_base: string | null
          tela_ext_composicion: string | null
          tela_ext_cuidado: string | null
          tela_ext_descripcion: string | null
          tela_ext_elasticidad: string | null
          tela_ext_id: number | null
          tela_ext_nombre: string | null
          tela_ext_transparencia: string | null
          tela_forro_composicion: string | null
          tela_forro_id: number | null
          tela_forro_nombre: string | null
          tipo_prenda_clasificacion: string | null
          tipo_prenda_descripcion: string | null
          tipo_prenda_id: number | null
          tipo_prenda_nombre: string | null
          tipo_prenda_vista_web: string | null
          total_acabados: number | null
          total_cajas: number | null
          total_complementos: number | null
          total_conjunto: number | null
          total_imagenes: number | null
          total_medidas: number | null
          total_tags: number | null
          total_variantes: number | null
          updated_at: string | null
          web_activo: boolean | null
          web_descripcion_seo: string | null
          web_destacado: boolean | null
          web_en_oferta: boolean | null
          web_fecha_publicacion: string | null
          web_id: number | null
          web_keywords: string | null
          web_nuevo: boolean | null
          web_orden_display: number | null
          web_precio_oferta: number | null
          web_precio_publico: number | null
          web_slug: string | null
          web_titulo_seo: string | null
          web_visitas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_edad_id_fkey"
            columns: ["edad_id"]
            referencedRelation: "cat_edades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_genero_id_fkey"
            columns: ["genero_id"]
            referencedRelation: "cat_generos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            referencedRelation: "cat_marcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_persona_id_fkey"
            columns: ["persona_id"]
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tela_ext_id_fkey"
            columns: ["tela_ext_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tela_forro_id_fkey"
            columns: ["tela_forro_id"]
            referencedRelation: "cat_telas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_tipo_prenda_id_fkey"
            columns: ["tipo_prenda_id"]
            referencedRelation: "cat_tipo_prenda"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_imagenes: {
        Row: {
          alt_text: string | null
          created_at: string | null
          es_principal: boolean | null
          id: number | null
          orden: number | null
          origen_imagen: string | null
          producto_id: number | null
          url: string | null
          uso_imagen: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          es_principal?: boolean | null
          id?: number | null
          orden?: number | null
          origen_imagen?: string | null
          producto_id?: number | null
          url?: string | null
          uso_imagen?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          es_principal?: boolean | null
          id?: number | null
          orden?: number | null
          origen_imagen?: string | null
          producto_id?: number | null
          url?: string | null
          uso_imagen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_producto_medidas: {
        Row: {
          created_at: string | null
          id: number | null
          medida_cm: number | null
          medida_ft: number | null
          producto_id: number | null
          punto_medida_clasificacion: string | null
          punto_medida_id: number | null
          punto_medida_inch: string | null
          punto_medida_nombre: string | null
          punto_medida_posicion: string | null
          talla_categoria: string | null
          talla_codigo: string | null
          talla_id: number | null
          talla_nombre: string | null
          talla_orden: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "medidas_producto_punto_medida_id_fkey"
            columns: ["punto_medida_id"]
            referencedRelation: "puntos_medida"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medidas_producto_talla_id_fkey"
            columns: ["talla_id"]
            referencedRelation: "cat_tallas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_tags: {
        Row: {
          created_at: string | null
          id: number | null
          producto_id: number | null
          ref_tag_booleano: boolean | null
          ref_tag_codigo: string | null
          ref_tag_descripcion: string | null
          ref_tag_id: number | null
          ref_tag_nombre: string | null
          ref_tag_nombre_en: string | null
          ref_tag_sup_inf: string | null
          tipo_tag_codigo: string | null
          tipo_tag_es_multiple: boolean | null
          tipo_tag_icono: string | null
          tipo_tag_id: number | null
          tipo_tag_nombre: string | null
          tipo_tag_orden: number | null
          tipo_tag_tipo_dato: string | null
          valor_texto: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "producto_tags_ref_tag_id_fkey"
            columns: ["ref_tag_id"]
            referencedRelation: "ref_tag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_tags_tipo_tag_id_fkey"
            columns: ["tipo_tag_id"]
            referencedRelation: "tipo_tag"
            referencedColumns: ["id"]
          },
        ]
      }
      v_producto_variantes: {
        Row: {
          activo: boolean | null
          color_codigo: string | null
          color_hex: string | null
          color_id: number | null
          color_nombre: string | null
          color_nombre_interno: string | null
          color_orden: number | null
          color_tipo: string | null
          costo_promedio: number | null
          created_at: string | null
          id: number | null
          precio_venta: number | null
          producto_id: number | null
          sku_completo: string | null
          talla_categoria: string | null
          talla_codigo: string | null
          talla_es_extra: boolean | null
          talla_id: number | null
          talla_nombre: string | null
          talla_orden: number | null
          talla_us: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variantes_producto_color_id_fkey"
            columns: ["color_id"]
            referencedRelation: "cat_colores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variantes_producto_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "variantes_producto_talla_id_fkey"
            columns: ["talla_id"]
            referencedRelation: "cat_tallas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock_alertas: {
        Row: {
          alerta_stock: string | null
          bodega_codigo: string | null
          bodega_id: number | null
          bodega_nombre: string | null
          cajas: number | null
          color: string | null
          piezas_sueltas: number | null
          producto_id: number | null
          producto_nombre: string | null
          pz_en_caja: number | null
          sku_base: string | null
          sku_completo: string | null
          talla: string | null
          total_piezas: number | null
          ubicacion_pasillo: string | null
          updated_at: string | null
          variante_id: number | null
        }
        Relationships: []
      }
      v_stock_consolidado: {
        Row: {
          cajas_total_global: number | null
          num_bodegas: number | null
          piezas_estimadas_global: number | null
          piezas_total_global: number | null
          producto_id: number | null
          producto_nombre: string | null
          sku_base: string | null
          ultima_actualizacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_stock_desglose_cajas: {
        Row: {
          bodega_id: number | null
          bodega_nombre: string | null
          caja_id: number | null
          cajas_de_este_tipo: number | null
          codigo_caja: string | null
          nombre_pack: string | null
          piezas_estimadas: number | null
          piezas_por_caja: number | null
          piezas_sueltas: number | null
          producto_id: number | null
          producto_nombre: string | null
          sku_base: string | null
          ultima_actualizacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "cajas_producto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_caja_id_fkey"
            columns: ["caja_id"]
            referencedRelation: "v_producto_cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_stock_por_producto: {
        Row: {
          bodega_codigo: string | null
          bodega_id: number | null
          bodega_nombre: string | null
          cajas_total: number | null
          piezas_estimadas_total: number | null
          piezas_total: number | null
          producto_id: number | null
          producto_nombre: string | null
          sku_base: string | null
          ubicacion_pasillo: string | null
          ultima_actualizacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "bodegas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_bodega_id_fkey"
            columns: ["bodega_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["bodega_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_listado"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_catalogo_web"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_inventario_disponible"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_producto_detalle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_stock_producto_id_fkey"
            columns: ["producto_id"]
            referencedRelation: "v_stock_alertas"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_variantes_disponibles: {
        Row: {
          activo: boolean | null
          color: string | null
          id: number | null
          nombre_completo: string | null
          precio_venta: number | null
          producto: string | null
          pz_en_caja: number | null
          sku_completo: string | null
          talla: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_inventario_stock: {
        Args: {
          p_bodega_id: number
          p_caja_id?: number
          p_cajas_delta: number
          p_piezas_delta: number
          p_producto_id: number
          p_usuario_id: number
        }
        Returns: undefined
      }
      fn_navegar_producto: {
        Args: { p_producto_id: number }
        Returns: {
          id_anterior: number
          id_siguiente: number
          posicion: number
          sku_anterior: string
          sku_siguiente: string
          total: number
        }[]
      }
      fn_puede_acceder_bodega: {
        Args: { p_bodega_id: number; p_usuario_id: number }
        Returns: boolean
      }
      sp_agregar_producto_nota: {
        Args: {
          p_caja_id?: number
          p_cajas: number
          p_nota_id: number
          p_piezas_sueltas?: number
          p_producto_id?: number
          p_variante_id?: number
        }
        Returns: string
      }
      sp_cancelar_nota: {
        Args: { p_motivo?: string; p_nota_id: number; p_usuario_id: number }
        Returns: string
      }
      sp_crear_nota: {
        Args: {
          p_bodega_destino_id: number
          p_bodega_origen_id: number
          p_nota_referencia?: string
          p_observaciones?: string
          p_tipo_movimiento_id: number
          p_usuario_id: number
        }
        Returns: {
          nota_id: number
          numero_nota: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  pgbouncer: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth: {
        Args: { p_usename: string }
        Returns: {
          password: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      tenants: {
        Row: {
          activo: boolean
          created_at: string | null
          id: number
          nombre: string
          schema_name: string
        }
        Insert: {
          activo?: boolean
          created_at?: string | null
          id?: number
          nombre: string
          schema_name: string
        }
        Update: {
          activo?: boolean
          created_at?: string | null
          id?: number
          nombre?: string
          schema_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      notas_inventario: {
        Row: {
          bodega_destino_id: number | null
          bodega_origen_id: number | null
          created_at: string | null
          estado_id: number | null
          fecha_confirmacion: string | null
          fecha_nota: string | null
          id: number | null
          nota_original_id: number | null
          nota_referencia: string | null
          numero_nota: string | null
          observaciones: string | null
          tipo_movimiento_id: number | null
          total_cajas: number | null
          usuario_id: number | null
        }
        Insert: {
          bodega_destino_id?: number | null
          bodega_origen_id?: number | null
          created_at?: string | null
          estado_id?: number | null
          fecha_confirmacion?: string | null
          fecha_nota?: string | null
          id?: number | null
          nota_original_id?: number | null
          nota_referencia?: string | null
          numero_nota?: string | null
          observaciones?: string | null
          tipo_movimiento_id?: number | null
          total_cajas?: number | null
          usuario_id?: number | null
        }
        Update: {
          bodega_destino_id?: number | null
          bodega_origen_id?: number | null
          created_at?: string | null
          estado_id?: number | null
          fecha_confirmacion?: string | null
          fecha_nota?: string | null
          id?: number | null
          nota_original_id?: number | null
          nota_referencia?: string | null
          numero_nota?: string | null
          observaciones?: string | null
          tipo_movimiento_id?: number | null
          total_cajas?: number | null
          usuario_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_inventario_nota_original_id_fkey"
            columns: ["nota_original_id"]
            referencedRelation: "notas_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: number | null
          nivel_acceso: number | null
          nombre: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: number | null
          nivel_acceso?: number | null
          nombre?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: number | null
          nivel_acceso?: number | null
          nombre?: string | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean | null
          appsheet_activo: boolean | null
          appsheet_pin: string | null
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          id: number | null
          nombre_completo: string | null
          rol_id: number | null
          telefono: string | null
          tenant: string | null
          ultimo_acceso: string | null
          username: string | null
        }
        Insert: {
          activo?: boolean | null
          appsheet_activo?: boolean | null
          appsheet_pin?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number | null
          nombre_completo?: string | null
          rol_id?: number | null
          telefono?: string | null
          tenant?: string | null
          ultimo_acceso?: string | null
          username?: string | null
        }
        Update: {
          activo?: boolean | null
          appsheet_activo?: boolean | null
          appsheet_pin?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number | null
          nombre_completo?: string | null
          rol_id?: number | null
          telefono?: string | null
          tenant?: string | null
          ultimo_acceso?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_rol_id_fkey"
            columns: ["rol_id"]
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      es_super_admin: { Args: never; Returns: boolean }
      get_tenant: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  "inv-tienda": {
    Enums: {},
  },
  pgbouncer: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
