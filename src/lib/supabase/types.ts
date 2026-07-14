// Generado con el MCP de Supabase (generate_typescript_types) desde el
// schema real. NO EDITAR A MANO — volver a generar tras cada migración.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      arancel: {
        Row: {
          area_id: string | null
          created_at: string
          id: string
          monto: number
          tipo: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          id?: string
          monto: number
          tipo: string
          vigente_desde: string
          vigente_hasta?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          id?: string
          monto?: number
          tipo?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arancel_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
        ]
      }
      area: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          es_inscribible: boolean
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          es_inscribible?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          es_inscribible?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      aviso: {
        Row: {
          alcance: Database["public"]["Enums"]["aviso_alcance"]
          area_id: string | null
          comision_id: string
          created_at: string
          cuerpo: string
          enviado_push: boolean
          id: string
          imagen_url: string | null
          titulo: string
          usuario_id: string
        }
        Insert: {
          alcance: Database["public"]["Enums"]["aviso_alcance"]
          area_id?: string | null
          comision_id: string
          created_at?: string
          cuerpo: string
          enviado_push?: boolean
          id?: string
          imagen_url?: string | null
          titulo: string
          usuario_id: string
        }
        Update: {
          alcance?: Database["public"]["Enums"]["aviso_alcance"]
          area_id?: string | null
          comision_id?: string
          created_at?: string
          cuerpo?: string
          enviado_push?: boolean
          id?: string
          imagen_url?: string | null
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aviso_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aviso_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aviso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      aviso_lectura: {
        Row: {
          aviso_id: string
          leido_at: string
          usuario_id: string
        }
        Insert: {
          aviso_id: string
          leido_at?: string
          usuario_id: string
        }
        Update: {
          aviso_id?: string
          leido_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aviso_lectura_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "aviso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aviso_lectura_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      bloqueo: {
        Row: {
          desde: string
          hasta: string
          id: string
          motivo: string | null
          recurso_id: string
        }
        Insert: {
          desde: string
          hasta: string
          id?: string
          motivo?: string | null
          recurso_id: string
        }
        Update: {
          desde?: string
          hasta?: string
          id?: string
          motivo?: string | null
          recurso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueo_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recurso"
            referencedColumns: ["id"]
          },
        ]
      }
      cargo_comision: {
        Row: {
          cargo: Database["public"]["Enums"]["cargo_tipo"]
          comision_id: string
          created_at: string
          id: string
          usuario_id: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          cargo: Database["public"]["Enums"]["cargo_tipo"]
          comision_id: string
          created_at?: string
          id?: string
          usuario_id: string
          vigente_desde: string
          vigente_hasta?: string | null
        }
        Update: {
          cargo?: Database["public"]["Enums"]["cargo_tipo"]
          comision_id?: string
          created_at?: string
          id?: string
          usuario_id?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargo_comision_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cargo_comision_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      comision: {
        Row: {
          created_at: string
          es_directiva: boolean
          id: string
          mandato_desde: string
          mandato_hasta: string
          nombre: string
        }
        Insert: {
          created_at?: string
          es_directiva?: boolean
          id?: string
          mandato_desde: string
          mandato_hasta: string
          nombre: string
        }
        Update: {
          created_at?: string
          es_directiva?: boolean
          id?: string
          mandato_desde?: string
          mandato_hasta?: string
          nombre?: string
        }
        Relationships: []
      }
      comision_area: {
        Row: {
          area_id: string
          comision_id: string
        }
        Insert: {
          area_id: string
          comision_id: string
        }
        Update: {
          area_id?: string
          comision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comision_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comision_area_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comision"
            referencedColumns: ["id"]
          },
        ]
      }
      cuota: {
        Row: {
          area_id: string | null
          created_at: string
          estado: Database["public"]["Enums"]["cuota_estado"]
          grupo_familiar_id: string | null
          id: string
          monto: number
          periodo: string
          socio_id: string | null
          tipo: Database["public"]["Enums"]["cuota_tipo"]
          vencimiento: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["cuota_estado"]
          grupo_familiar_id?: string | null
          id?: string
          monto: number
          periodo: string
          socio_id?: string | null
          tipo: Database["public"]["Enums"]["cuota_tipo"]
          vencimiento: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["cuota_estado"]
          grupo_familiar_id?: string | null
          id?: string
          monto?: number
          periodo?: string
          socio_id?: string | null
          tipo?: Database["public"]["Enums"]["cuota_tipo"]
          vencimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuota_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuota_grupo_familiar_id_fkey"
            columns: ["grupo_familiar_id"]
            isOneToOne: false
            referencedRelation: "grupo_familiar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuota_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socio"
            referencedColumns: ["id"]
          },
        ]
      }
      disponibilidad: {
        Row: {
          dia_semana: number
          hora_desde: string
          hora_hasta: string
          id: string
          recurso_id: string
        }
        Insert: {
          dia_semana: number
          hora_desde: string
          hora_hasta: string
          id?: string
          recurso_id: string
        }
        Update: {
          dia_semana?: number
          hora_desde?: string
          hora_hasta?: string
          id?: string
          recurso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disponibilidad_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recurso"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivo: {
        Row: {
          created_at: string
          fcm_token: string
          id: string
          plataforma: string
          ultimo_uso: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          fcm_token: string
          id?: string
          plataforma: string
          ultimo_uso?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          fcm_token?: string
          id?: string
          plataforma?: string
          ultimo_uso?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_familiar: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          titular_id: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          titular_id?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          titular_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_titular"
            columns: ["titular_id"]
            isOneToOne: false
            referencedRelation: "socio"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento: {
        Row: {
          area_id: string | null
          comision_id: string
          comprobante_url: string | null
          concepto: string
          created_at: string
          fecha: string
          id: string
          monto: number
          pago_id: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_id: string
        }
        Insert: {
          area_id?: string | null
          comision_id: string
          comprobante_url?: string | null
          concepto: string
          created_at?: string
          fecha?: string
          id?: string
          monto: number
          pago_id?: string | null
          tipo: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_id: string
        }
        Update: {
          area_id?: string | null
          comision_id?: string
          comprobante_url?: string | null
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          pago_id?: string | null
          tipo?: Database["public"]["Enums"]["movimiento_tipo"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "comision"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: true
            referencedRelation: "pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      pago: {
        Row: {
          comprobante_url: string | null
          created_at: string
          cuota_id: string | null
          fecha: string
          id: string
          idempotency_key: string | null
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          mp_payment_id: string | null
          mp_status: string | null
          observaciones: string | null
          registrado_por: string | null
          turno_id: string | null
        }
        Insert: {
          comprobante_url?: string | null
          created_at?: string
          cuota_id?: string | null
          fecha?: string
          id?: string
          idempotency_key?: string | null
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto: number
          mp_payment_id?: string | null
          mp_status?: string | null
          observaciones?: string | null
          registrado_por?: string | null
          turno_id?: string | null
        }
        Update: {
          comprobante_url?: string | null
          created_at?: string
          cuota_id?: string | null
          fecha?: string
          id?: string
          idempotency_key?: string | null
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto?: number
          mp_payment_id?: string | null
          mp_status?: string | null
          observaciones?: string | null
          registrado_por?: string | null
          turno_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pago_turno"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_cuota_id_fkey"
            columns: ["cuota_id"]
            isOneToOne: false
            referencedRelation: "cuota"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      recurso: {
        Row: {
          activo: boolean
          aprobacion_automatica: boolean
          area_id: string
          created_at: string
          duracion_minutos: number
          horas_cancelacion: number
          id: string
          nombre: string
          precio_no_socio: number
          precio_socio: number
        }
        Insert: {
          activo?: boolean
          aprobacion_automatica?: boolean
          area_id: string
          created_at?: string
          duracion_minutos?: number
          horas_cancelacion?: number
          id?: string
          nombre: string
          precio_no_socio: number
          precio_socio: number
        }
        Update: {
          activo?: boolean
          aprobacion_automatica?: boolean
          area_id?: string
          created_at?: string
          duracion_minutos?: number
          horas_cancelacion?: number
          id?: string
          nombre?: string
          precio_no_socio?: number
          precio_socio?: number
        }
        Relationships: [
          {
            foreignKeyName: "recurso_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
        ]
      }
      socio: {
        Row: {
          created_at: string
          fecha_alta: string
          fecha_baja: string | null
          grupo_familiar_id: string | null
          id: string
          numero_socio: number
          usuario_id: string
        }
        Insert: {
          created_at?: string
          fecha_alta: string
          fecha_baja?: string | null
          grupo_familiar_id?: string | null
          id?: string
          numero_socio: number
          usuario_id: string
        }
        Update: {
          created_at?: string
          fecha_alta?: string
          fecha_baja?: string | null
          grupo_familiar_id?: string | null
          id?: string
          numero_socio?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socio_grupo_familiar_id_fkey"
            columns: ["grupo_familiar_id"]
            isOneToOne: false
            referencedRelation: "grupo_familiar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socio_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      socio_area: {
        Row: {
          area_id: string
          created_at: string
          fecha_alta: string
          fecha_baja: string | null
          id: string
          socio_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          fecha_alta: string
          fecha_baja?: string | null
          id?: string
          socio_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          fecha_alta?: string
          fecha_baja?: string | null
          id?: string
          socio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "socio_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "socio_area_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socio"
            referencedColumns: ["id"]
          },
        ]
      }
      turno: {
        Row: {
          aprobado_por: string | null
          cobrado: boolean
          cobrado_at: string | null
          cobrado_por: string | null
          created_at: string
          era_socio: boolean
          estado: Database["public"]["Enums"]["turno_estado"]
          fin: string
          id: string
          inicio: string
          precio: number
          recurso_id: string
          usuario_id: string
        }
        Insert: {
          aprobado_por?: string | null
          cobrado?: boolean
          cobrado_at?: string | null
          cobrado_por?: string | null
          created_at?: string
          era_socio: boolean
          estado?: Database["public"]["Enums"]["turno_estado"]
          fin: string
          id?: string
          inicio: string
          precio: number
          recurso_id: string
          usuario_id: string
        }
        Update: {
          aprobado_por?: string | null
          cobrado?: boolean
          cobrado_at?: string | null
          cobrado_por?: string | null
          created_at?: string
          era_socio?: boolean
          estado?: Database["public"]["Enums"]["turno_estado"]
          fin?: string
          id?: string
          inicio?: string
          precio?: number
          recurso_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "turno_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_cobrado_por_fkey"
            columns: ["cobrado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recurso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          dni: string | null
          email: string | null
          fecha_nac: string | null
          foto_url: string | null
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_nac?: string | null
          foto_url?: string | null
          id: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          dni?: string | null
          email?: string | null
          fecha_nac?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      emitir_cuotas: { Args: { p_periodo?: string }; Returns: number }
      es_directiva: { Args: never; Returns: boolean }
      es_mi_cuota: { Args: { p_cuota_id: string }; Returns: boolean }
      puede_cobrar: {
        Args: { p_cuota_id: string; p_turno_id: string }
        Returns: boolean
      }
      puede_gestionar_area: { Args: { p_area_id: string }; Returns: boolean }
    }
    Enums: {
      aviso_alcance: "global" | "area"
      cargo_tipo:
        | "presidente"
        | "vicepresidente"
        | "secretario"
        | "prosecretario"
        | "tesorero"
        | "protesorero"
        | "vocal"
        | "revisor_cuentas"
      cuota_estado: "impaga" | "pendiente" | "pagada" | "anulada"
      cuota_tipo: "social" | "actividad"
      metodo_pago: "mercadopago" | "efectivo" | "transferencia"
      movimiento_tipo: "ingreso" | "egreso"
      turno_estado:
        | "pendiente_aprobacion"
        | "confirmado"
        | "rechazado"
        | "cancelado"
        | "ausente"
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
  public: {
    Enums: {
      aviso_alcance: ["global", "area"],
      cargo_tipo: [
        "presidente",
        "vicepresidente",
        "secretario",
        "prosecretario",
        "tesorero",
        "protesorero",
        "vocal",
        "revisor_cuentas",
      ],
      cuota_estado: ["impaga", "pendiente", "pagada", "anulada"],
      cuota_tipo: ["social", "actividad"],
      metodo_pago: ["mercadopago", "efectivo", "transferencia"],
      movimiento_tipo: ["ingreso", "egreso"],
      turno_estado: [
        "pendiente_aprobacion",
        "confirmado",
        "rechazado",
        "cancelado",
        "ausente",
      ],
    },
  },
} as const
