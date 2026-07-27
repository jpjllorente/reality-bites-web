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
      custom_orders: {
        Row: {
          allergens: string | null
          amount_paid_cents: number | null
          budget_range: string | null
          completed_at: string | null
          confirmation_sent_at: string | null
          created_at: string
          deposit_percent: number | null
          email: string
          event_date: string | null
          flavors: string | null
          id: string
          in_store_paid_at: string | null
          message: string | null
          name: string
          order_type: string
          paid_at: string | null
          payment_mode: string | null
          payment_status: string
          payment_token: string | null
          phone: string | null
          quote_notes: string | null
          quote_sent_at: string | null
          quote_total_cents: number | null
          ready_at: string | null
          ready_notified_at: string | null
          servings: number | null
          status: Database["public"]["Enums"]["custom_order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
        }
        Insert: {
          allergens?: string | null
          amount_paid_cents?: number | null
          budget_range?: string | null
          completed_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          deposit_percent?: number | null
          email: string
          event_date?: string | null
          flavors?: string | null
          id?: string
          in_store_paid_at?: string | null
          message?: string | null
          name: string
          order_type: string
          paid_at?: string | null
          payment_mode?: string | null
          payment_status?: string
          payment_token?: string | null
          phone?: string | null
          quote_notes?: string | null
          quote_sent_at?: string | null
          quote_total_cents?: number | null
          ready_at?: string | null
          ready_notified_at?: string | null
          servings?: number | null
          status?: Database["public"]["Enums"]["custom_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          allergens?: string | null
          amount_paid_cents?: number | null
          budget_range?: string | null
          completed_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          deposit_percent?: number | null
          email?: string
          event_date?: string | null
          flavors?: string | null
          id?: string
          in_store_paid_at?: string | null
          message?: string | null
          name?: string
          order_type?: string
          paid_at?: string | null
          payment_mode?: string | null
          payment_status?: string
          payment_token?: string | null
          phone?: string | null
          quote_notes?: string | null
          quote_sent_at?: string | null
          quote_total_cents?: number | null
          ready_at?: string | null
          ready_notified_at?: string | null
          servings?: number | null
          status?: Database["public"]["Enums"]["custom_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          alt: string
          caption: string
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          is_featured: boolean
          sort_order: number
          tag: string
          updated_at: string
        }
        Insert: {
          alt?: string
          caption?: string
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Update: {
          alt?: string
          caption?: string
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      pro_customers: {
        Row: {
          address_line1: string
          address_line2: string | null
          billing_email: string
          city: string
          contact_name: string | null
          country: string
          created_at: string
          default_payment_method_id: string | null
          discount_percent: number
          id: string
          is_active: boolean
          legal_name: string
          notes: string | null
          payment_terms_days: number
          phone: string | null
          postal_code: string
          province: string | null
          stripe_customer_id: string | null
          tax_id: string
          trade_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          billing_email: string
          city: string
          contact_name?: string | null
          country?: string
          created_at?: string
          default_payment_method_id?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          legal_name: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code: string
          province?: string | null
          stripe_customer_id?: string | null
          tax_id: string
          trade_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          billing_email?: string
          city?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          default_payment_method_id?: string | null
          discount_percent?: number
          id?: string
          is_active?: boolean
          legal_name?: string
          notes?: string | null
          payment_terms_days?: number
          phone?: string | null
          postal_code?: string
          province?: string | null
          stripe_customer_id?: string | null
          tax_id?: string
          trade_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_orders: {
        Row: {
          admin_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          invoiced_at: string | null
          items: Json
          notes: string | null
          paid_at: string | null
          pro_customer_id: string
          requested_delivery_date: string | null
          status: Database["public"]["Enums"]["pro_order_status"]
          stripe_invoice_id: string | null
          stripe_invoice_pdf: string | null
          stripe_invoice_status: string | null
          stripe_invoice_url: string | null
          stripe_payment_intent_id: string | null
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          invoiced_at?: string | null
          items?: Json
          notes?: string | null
          paid_at?: string | null
          pro_customer_id: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["pro_order_status"]
          stripe_invoice_id?: string | null
          stripe_invoice_pdf?: string | null
          stripe_invoice_status?: string | null
          stripe_invoice_url?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          invoiced_at?: string | null
          items?: Json
          notes?: string | null
          paid_at?: string | null
          pro_customer_id?: string
          requested_delivery_date?: string | null
          status?: Database["public"]["Enums"]["pro_order_status"]
          stripe_invoice_id?: string | null
          stripe_invoice_pdf?: string | null
          stripe_invoice_status?: string | null
          stripe_invoice_url?: string | null
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_orders_pro_customer_id_fkey"
            columns: ["pro_customer_id"]
            isOneToOne: false
            referencedRelation: "pro_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string
          in_stock: boolean
          is_active: boolean
          name: string
          portion_price_cents: number | null
          price_cents: number
          seo_description: string
          seo_title: string
          slug: string
          sort_order: number
          stripe_portion_price_id: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          tags: string[]
          tax_rate_percent: number
          updated_at: string
          variants: Json
          visible_pro: boolean
          wholesale_price_cents: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          in_stock?: boolean
          is_active?: boolean
          name: string
          portion_price_cents?: number | null
          price_cents?: number
          seo_description?: string
          seo_title?: string
          slug: string
          sort_order?: number
          stripe_portion_price_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[]
          tax_rate_percent?: number
          updated_at?: string
          variants?: Json
          visible_pro?: boolean
          wholesale_price_cents?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          in_stock?: boolean
          is_active?: boolean
          name?: string
          portion_price_cents?: number | null
          price_cents?: number
          seo_description?: string
          seo_title?: string
          slug?: string
          sort_order?: number
          stripe_portion_price_id?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tags?: string[]
          tax_rate_percent?: number
          updated_at?: string
          variants?: Json
          visible_pro?: boolean
          wholesale_price_cents?: number | null
        }
        Relationships: []
      }
      shop_orders: {
        Row: {
          amount_paid_cents: number | null
          amount_refunded_cents: number | null
          cancellation_notified_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_sent_at: string | null
          created_at: string
          email: string | null
          failure_notified_at: string | null
          id: string
          in_store_paid_at: string | null
          items: Json
          name: string
          notes: string | null
          notification_sent_at: string | null
          payment_confirmed_at: string | null
          payment_failed_at: string | null
          payment_failure_reason: string | null
          payment_status: string
          phone: string
          refund_notified_at: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["shop_order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_cents: number
        }
        Insert: {
          amount_paid_cents?: number | null
          amount_refunded_cents?: number | null
          cancellation_notified_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email?: string | null
          failure_notified_at?: string | null
          id?: string
          in_store_paid_at?: string | null
          items: Json
          name: string
          notes?: string | null
          notification_sent_at?: string | null
          payment_confirmed_at?: string | null
          payment_failed_at?: string | null
          payment_failure_reason?: string | null
          payment_status?: string
          phone: string
          refund_notified_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["shop_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_cents: number
        }
        Update: {
          amount_paid_cents?: number | null
          amount_refunded_cents?: number | null
          cancellation_notified_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          email?: string | null
          failure_notified_at?: string | null
          id?: string
          in_store_paid_at?: string | null
          items?: Json
          name?: string
          notes?: string | null
          notification_sent_at?: string | null
          payment_confirmed_at?: string | null
          payment_failed_at?: string | null
          payment_failure_reason?: string | null
          payment_status?: string
          phone?: string
          refund_notified_at?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["shop_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_cents?: number
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          environment: string
          error: string | null
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
        }
        Insert: {
          environment: string
          error?: string | null
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
        }
        Update: {
          environment?: string
          error?: string | null
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      is_admin: { Args: never; Returns: boolean }
      is_pro: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "pro"
      custom_order_status:
        | "new"
        | "reviewing"
        | "confirmed"
        | "declined"
        | "completed"
      pro_order_status:
        | "nuevo"
        | "confirmado"
        | "facturado"
        | "pagado"
        | "entregado"
        | "cancelado"
      shop_order_status:
        | "new"
        | "contacted"
        | "confirmed"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "pro"],
      custom_order_status: [
        "new",
        "reviewing",
        "confirmed",
        "declined",
        "completed",
      ],
      pro_order_status: [
        "nuevo",
        "confirmado",
        "facturado",
        "pagado",
        "entregado",
        "cancelado",
      ],
      shop_order_status: [
        "new",
        "contacted",
        "confirmed",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
