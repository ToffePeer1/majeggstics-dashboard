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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      eggday_gains: {
        Row: {
          created_at: string | null
          discord_id: string
          end_eb: number | null
          end_pe: number | null
          end_prestiges: number | null
          end_role: string | null
          end_se: number | null
          id: number
          start_eb: number | null
          start_pe: number | null
          start_prestiges: number | null
          start_role: string | null
          start_se: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          discord_id: string
          end_eb?: number | null
          end_pe?: number | null
          end_prestiges?: number | null
          end_role?: string | null
          end_se?: number | null
          id?: number
          start_eb?: number | null
          start_pe?: number | null
          start_prestiges?: number | null
          start_role?: string | null
          start_se?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          discord_id?: string
          end_eb?: number | null
          end_pe?: number | null
          end_prestiges?: number | null
          end_role?: string | null
          end_se?: number | null
          id?: number
          start_eb?: number | null
          start_pe?: number | null
          start_prestiges?: number | null
          start_role?: string | null
          start_se?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      email_log: {
        Row: {
          body_preview: string | null
          email_type: string
          error_message: string | null
          id: number
          metadata: Json | null
          recipient: string
          related_snapshot_date: string | null
          response_data: Json | null
          sent_at: string | null
          subject: string
          success: boolean
        }
        Insert: {
          body_preview?: string | null
          email_type: string
          error_message?: string | null
          id?: number
          metadata?: Json | null
          recipient: string
          related_snapshot_date?: string | null
          response_data?: Json | null
          sent_at?: string | null
          subject: string
          success: boolean
        }
        Update: {
          body_preview?: string | null
          email_type?: string
          error_message?: string | null
          id?: number
          metadata?: Json | null
          recipient?: string
          related_snapshot_date?: string | null
          response_data?: Json | null
          sent_at?: string | null
          subject?: string
          success?: boolean
        }
        Relationships: []
      }
      excluded_players: {
        Row: {
          discord_id: string
          excluded_at: string | null
          excluded_by: string | null
          notes: string | null
          reason: string
        }
        Insert: {
          discord_id: string
          excluded_at?: string | null
          excluded_by?: string | null
          notes?: string | null
          reason: string
        }
        Update: {
          discord_id?: string
          excluded_at?: string | null
          excluded_by?: string | null
          notes?: string | null
          reason?: string
        }
        Relationships: []
      }
      leaderboard_cache: {
        Row: {
          active: boolean | null
          discord_id: string
          discord_name: string
          display_name: string | null
          eb: number
          farmer_role: string | null
          grade: string
          ign: string
          is_guest: boolean | null
          num_prestiges: number | null
          pe: number
          se: number
          te: number | null
        }
        Insert: {
          active?: boolean | null
          discord_id: string
          discord_name: string
          display_name?: string | null
          eb: number
          farmer_role?: string | null
          grade: string
          ign: string
          is_guest?: boolean | null
          num_prestiges?: number | null
          pe: number
          se: number
          te?: number | null
        }
        Update: {
          active?: boolean | null
          discord_id?: string
          discord_name?: string
          display_name?: string | null
          eb?: number
          farmer_role?: string | null
          grade?: string
          ign?: string
          is_guest?: boolean | null
          num_prestiges?: number | null
          pe?: number
          se?: number
          te?: number | null
        }
        Relationships: []
      }
      leaderboard_cache_metadata: {
        Row: {
          id: number
          last_updated: string
        }
        Insert: {
          id?: number
          last_updated?: string
        }
        Update: {
          id?: number
          last_updated?: string
        }
        Relationships: []
      }
      player_snapshots: {
        Row: {
          active: boolean
          created_at: string | null
          discord_id: string
          discord_name: string
          display_name: string | null
          eb: number
          farmer_role: string | null
          gains_saturday: Json | null
          grade: string
          id: number
          ign: string
          is_guest: boolean | null
          max_mystical_eggs: Json | null
          num_prestiges: number | null
          pe: number
          se: number
          snapshot_date: string
          te: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          discord_id: string
          discord_name: string
          display_name?: string | null
          eb: number
          farmer_role?: string | null
          gains_saturday?: Json | null
          grade: string
          id?: number
          ign: string
          is_guest?: boolean | null
          max_mystical_eggs?: Json | null
          num_prestiges?: number | null
          pe: number
          se: number
          snapshot_date: string
          te?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          discord_id?: string
          discord_name?: string
          display_name?: string | null
          eb?: number
          farmer_role?: string | null
          gains_saturday?: Json | null
          grade?: string
          id?: number
          ign?: string
          is_guest?: boolean | null
          max_mystical_eggs?: Json | null
          num_prestiges?: number | null
          pe?: number
          se?: number
          snapshot_date?: string
          te?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      snapshot_metadata: {
        Row: {
          imported_at: string | null
          record_count: number | null
          snapshot_date: string
        }
        Insert: {
          imported_at?: string | null
          record_count?: number | null
          snapshot_date: string
        }
        Update: {
          imported_at?: string | null
          record_count?: number | null
          snapshot_date?: string
        }
        Relationships: []
      }
      snapshot_save_metadata: {
        Row: {
          id: number
          last_decision_at: string | null
          last_decision_result: Json | null
          last_email_sent_at: string | null
          last_email_type: string | null
          last_saved_at: string | null
          pending_sync_attempt_count: number | null
          pending_sync_data: Json | null
          pending_sync_first_attempt: string | null
          pending_sync_metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          last_decision_at?: string | null
          last_decision_result?: Json | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          last_saved_at?: string | null
          pending_sync_attempt_count?: number | null
          pending_sync_data?: Json | null
          pending_sync_first_attempt?: string | null
          pending_sync_metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          last_decision_at?: string | null
          last_decision_result?: Json | null
          last_email_sent_at?: string | null
          last_email_type?: string | null
          last_saved_at?: string | null
          pending_sync_attempt_count?: number | null
          pending_sync_data?: Json | null
          pending_sync_first_attempt?: string | null
          pending_sync_metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      unique_players_latest: {
        Row: {
          discord_id: string | null
          discord_name: string | null
          display_name: string | null
          ign: string | null
          snapshot_date: string | null
        }
        Relationships: []
      }
      weekly_role_distribution: {
        Row: {
          exafarmer_i: number | null
          exafarmer_ii: number | null
          exafarmer_iii: number | null
          exedafarmer_i: number | null
          exedafarmer_ii: number | null
          exedafarmer_iii: number | null
          farmer_i: number | null
          farmer_ii: number | null
          farmer_iii: number | null
          gigafarmer_i: number | null
          gigafarmer_ii: number | null
          gigafarmer_iii: number | null
          infinifarmer_i: number | null
          kilofarmer_i: number | null
          kilofarmer_ii: number | null
          kilofarmer_iii: number | null
          megafarmer_i: number | null
          megafarmer_ii: number | null
          megafarmer_iii: number | null
          pendafarmer_i: number | null
          pendafarmer_ii: number | null
          pendafarmer_iii: number | null
          petafarmer_i: number | null
          petafarmer_ii: number | null
          petafarmer_iii: number | null
          quadafarmer_i: number | null
          quadafarmer_ii: number | null
          quadafarmer_iii: number | null
          snapshot_date: string | null
          terafarmer_i: number | null
          terafarmer_ii: number | null
          terafarmer_iii: number | null
          treidafarmer_i: number | null
          treidafarmer_ii: number | null
          treidafarmer_iii: number | null
          uadafarmer_i: number | null
          uadafarmer_ii: number | null
          uadafarmer_iii: number | null
          vendafarmer_i: number | null
          vendafarmer_ii: number | null
          vendafarmer_iii: number | null
          weccafarmer_i: number | null
          weccafarmer_ii: number | null
          weccafarmer_iii: number | null
          xennafarmer_i: number | null
          xennafarmer_ii: number | null
          xennafarmer_iii: number | null
          yottafarmer_i: number | null
          yottafarmer_ii: number | null
          yottafarmer_iii: number | null
          zettafarmer_i: number | null
          zettafarmer_ii: number | null
          zettafarmer_iii: number | null
        }
        Relationships: []
      }
      weekly_statistics: {
        Row: {
          active_player_count: number | null
          avg_eb: number | null
          avg_pe: number | null
          avg_prestiges: number | null
          avg_se: number | null
          avg_te: number | null
          grade_a: number | null
          grade_aa: number | null
          grade_aaa: number | null
          grade_b: number | null
          grade_c: number | null
          grade_unknown: number | null
          guest_count: number | null
          max_eb: number | null
          max_pe: number | null
          max_prestiges: number | null
          max_se: number | null
          max_te: number | null
          median_eb: number | null
          median_pe: number | null
          median_prestiges: number | null
          median_se: number | null
          median_te: number | null
          player_count: number | null
          snapshot_date: string | null
          total_eb: number | null
          total_pe: number | null
          total_prestiges: number | null
          total_se: number | null
          total_te: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      refresh_materialized_views: { Args: never; Returns: undefined }
      refresh_unique_players_view: { Args: never; Returns: undefined }
      refresh_weekly_statistics: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
