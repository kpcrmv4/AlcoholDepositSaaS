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
      ae_profiles: {
        Row: {
          bank_account_name: string | null
          bank_account_no: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          nickname: string | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          nickname?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean | null
          body: string | null
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          image_url: string | null
          push_sent_at: string | null
          send_push: boolean | null
          start_date: string | null
          store_id: string | null
          target_audience: string | null
          tenant_id: string
          title: string
          type: string | null
        }
        Insert: {
          active?: boolean | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          push_sent_at?: string | null
          send_push?: boolean | null
          start_date?: string | null
          store_id?: string | null
          target_audience?: string | null
          tenant_id: string
          title: string
          type?: string | null
        }
        Update: {
          active?: boolean | null
          body?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          push_sent_at?: string | null
          send_push?: boolean | null
          start_date?: string | null
          store_id?: string | null
          target_audience?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          type: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          type?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          type?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          store_id: string | null
          table_name: string | null
          tenant_id: string
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          store_id?: string | null
          table_name?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          store_id?: string | null
          table_name?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      borrow_items: {
        Row: {
          approved_quantity: number | null
          borrow_id: string | null
          category: string | null
          id: string
          notes: string | null
          product_name: string
          quantity: number
          unit: string | null
        }
        Insert: {
          approved_quantity?: number | null
          borrow_id?: string | null
          category?: string | null
          id?: string
          notes?: string | null
          product_name: string
          quantity: number
          unit?: string | null
        }
        Update: {
          approved_quantity?: number | null
          borrow_id?: string | null
          category?: string | null
          id?: string
          notes?: string | null
          product_name?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "borrow_items_borrow_id_fkey"
            columns: ["borrow_id"]
            isOneToOne: false
            referencedRelation: "borrows"
            referencedColumns: ["id"]
          },
        ]
      }
      borrows: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          borrow_code: string | null
          borrower_photo_url: string | null
          borrower_pos_bill_url: string | null
          borrower_pos_confirmed: boolean | null
          borrower_pos_confirmed_at: string | null
          borrower_pos_confirmed_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string | null
          from_store_id: string
          id: string
          lender_photo_url: string | null
          lender_pos_bill_url: string | null
          lender_pos_confirmed: boolean | null
          lender_pos_confirmed_at: string | null
          lender_pos_confirmed_by: string | null
          notes: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string | null
          return_confirmed_at: string | null
          return_confirmed_by: string | null
          return_notes: string | null
          return_photo_url: string | null
          return_receipt_photo_url: string | null
          return_received_at: string | null
          return_received_by: string | null
          status: Database["public"]["Enums"]["borrow_status"] | null
          tenant_id: string
          to_store_id: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          borrow_code?: string | null
          borrower_photo_url?: string | null
          borrower_pos_bill_url?: string | null
          borrower_pos_confirmed?: boolean | null
          borrower_pos_confirmed_at?: string | null
          borrower_pos_confirmed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_store_id: string
          id?: string
          lender_photo_url?: string | null
          lender_pos_bill_url?: string | null
          lender_pos_confirmed?: boolean | null
          lender_pos_confirmed_at?: string | null
          lender_pos_confirmed_by?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          return_confirmed_at?: string | null
          return_confirmed_by?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          return_receipt_photo_url?: string | null
          return_received_at?: string | null
          return_received_by?: string | null
          status?: Database["public"]["Enums"]["borrow_status"] | null
          tenant_id: string
          to_store_id: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          borrow_code?: string | null
          borrower_photo_url?: string | null
          borrower_pos_bill_url?: string | null
          borrower_pos_confirmed?: boolean | null
          borrower_pos_confirmed_at?: string | null
          borrower_pos_confirmed_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          from_store_id?: string
          id?: string
          lender_photo_url?: string | null
          lender_pos_bill_url?: string | null
          lender_pos_confirmed?: boolean | null
          lender_pos_confirmed_at?: string | null
          lender_pos_confirmed_by?: string | null
          notes?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          return_confirmed_at?: string | null
          return_confirmed_by?: string | null
          return_notes?: string | null
          return_photo_url?: string | null
          return_receipt_photo_url?: string | null
          return_received_at?: string | null
          return_received_by?: string | null
          status?: Database["public"]["Enums"]["borrow_status"] | null
          tenant_id?: string
          to_store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "borrows_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_borrower_pos_confirmed_by_fkey"
            columns: ["borrower_pos_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_lender_pos_confirmed_by_fkey"
            columns: ["lender_pos_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_return_confirmed_by_fkey"
            columns: ["return_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_return_received_by_fkey"
            columns: ["return_received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "borrows_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          id: string
          joined_at: string | null
          last_read_at: string | null
          muted: boolean
          role: Database["public"]["Enums"]["chat_member_role"]
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean
          role?: Database["public"]["Enums"]["chat_member_role"]
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean
          role?: Database["public"]["Enums"]["chat_member_role"]
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          archived_at: string | null
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          room_id: string
          sender_id: string | null
          type: Database["public"]["Enums"]["chat_message_type"]
        }
        Insert: {
          archived_at?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id: string
          sender_id?: string | null
          type?: Database["public"]["Enums"]["chat_message_type"]
        }
        Update: {
          archived_at?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          room_id?: string
          sender_id?: string | null
          type?: Database["public"]["Enums"]["chat_message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_pinned_messages: {
        Row: {
          id: string
          message_id: string
          pinned_at: string
          pinned_by: string
          room_id: string
        }
        Insert: {
          id?: string
          message_id: string
          pinned_at?: string
          pinned_by: string
          room_id: string
        }
        Update: {
          id?: string
          message_id?: string
          pinned_at?: string
          pinned_by?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          pinned_summary: Json | null
          store_id: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["chat_room_type"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pinned_summary?: Json | null
          store_id?: string | null
          tenant_id: string
          type?: Database["public"]["Enums"]["chat_room_type"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pinned_summary?: Json | null
          store_id?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["chat_room_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          ae_id: string | null
          bill_date: string
          bottle_count: number | null
          bottle_rate: number | null
          commission_amount: number | null
          commission_rate: number
          created_at: string
          created_by: string | null
          id: string
          net_amount: number
          notes: string | null
          payment_id: string | null
          receipt_no: string | null
          receipt_photo_url: string | null
          staff_id: string | null
          store_id: string
          subtotal_amount: number | null
          table_no: string | null
          tax_amount: number | null
          tax_rate: number
          tenant_id: string
          type: Database["public"]["Enums"]["commission_type"]
          updated_at: string
        }
        Insert: {
          ae_id?: string | null
          bill_date: string
          bottle_count?: number | null
          bottle_rate?: number | null
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          net_amount: number
          notes?: string | null
          payment_id?: string | null
          receipt_no?: string | null
          receipt_photo_url?: string | null
          staff_id?: string | null
          store_id: string
          subtotal_amount?: number | null
          table_no?: string | null
          tax_amount?: number | null
          tax_rate?: number
          tenant_id: string
          type: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
        }
        Update: {
          ae_id?: string | null
          bill_date?: string
          bottle_count?: number | null
          bottle_rate?: number | null
          commission_amount?: number | null
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          net_amount?: number
          notes?: string | null
          payment_id?: string | null
          receipt_no?: string | null
          receipt_photo_url?: string | null
          staff_id?: string | null
          store_id?: string
          subtotal_amount?: number | null
          table_no?: string | null
          tax_amount?: number | null
          tax_rate?: number
          tenant_id?: string
          type?: Database["public"]["Enums"]["commission_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_ae_id_fkey"
            columns: ["ae_id"]
            isOneToOne: false
            referencedRelation: "ae_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "commission_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payments: {
        Row: {
          ae_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          id: string
          month: string
          notes: string | null
          paid_at: string
          paid_by: string | null
          slip_photo_url: string | null
          staff_id: string | null
          status: string
          store_id: string
          tenant_id: string
          total_amount: number
          total_entries: number
          type: Database["public"]["Enums"]["commission_type"]
        }
        Insert: {
          ae_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          month: string
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          slip_photo_url?: string | null
          staff_id?: string | null
          status?: string
          store_id: string
          tenant_id: string
          total_amount?: number
          total_entries?: number
          type: Database["public"]["Enums"]["commission_type"]
        }
        Update: {
          ae_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          month?: string
          notes?: string | null
          paid_at?: string
          paid_by?: string | null
          slip_photo_url?: string | null
          staff_id?: string | null
          status?: string
          store_id?: string
          tenant_id?: string
          total_amount?: number
          total_entries?: number
          type?: Database["public"]["Enums"]["commission_type"]
        }
        Relationships: [
          {
            foreignKeyName: "commission_payments_ae_id_fkey"
            columns: ["ae_id"]
            isOneToOne: false
            referencedRelation: "ae_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          approval_status: string | null
          approved_by: string | null
          comp_date: string
          created_at: string | null
          diff_percent: number | null
          difference: number | null
          explained_by: string | null
          explanation: string | null
          id: string
          manual_quantity: number | null
          owner_notes: string | null
          pos_quantity: number | null
          product_code: string
          product_name: string | null
          status: Database["public"]["Enums"]["comparison_status"] | null
          store_id: string
          tenant_id: string
        }
        Insert: {
          approval_status?: string | null
          approved_by?: string | null
          comp_date: string
          created_at?: string | null
          diff_percent?: number | null
          difference?: number | null
          explained_by?: string | null
          explanation?: string | null
          id?: string
          manual_quantity?: number | null
          owner_notes?: string | null
          pos_quantity?: number | null
          product_code: string
          product_name?: string | null
          status?: Database["public"]["Enums"]["comparison_status"] | null
          store_id: string
          tenant_id: string
        }
        Update: {
          approval_status?: string | null
          approved_by?: string | null
          comp_date?: string
          created_at?: string | null
          diff_percent?: number | null
          difference?: number | null
          explained_by?: string | null
          explanation?: string | null
          id?: string
          manual_quantity?: number | null
          owner_notes?: string | null
          pos_quantity?: number | null
          product_code?: string
          product_name?: string | null
          status?: Database["public"]["Enums"]["comparison_status"] | null
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_explained_by_fkey"
            columns: ["explained_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          customer_photo_url: string | null
          id: string
          line_user_id: string
          notes: string | null
          product_name: string | null
          quantity: number | null
          status: string | null
          store_id: string
          table_number: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_photo_url?: string | null
          id?: string
          line_user_id: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          store_id: string
          table_number?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          customer_photo_url?: string | null
          id?: string
          line_user_id?: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          status?: string | null
          store_id?: string
          table_number?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          category: string | null
          confirm_photo_url: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_photo_url: string | null
          deposit_code: string
          expiry_date: string | null
          id: string
          is_no_deposit: boolean | null
          is_vip: boolean | null
          line_user_id: string | null
          notes: string | null
          photo_url: string | null
          product_name: string
          quantity: number
          received_by: string | null
          received_photo_url: string | null
          remaining_percent: number | null
          remaining_qty: number
          status: Database["public"]["Enums"]["deposit_status"] | null
          store_id: string
          table_number: string | null
          tenant_id: string
        }
        Insert: {
          category?: string | null
          confirm_photo_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_photo_url?: string | null
          deposit_code: string
          expiry_date?: string | null
          id?: string
          is_no_deposit?: boolean | null
          is_vip?: boolean | null
          line_user_id?: string | null
          notes?: string | null
          photo_url?: string | null
          product_name: string
          quantity: number
          received_by?: string | null
          received_photo_url?: string | null
          remaining_percent?: number | null
          remaining_qty: number
          status?: Database["public"]["Enums"]["deposit_status"] | null
          store_id: string
          table_number?: string | null
          tenant_id: string
        }
        Update: {
          category?: string | null
          confirm_photo_url?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_photo_url?: string | null
          deposit_code?: string
          expiry_date?: string | null
          id?: string
          is_no_deposit?: boolean | null
          is_vip?: boolean | null
          line_user_id?: string | null
          notes?: string | null
          photo_url?: string | null
          product_name?: string
          quantity?: number
          received_by?: string | null
          received_photo_url?: string | null
          remaining_percent?: number | null
          remaining_qty?: number
          status?: Database["public"]["Enums"]["deposit_status"] | null
          store_id?: string
          table_number?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hq_deposits: {
        Row: {
          category: string | null
          created_at: string | null
          customer_name: string | null
          deposit_code: string | null
          deposit_id: string | null
          from_store_id: string | null
          id: string
          notes: string | null
          product_name: string | null
          quantity: number | null
          received_at: string | null
          received_by: string | null
          received_photo_url: string | null
          status: Database["public"]["Enums"]["hq_deposit_status"] | null
          tenant_id: string
          transfer_id: string | null
          withdrawal_notes: string | null
          withdrawn_at: string | null
          withdrawn_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          customer_name?: string | null
          deposit_code?: string | null
          deposit_id?: string | null
          from_store_id?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          received_at?: string | null
          received_by?: string | null
          received_photo_url?: string | null
          status?: Database["public"]["Enums"]["hq_deposit_status"] | null
          tenant_id: string
          transfer_id?: string | null
          withdrawal_notes?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          customer_name?: string | null
          deposit_code?: string | null
          deposit_id?: string | null
          from_store_id?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          quantity?: number | null
          received_at?: string | null
          received_by?: string | null
          received_photo_url?: string | null
          status?: Database["public"]["Enums"]["hq_deposit_status"] | null
          tenant_id?: string
          transfer_id?: string | null
          withdrawal_notes?: string | null
          withdrawn_at?: string | null
          withdrawn_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hq_deposits_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hq_deposits_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hq_deposits_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hq_deposits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hq_deposits_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hq_deposits_withdrawn_by_fkey"
            columns: ["withdrawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_counts: {
        Row: {
          count_date: string
          count_quantity: number
          created_at: string | null
          id: string
          notes: string | null
          product_code: string
          store_id: string
          tenant_id: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          count_date: string
          count_quantity: number
          created_at?: string | null
          id?: string
          notes?: string | null
          product_code: string
          store_id: string
          tenant_id: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          count_date?: string
          count_quantity?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          product_code?: string
          store_id?: string
          tenant_id?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_counts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_counts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          id: string
          line_enabled: boolean | null
          notify_approval_request: boolean | null
          notify_deposit_confirmed: boolean | null
          notify_expiry_warning: boolean | null
          notify_promotions: boolean | null
          notify_stock_alert: boolean | null
          notify_withdrawal_completed: boolean | null
          pwa_enabled: boolean | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_enabled?: boolean | null
          notify_approval_request?: boolean | null
          notify_deposit_confirmed?: boolean | null
          notify_expiry_warning?: boolean | null
          notify_promotions?: boolean | null
          notify_stock_alert?: boolean | null
          notify_withdrawal_completed?: boolean | null
          pwa_enabled?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          line_enabled?: boolean | null
          notify_approval_request?: boolean | null
          notify_deposit_confirmed?: boolean | null
          notify_expiry_warning?: boolean | null
          notify_promotions?: boolean | null
          notify_stock_alert?: boolean | null
          notify_withdrawal_completed?: boolean | null
          pwa_enabled?: boolean | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          store_id: string | null
          tenant_id: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          store_id?: string | null
          tenant_id: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          store_id?: string | null
          tenant_id?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_items: {
        Row: {
          confidence: number | null
          id: string
          notes: string | null
          ocr_log_id: string | null
          product_code: string | null
          product_name: string | null
          qty_ocr: number | null
          status: string | null
          unit: string | null
        }
        Insert: {
          confidence?: number | null
          id?: string
          notes?: string | null
          ocr_log_id?: string | null
          product_code?: string | null
          product_name?: string | null
          qty_ocr?: number | null
          status?: string | null
          unit?: string | null
        }
        Update: {
          confidence?: number | null
          id?: string
          notes?: string | null
          ocr_log_id?: string | null
          product_code?: string | null
          product_name?: string | null
          qty_ocr?: number | null
          status?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_items_ocr_log_id_fkey"
            columns: ["ocr_log_id"]
            isOneToOne: false
            referencedRelation: "ocr_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_logs: {
        Row: {
          count_items: number | null
          file_urls: string[] | null
          id: string
          processed_items: number | null
          status: string | null
          store_id: string
          tenant_id: string
          upload_date: string | null
          upload_method: string | null
        }
        Insert: {
          count_items?: number | null
          file_urls?: string[] | null
          id?: string
          processed_items?: number | null
          status?: string | null
          store_id: string
          tenant_id: string
          upload_date?: string | null
          upload_method?: string | null
        }
        Update: {
          count_items?: number | null
          file_urls?: string[] | null
          id?: string
          processed_items?: number | null
          status?: string | null
          store_id?: string
          tenant_id?: string
          upload_date?: string | null
          upload_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      penalties: {
        Row: {
          amount: number | null
          approved_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          reason: string | null
          staff_id: string | null
          status: string | null
          store_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          staff_id?: string | null
          status?: string | null
          store_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          active: boolean
          created_at: string | null
          created_by: string | null
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["platform_admin_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["platform_admin_role"]
        }
        Update: {
          active?: boolean
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_admin_role"]
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      print_queue: {
        Row: {
          copies: number | null
          created_at: string | null
          deposit_id: string | null
          error_message: string | null
          id: string
          job_type: Database["public"]["Enums"]["print_job_type"]
          payload: Json
          printed_at: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["print_job_status"]
          store_id: string
          tenant_id: string
        }
        Insert: {
          copies?: number | null
          created_at?: string | null
          deposit_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["print_job_type"]
          payload: Json
          printed_at?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["print_job_status"]
          store_id: string
          tenant_id: string
        }
        Update: {
          copies?: number | null
          created_at?: string | null
          deposit_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["print_job_type"]
          payload?: Json
          printed_at?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["print_job_status"]
          store_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_queue_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      print_server_status: {
        Row: {
          created_at: string | null
          error_message: string | null
          hostname: string | null
          id: string
          is_online: boolean | null
          jobs_printed_today: number | null
          last_heartbeat: string | null
          printer_name: string | null
          printer_status: string | null
          server_version: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          hostname?: string | null
          id?: string
          is_online?: boolean | null
          jobs_printed_today?: number | null
          last_heartbeat?: string | null
          printer_name?: string | null
          printer_status?: string | null
          server_version?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          hostname?: string | null
          id?: string
          is_online?: boolean | null
          jobs_printed_today?: number | null
          last_heartbeat?: string | null
          printer_name?: string | null
          printer_status?: string | null
          server_version?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "print_server_status_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          category: string | null
          count_status: string
          created_at: string | null
          id: string
          price: number | null
          product_code: string
          product_name: string
          size: string | null
          store_id: string
          tenant_id: string
          unit: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          count_status?: string
          created_at?: string | null
          id?: string
          price?: number | null
          product_code: string
          product_name: string
          size?: string | null
          store_id: string
          tenant_id: string
          unit?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          count_status?: string
          created_at?: string | null
          id?: string
          price?: number | null
          product_code?: string
          product_name?: string
          size?: string | null
          store_id?: string
          tenant_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          display_name: string | null
          id: string
          line_user_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          username: string
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id: string
          line_user_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          username: string
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          display_name?: string | null
          id?: string
          line_user_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean | null
          created_at: string | null
          device_name: string | null
          id: string
          subscription: Json
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          subscription: Json
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          device_name?: string | null
          id?: string
          subscription?: Json
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          enabled: boolean
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          permission_key: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          permission_key?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_features: {
        Row: {
          enabled: boolean
          feature_key: string
          store_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          feature_key: string
          store_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          store_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_features_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_features_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          chat_bot_borrow_enabled: boolean
          chat_bot_daily_summary_enabled: boolean
          chat_bot_deposit_enabled: boolean
          chat_bot_priority_borrow: string
          chat_bot_priority_deposit: string
          chat_bot_priority_stock: string
          chat_bot_priority_transfer: string
          chat_bot_priority_withdrawal: string
          chat_bot_stock_enabled: boolean
          chat_bot_timeout_borrow: number
          chat_bot_timeout_deposit: number
          chat_bot_timeout_stock: number
          chat_bot_timeout_transfer: number
          chat_bot_timeout_withdrawal: number
          chat_bot_transfer_enabled: boolean
          chat_bot_withdrawal_enabled: boolean
          customer_notify_channels: string[] | null
          customer_notify_deposit_enabled: boolean | null
          customer_notify_expiry_days: number | null
          customer_notify_expiry_enabled: boolean | null
          customer_notify_promotion_enabled: boolean | null
          customer_notify_withdrawal_enabled: boolean | null
          daily_reminder_enabled: boolean | null
          deposit_duration_days: number
          diff_tolerance: number | null
          follow_up_enabled: boolean | null
          id: string
          line_notify_enabled: boolean | null
          notify_days: string[] | null
          notify_time_daily: string | null
          print_server_account_id: string | null
          print_server_working_hours: Json | null
          receipt_settings: Json | null
          staff_registration_code: string | null
          store_id: string
          withdrawal_blocked_days: string[] | null
        }
        Insert: {
          chat_bot_borrow_enabled?: boolean
          chat_bot_daily_summary_enabled?: boolean
          chat_bot_deposit_enabled?: boolean
          chat_bot_priority_borrow?: string
          chat_bot_priority_deposit?: string
          chat_bot_priority_stock?: string
          chat_bot_priority_transfer?: string
          chat_bot_priority_withdrawal?: string
          chat_bot_stock_enabled?: boolean
          chat_bot_timeout_borrow?: number
          chat_bot_timeout_deposit?: number
          chat_bot_timeout_stock?: number
          chat_bot_timeout_transfer?: number
          chat_bot_timeout_withdrawal?: number
          chat_bot_transfer_enabled?: boolean
          chat_bot_withdrawal_enabled?: boolean
          customer_notify_channels?: string[] | null
          customer_notify_deposit_enabled?: boolean | null
          customer_notify_expiry_days?: number | null
          customer_notify_expiry_enabled?: boolean | null
          customer_notify_promotion_enabled?: boolean | null
          customer_notify_withdrawal_enabled?: boolean | null
          daily_reminder_enabled?: boolean | null
          deposit_duration_days?: number
          diff_tolerance?: number | null
          follow_up_enabled?: boolean | null
          id?: string
          line_notify_enabled?: boolean | null
          notify_days?: string[] | null
          notify_time_daily?: string | null
          print_server_account_id?: string | null
          print_server_working_hours?: Json | null
          receipt_settings?: Json | null
          staff_registration_code?: string | null
          store_id: string
          withdrawal_blocked_days?: string[] | null
        }
        Update: {
          chat_bot_borrow_enabled?: boolean
          chat_bot_daily_summary_enabled?: boolean
          chat_bot_deposit_enabled?: boolean
          chat_bot_priority_borrow?: string
          chat_bot_priority_deposit?: string
          chat_bot_priority_stock?: string
          chat_bot_priority_transfer?: string
          chat_bot_priority_withdrawal?: string
          chat_bot_stock_enabled?: boolean
          chat_bot_timeout_borrow?: number
          chat_bot_timeout_deposit?: number
          chat_bot_timeout_stock?: number
          chat_bot_timeout_transfer?: number
          chat_bot_timeout_withdrawal?: number
          chat_bot_transfer_enabled?: boolean
          chat_bot_withdrawal_enabled?: boolean
          customer_notify_channels?: string[] | null
          customer_notify_deposit_enabled?: boolean | null
          customer_notify_expiry_days?: number | null
          customer_notify_expiry_enabled?: boolean | null
          customer_notify_promotion_enabled?: boolean | null
          customer_notify_withdrawal_enabled?: boolean | null
          daily_reminder_enabled?: boolean | null
          deposit_duration_days?: number
          diff_tolerance?: number | null
          follow_up_enabled?: boolean | null
          id?: string
          line_notify_enabled?: boolean | null
          notify_days?: string[] | null
          notify_time_daily?: string | null
          print_server_account_id?: string | null
          print_server_working_hours?: Json | null
          receipt_settings?: Json | null
          staff_registration_code?: string | null
          store_id?: string
          withdrawal_blocked_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_print_server_account_id_fkey"
            columns: ["print_server_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          active: boolean | null
          bar_notify_group_id: string | null
          borrow_notification_roles: string[] | null
          created_at: string | null
          deposit_notify_group_id: string | null
          id: string
          is_central: boolean | null
          line_channel_id: string | null
          line_channel_secret: string | null
          line_token: string | null
          manager_id: string | null
          stock_notify_group_id: string | null
          store_code: string
          store_name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean | null
          bar_notify_group_id?: string | null
          borrow_notification_roles?: string[] | null
          created_at?: string | null
          deposit_notify_group_id?: string | null
          id?: string
          is_central?: boolean | null
          line_channel_id?: string | null
          line_channel_secret?: string | null
          line_token?: string | null
          manager_id?: string | null
          stock_notify_group_id?: string | null
          store_code: string
          store_name: string
          tenant_id: string
        }
        Update: {
          active?: boolean | null
          bar_notify_group_id?: string | null
          borrow_notification_roles?: string[] | null
          created_at?: string | null
          deposit_notify_group_id?: string | null
          id?: string
          is_central?: boolean | null
          line_channel_id?: string | null
          line_channel_secret?: string | null
          line_token?: string | null
          manager_id?: string | null
          stock_notify_group_id?: string | null
          store_code?: string
          store_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          description?: string | null
          key: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          payload: Json | null
          platform_admin_id: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          platform_admin_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json | null
          platform_admin_id?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_audit_logs_platform_admin_id_fkey"
            columns: ["platform_admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          store_ids: string[] | null
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_ids?: string[] | null
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          store_ids?: string[] | null
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          brand_color: string | null
          company_name: string
          contact_email: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string
          legal_name: string | null
          liff_id: string | null
          line_basic_id: string | null
          line_channel_id: string | null
          line_channel_secret: string | null
          line_channel_token: string | null
          line_mode: Database["public"]["Enums"]["line_mode"]
          line_owner_group_id: string | null
          logo_url: string | null
          max_branches: number
          max_users: number
          owner_user_id: string | null
          plan: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          subscription_ends_at: string | null
          suspended_at: string | null
          suspension_reason: string | null
          tax_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          brand_color?: string | null
          company_name: string
          contact_email: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          legal_name?: string | null
          liff_id?: string | null
          line_basic_id?: string | null
          line_channel_id?: string | null
          line_channel_secret?: string | null
          line_channel_token?: string | null
          line_mode?: Database["public"]["Enums"]["line_mode"]
          line_owner_group_id?: string | null
          logo_url?: string | null
          max_branches?: number
          max_users?: number
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subscription_ends_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_color?: string | null
          company_name?: string
          contact_email?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          legal_name?: string | null
          liff_id?: string | null
          line_basic_id?: string | null
          line_channel_id?: string | null
          line_channel_secret?: string | null
          line_channel_token?: string | null
          line_mode?: Database["public"]["Enums"]["line_mode"]
          line_owner_group_id?: string | null
          logo_url?: string | null
          max_branches?: number
          max_users?: number
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subscription_ends_at?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          tax_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fk"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_owner_fk"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          confirm_photo_url: string | null
          confirmed_by: string | null
          created_at: string | null
          deposit_id: string | null
          from_store_id: string
          id: string
          notes: string | null
          photo_url: string | null
          product_name: string | null
          quantity: number | null
          requested_by: string | null
          status: Database["public"]["Enums"]["transfer_status"] | null
          tenant_id: string
          to_store_id: string
        }
        Insert: {
          confirm_photo_url?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deposit_id?: string | null
          from_store_id: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          product_name?: string | null
          quantity?: number | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          tenant_id: string
          to_store_id: string
        }
        Update: {
          confirm_photo_url?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          deposit_id?: string | null
          from_store_id?: string
          id?: string
          notes?: string | null
          photo_url?: string | null
          product_name?: string | null
          quantity?: number | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["transfer_status"] | null
          tenant_id?: string
          to_store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_store_id_fkey"
            columns: ["from_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_store_id_fkey"
            columns: ["to_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          permission: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stores: {
        Row: {
          store_id: string
          user_id: string
        }
        Insert: {
          store_id: string
          user_id: string
        }
        Update: {
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          actual_qty: number | null
          created_at: string | null
          customer_name: string | null
          deposit_id: string | null
          id: string
          line_user_id: string | null
          notes: string | null
          photo_url: string | null
          processed_by: string | null
          product_name: string | null
          requested_qty: number | null
          status: Database["public"]["Enums"]["withdrawal_status"] | null
          store_id: string
          table_number: string | null
          tenant_id: string
          withdrawal_type: string | null
        }
        Insert: {
          actual_qty?: number | null
          created_at?: string | null
          customer_name?: string | null
          deposit_id?: string | null
          id?: string
          line_user_id?: string | null
          notes?: string | null
          photo_url?: string | null
          processed_by?: string | null
          product_name?: string | null
          requested_qty?: number | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          store_id: string
          table_number?: string | null
          tenant_id: string
          withdrawal_type?: string | null
        }
        Update: {
          actual_qty?: number | null
          created_at?: string | null
          customer_name?: string | null
          deposit_id?: string | null
          id?: string
          line_user_id?: string | null
          notes?: string | null
          photo_url?: string | null
          processed_by?: string | null
          product_name?: string | null
          requested_qty?: number | null
          status?: Database["public"]["Enums"]["withdrawal_status"] | null
          store_id?: string
          table_number?: string | null
          tenant_id?: string
          withdrawal_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_deposit_id_fkey"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "deposits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_release_timed_out: { Args: { p_metadata: Json }; Returns: Json }
      bootstrap_super_admin_by_email: {
        Args: { p_email: string }
        Returns: undefined
      }
      claim_action_card: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: Json
      }
      complete_action_card: {
        Args: {
          p_message_id: string
          p_notes?: string
          p_photo_url?: string
          p_user_id: string
        }
        Returns: Json
      }
      get_chat_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          room_id: string
          unread_count: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_store_ids: { Args: never; Returns: string[] }
      get_user_tenant_id: { Args: never; Returns: string }
      has_role_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
      insert_bot_message: {
        Args: {
          p_content: string
          p_metadata?: Json
          p_room_id: string
          p_type: Database["public"]["Enums"]["chat_message_type"]
        }
        Returns: string
      }
      is_action_card_timed_out: { Args: { p_metadata: Json }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_chat_member: { Args: { p_room_id: string }; Returns: boolean }
      is_feature_enabled: {
        Args: { p_feature_key: string; p_store_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      is_print_server_online: { Args: { p_store_id: string }; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      release_action_card: {
        Args: { p_message_id: string; p_user_id: string }
        Returns: Json
      }
      seed_role_permissions_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      borrow_status:
        | "pending_approval"
        | "approved"
        | "pos_adjusting"
        | "completed"
        | "return_pending"
        | "returned"
        | "rejected"
        | "cancelled"
      chat_member_role: "member" | "admin"
      chat_message_type: "text" | "image" | "action_card" | "system"
      chat_room_type: "store" | "direct" | "cross_store"
      commission_type: "ae_commission" | "bottle_commission"
      comparison_status: "pending" | "explained" | "approved" | "rejected"
      deposit_status:
        | "pending_confirm"
        | "in_store"
        | "pending_withdrawal"
        | "withdrawn"
        | "expired"
        | "transferred_out"
      hq_deposit_status: "awaiting_withdrawal" | "withdrawn"
      line_mode: "tenant" | "per_store"
      platform_admin_role: "super_admin" | "admin" | "support" | "readonly"
      print_job_status: "pending" | "printing" | "completed" | "failed"
      print_job_type: "receipt" | "label" | "transfer"
      tenant_plan: "trial" | "starter" | "growth" | "enterprise" | "custom"
      tenant_status: "active" | "suspended" | "trial" | "cancelled"
      transfer_status: "pending" | "confirmed" | "rejected"
      user_role:
        | "owner"
        | "accountant"
        | "manager"
        | "bar"
        | "staff"
        | "customer"
        | "hq"
      withdrawal_status: "pending" | "approved" | "completed" | "rejected"
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
      borrow_status: [
        "pending_approval",
        "approved",
        "pos_adjusting",
        "completed",
        "return_pending",
        "returned",
        "rejected",
        "cancelled",
      ],
      chat_member_role: ["member", "admin"],
      chat_message_type: ["text", "image", "action_card", "system"],
      chat_room_type: ["store", "direct", "cross_store"],
      commission_type: ["ae_commission", "bottle_commission"],
      comparison_status: ["pending", "explained", "approved", "rejected"],
      deposit_status: [
        "pending_confirm",
        "in_store",
        "pending_withdrawal",
        "withdrawn",
        "expired",
        "transferred_out",
      ],
      hq_deposit_status: ["awaiting_withdrawal", "withdrawn"],
      line_mode: ["tenant", "per_store"],
      platform_admin_role: ["super_admin", "admin", "support", "readonly"],
      print_job_status: ["pending", "printing", "completed", "failed"],
      print_job_type: ["receipt", "label", "transfer"],
      tenant_plan: ["trial", "starter", "growth", "enterprise", "custom"],
      tenant_status: ["active", "suspended", "trial", "cancelled"],
      transfer_status: ["pending", "confirmed", "rejected"],
      user_role: [
        "owner",
        "accountant",
        "manager",
        "bar",
        "staff",
        "customer",
        "hq",
      ],
      withdrawal_status: ["pending", "approved", "completed", "rejected"],
    },
  },
} as const

