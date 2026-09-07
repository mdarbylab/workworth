// Generated from the live Supabase project (btfmiviujsftuxzxslwt) via the MCP
// generate_typescript_types tool. Regenerate when the schema changes.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          organization_id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          organization_id: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          organization_id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          id: string
          job_id: string | null
          organization_id: string
          receipt_path: string | null
          spent_on: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          organization_id: string
          receipt_path?: string | null
          spent_on?: string
          updated_at?: string
          user_id: string | null
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          organization_id?: string
          receipt_path?: string | null
          spent_on?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          organization_id: string
          quantity: number
          total_cents: number
          unit_cents: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          organization_id: string
          quantity?: number
          total_cents?: number
          unit_cents?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          quantity?: number
          total_cents?: number
          unit_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          due_on: string | null
          id: string
          issued_on: string | null
          job_id: string | null
          number: string | null
          organization_id: string
          status: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          issued_on?: string | null
          job_id?: string | null
          number?: string | null
          organization_id: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          due_on?: string | null
          id?: string
          issued_on?: string | null
          job_id?: string | null
          number?: string | null
          organization_id?: string
          status?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          billing_type: Database["public"]["Enums"]["billing_type"]
          client_id: string | null
          created_at: string
          estimated_minutes: number | null
          fixed_price_cents: number | null
          hourly_rate_cents: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id?: string | null
          created_at?: string
          estimated_minutes?: number | null
          fixed_price_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id?: string | null
          created_at?: string
          estimated_minutes?: number | null
          fixed_price_cents?: number | null
          hourly_rate_cents?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_token: string | null
          invited_email: string | null
          organization_id: string
          removed_at: string | null
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          organization_id: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          organization_id?: string
          removed_at?: string | null
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          currency: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["plan_type"]
          seat_limit: number
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["plan_type"]
          seat_limit?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          seat_limit?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          job_id: string
          notes: string | null
          organization_id: string
          source: Database["public"]["Enums"]["time_source"]
          started_at: string
          stopped_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          job_id: string
          notes?: string | null
          organization_id: string
          source?: Database["public"]["Enums"]["time_source"]
          started_at: string
          stopped_at?: string | null
          updated_at?: string
          user_id: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          job_id?: string
          notes?: string | null
          organization_id?: string
          source?: Database["public"]["Enums"]["time_source"]
          started_at?: string
          stopped_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { token: string }; Returns: string }
      auth_is_owner: { Args: never; Returns: boolean }
      auth_org_id: { Args: never; Returns: string }
      create_organization: {
        Args: { org_name: string; org_timezone?: string }
        Returns: string
      }
      delete_account: { Args: never; Returns: undefined }
      invite_preview: {
        Args: { token: string }
        Returns: {
          organization_name: string
          invited_email: string
          state: string
        }[]
      }
    }
    Enums: {
      billing_type: "hourly" | "fixed"
      expense_category:
        | "materials"
        | "fuel"
        | "tools"
        | "supplies"
        | "software"
        | "subcontractor"
        | "other"
      job_status: "active" | "archived"
      membership_role: "owner" | "member"
      plan_type: "free" | "pro"
      time_source: "timer" | "manual"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_type: ["hourly", "fixed"],
      expense_category: [
        "materials",
        "fuel",
        "tools",
        "supplies",
        "software",
        "subcontractor",
        "other",
      ],
      job_status: ["active", "archived"],
      membership_role: ["owner", "member"],
      plan_type: ["free", "pro"],
      time_source: ["timer", "manual"],
    },
  },
} as const
