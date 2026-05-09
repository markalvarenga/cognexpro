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
      accounts: {
        Row: {
          balance: number | null
          color: string | null
          cpf_cnpj_titular: string | null
          created_at: string | null
          id: string
          institution: string
          name: string
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          color?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string | null
          id?: string
          institution: string
          name: string
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          color?: string | null
          cpf_cnpj_titular?: string | null
          created_at?: string | null
          id?: string
          institution?: string
          name?: string
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_accounts: {
        Row: {
          bandeira_cartao: string | null
          bm_anunciante_id: string | null
          created_at: string | null
          id: string
          id_conta: string | null
          limite_diario: number | null
          limite_total: number | null
          nome_conta: string
          observacoes: string | null
          perfil_id: string | null
          status: string | null
          tipo_cartao: string | null
          ultimos_4_digitos: string | null
          user_id: string
        }
        Insert: {
          bandeira_cartao?: string | null
          bm_anunciante_id?: string | null
          created_at?: string | null
          id?: string
          id_conta?: string | null
          limite_diario?: number | null
          limite_total?: number | null
          nome_conta: string
          observacoes?: string | null
          perfil_id?: string | null
          status?: string | null
          tipo_cartao?: string | null
          ultimos_4_digitos?: string | null
          user_id: string
        }
        Update: {
          bandeira_cartao?: string | null
          bm_anunciante_id?: string | null
          created_at?: string | null
          id?: string
          id_conta?: string | null
          limite_diario?: number | null
          limite_total?: number | null
          nome_conta?: string
          observacoes?: string | null
          perfil_id?: string | null
          status?: string | null
          tipo_cartao?: string | null
          ultimos_4_digitos?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_accounts_bm_anunciante_id_fkey"
            columns: ["bm_anunciante_id"]
            isOneToOne: false
            referencedRelation: "business_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_accounts_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "facebook_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      business_managers: {
        Row: {
          bm_administradora_id: string | null
          bms_pixel_compartilhado: string[] | null
          compartilha_pixel: string | null
          created_at: string | null
          id: string
          id_bm: string | null
          link_acesso: string | null
          nome_bm: string
          observacoes: string | null
          perfil_dono_id: string | null
          status: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          bm_administradora_id?: string | null
          bms_pixel_compartilhado?: string[] | null
          compartilha_pixel?: string | null
          created_at?: string | null
          id?: string
          id_bm?: string | null
          link_acesso?: string | null
          nome_bm: string
          observacoes?: string | null
          perfil_dono_id?: string | null
          status?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          bm_administradora_id?: string | null
          bms_pixel_compartilhado?: string[] | null
          compartilha_pixel?: string | null
          created_at?: string | null
          id?: string
          id_bm?: string | null
          link_acesso?: string | null
          nome_bm?: string
          observacoes?: string | null
          perfil_dono_id?: string | null
          status?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_managers_perfil_dono_id_fkey"
            columns: ["perfil_dono_id"]
            isOneToOne: false
            referencedRelation: "facebook_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          budget: number | null
          clicks: number | null
          cpl: number | null
          created_at: string | null
          end_date: string | null
          id: string
          impressions: number | null
          leads: number | null
          manager: string | null
          name: string
          platform: string
          product: string | null
          revenue: number | null
          sales: number | null
          spent: number | null
          start_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget?: number | null
          clicks?: number | null
          cpl?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          manager?: string | null
          name: string
          platform: string
          product?: string | null
          revenue?: number | null
          sales?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget?: number | null
          clicks?: number | null
          cpl?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          manager?: string | null
          name?: string
          platform?: string
          product?: string | null
          revenue?: number | null
          sales?: number | null
          spent?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          fiscal_month_start: number | null
          id: string
          name: string
          phone: string | null
          sector: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          week_start: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_month_start?: number | null
          id?: string
          name?: string
          phone?: string | null
          sector?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          week_start?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_month_start?: number | null
          id?: string
          name?: string
          phone?: string | null
          sector?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          week_start?: string | null
        }
        Relationships: []
      }
      contingency_logs: {
        Row: {
          action: string
          created_at: string | null
          entity: string
          entity_id: string | null
          id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facebook_pages: {
        Row: {
          aparece_anuncios: string | null
          bm_acesso_id: string | null
          created_at: string | null
          id: string
          id_pagina: string | null
          instagram_usuario: string | null
          nivel_acesso: string | null
          nome_pagina: string
          observacoes: string | null
          perfil_admin_id: string | null
          status: string | null
          tipo_vinculacao: string | null
          url_pagina: string | null
          user_id: string
        }
        Insert: {
          aparece_anuncios?: string | null
          bm_acesso_id?: string | null
          created_at?: string | null
          id?: string
          id_pagina?: string | null
          instagram_usuario?: string | null
          nivel_acesso?: string | null
          nome_pagina: string
          observacoes?: string | null
          perfil_admin_id?: string | null
          status?: string | null
          tipo_vinculacao?: string | null
          url_pagina?: string | null
          user_id: string
        }
        Update: {
          aparece_anuncios?: string | null
          bm_acesso_id?: string | null
          created_at?: string | null
          id?: string
          id_pagina?: string | null
          instagram_usuario?: string | null
          nivel_acesso?: string | null
          nome_pagina?: string
          observacoes?: string | null
          perfil_admin_id?: string | null
          status?: string | null
          tipo_vinculacao?: string | null
          url_pagina?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facebook_pages_bm_acesso_id_fkey"
            columns: ["bm_acesso_id"]
            isOneToOne: false
            referencedRelation: "business_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facebook_pages_perfil_admin_id_fkey"
            columns: ["perfil_admin_id"]
            isOneToOne: false
            referencedRelation: "facebook_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facebook_profiles: {
        Row: {
          anotacoes: string | null
          cargo_tipo: string | null
          color: string | null
          created_at: string | null
          data_nascimento: string | null
          email_facebook: string | null
          email_verificacao: string | null
          email_vinculado: string | null
          id: string
          id_verificada: string | null
          instagram_conectado_pagina: string | null
          instagram_usuario: string | null
          profile_name: string
          proxy_id: string | null
          seed_2fa: string | null
          senha_email: string | null
          senha_facebook: string | null
          status: string | null
          tem_2fa: string | null
          token_facebook: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anotacoes?: string | null
          cargo_tipo?: string | null
          color?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email_facebook?: string | null
          email_verificacao?: string | null
          email_vinculado?: string | null
          id?: string
          id_verificada?: string | null
          instagram_conectado_pagina?: string | null
          instagram_usuario?: string | null
          profile_name: string
          proxy_id?: string | null
          seed_2fa?: string | null
          senha_email?: string | null
          senha_facebook?: string | null
          status?: string | null
          tem_2fa?: string | null
          token_facebook?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anotacoes?: string | null
          cargo_tipo?: string | null
          color?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email_facebook?: string | null
          email_verificacao?: string | null
          email_vinculado?: string | null
          id?: string
          id_verificada?: string | null
          instagram_conectado_pagina?: string | null
          instagram_usuario?: string | null
          profile_name?: string
          proxy_id?: string | null
          seed_2fa?: string | null
          senha_email?: string | null
          senha_facebook?: string | null
          status?: string | null
          tem_2fa?: string | null
          token_facebook?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          alerta_cpa: boolean | null
          alerta_roas: boolean | null
          campanha_pausada: boolean | null
          id: string
          meta_atingida: boolean | null
          novas_vendas: boolean | null
          push_enabled: boolean | null
          relatorio_diario: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alerta_cpa?: boolean | null
          alerta_roas?: boolean | null
          campanha_pausada?: boolean | null
          id?: string
          meta_atingida?: boolean | null
          novas_vendas?: boolean | null
          push_enabled?: boolean | null
          relatorio_diario?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alerta_cpa?: boolean | null
          alerta_roas?: boolean | null
          campanha_pausada?: boolean | null
          id?: string
          meta_atingida?: boolean | null
          novas_vendas?: boolean | null
          push_enabled?: boolean | null
          relatorio_diario?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pixels: {
        Row: {
          bm_dono_id: string | null
          bms_com_acesso: string[] | null
          contas_anuncio_ids: string[] | null
          created_at: string | null
          dominios: string | null
          id: string
          id_pixel: string | null
          nome_pixel: string
          observacoes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          bm_dono_id?: string | null
          bms_com_acesso?: string[] | null
          contas_anuncio_ids?: string[] | null
          created_at?: string | null
          dominios?: string | null
          id?: string
          id_pixel?: string | null
          nome_pixel: string
          observacoes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          bm_dono_id?: string | null
          bms_com_acesso?: string[] | null
          contas_anuncio_ids?: string[] | null
          created_at?: string | null
          dominios?: string | null
          id?: string
          id_pixel?: string | null
          nome_pixel?: string
          observacoes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pixels_bm_dono_id_fkey"
            columns: ["bm_dono_id"]
            isOneToOne: false
            referencedRelation: "business_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      proxies: {
        Row: {
          cidade_pais: string | null
          created_at: string | null
          data_vencimento: string | null
          id: string
          ip_porta: string
          nome_id: string
          observacoes: string | null
          perfil_id: string | null
          provedor: string | null
          senha_auth: string | null
          status: string | null
          tipo: string | null
          user_id: string
          usuario_auth: string | null
        }
        Insert: {
          cidade_pais?: string | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          ip_porta: string
          nome_id: string
          observacoes?: string | null
          perfil_id?: string | null
          provedor?: string | null
          senha_auth?: string | null
          status?: string | null
          tipo?: string | null
          user_id: string
          usuario_auth?: string | null
        }
        Update: {
          cidade_pais?: string | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          ip_porta?: string
          nome_id?: string
          observacoes?: string | null
          perfil_id?: string | null
          provedor?: string | null
          senha_auth?: string | null
          status?: string | null
          tipo?: string | null
          user_id?: string
          usuario_auth?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proxies_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "facebook_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          board_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number | null
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignee?: string | null
          board_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignee?: string | null
          board_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number | null
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_assets: {
        Row: {
          asset_type: string
          bandeira_cartao: string | null
          bc_vinculado_id: string | null
          created_at: string | null
          email_acesso: string | null
          email_login: string | null
          id: string
          id_asset: string | null
          is_dono: string | null
          limite_gasto: number | null
          nivel_acesso: string | null
          nome: string
          observacoes: string | null
          proxy_id: string | null
          seed_2fa: string | null
          senha: string | null
          status: string | null
          tem_2fa: string | null
          tipo_cartao: string | null
          ultimos_4_digitos: string | null
          url_perfil: string | null
          user_id: string
          usuario_tiktok: string | null
        }
        Insert: {
          asset_type: string
          bandeira_cartao?: string | null
          bc_vinculado_id?: string | null
          created_at?: string | null
          email_acesso?: string | null
          email_login?: string | null
          id?: string
          id_asset?: string | null
          is_dono?: string | null
          limite_gasto?: number | null
          nivel_acesso?: string | null
          nome: string
          observacoes?: string | null
          proxy_id?: string | null
          seed_2fa?: string | null
          senha?: string | null
          status?: string | null
          tem_2fa?: string | null
          tipo_cartao?: string | null
          ultimos_4_digitos?: string | null
          url_perfil?: string | null
          user_id: string
          usuario_tiktok?: string | null
        }
        Update: {
          asset_type?: string
          bandeira_cartao?: string | null
          bc_vinculado_id?: string | null
          created_at?: string | null
          email_acesso?: string | null
          email_login?: string | null
          id?: string
          id_asset?: string | null
          is_dono?: string | null
          limite_gasto?: number | null
          nivel_acesso?: string | null
          nome?: string
          observacoes?: string | null
          proxy_id?: string | null
          seed_2fa?: string | null
          senha?: string | null
          status?: string | null
          tem_2fa?: string | null
          tipo_cartao?: string | null
          ultimos_4_digitos?: string | null
          url_perfil?: string | null
          user_id?: string
          usuario_tiktok?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_assets_proxy_id_fkey"
            columns: ["proxy_id"]
            isOneToOne: false
            referencedRelation: "proxies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account: string | null
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string
          external_id: string | null
          id: string
          notes: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          date: string
          description: string
          external_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string
          external_id?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          cursor_personalizado: boolean | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          phone: string | null
          theme_color: string | null
          two_fa_enabled: boolean | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          cursor_personalizado?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          theme_color?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          cursor_personalizado?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          theme_color?: string | null
          two_fa_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string | null
          event: string
          headers: Json | null
          id: string
          method: string | null
          name: string
          status: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event: string
          headers?: Json | null
          id?: string
          method?: string | null
          name: string
          status?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event?: string
          headers?: Json | null
          id?: string
          method?: string | null
          name?: string
          status?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "dono"
        | "admin"
        | "gestor_trafego"
        | "financeiro"
        | "operacional"
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
      app_role: [
        "dono",
        "admin",
        "gestor_trafego",
        "financeiro",
        "operacional",
      ],
    },
  },
} as const
