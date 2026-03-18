import "server-only";
import { type SupabaseClient } from "@supabase/supabase-js";
import { adminDb } from "@/lib/supabase-admin";

export type Role = "client" | "accountant";

export interface CreateClientParams {
  email:       string;
  password:    string;
  companyName: string;
  sheetId?:    string;
  sheetRange?: string;
}

export interface CreateAccountantParams {
  email:    string;
  password: string;
  fullName: string;
}

export interface UserResult {
  success:  boolean;
  userId?:  string;
  error?:   string;
}

export class UserManager {
  private static instance: UserManager;
  private db: SupabaseClient;

  private constructor() {
    this.db = adminDb;
  }

  static getInstance(): UserManager {
    return (UserManager.instance ??= new UserManager());
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Fetches current app_metadata then merges — prevents field loss on partial updates
  private async _mergeMeta(id: string, patch: Record<string, unknown>) {
    const { data } = await this.db.auth.admin.getUserById(id);
    const current  = data.user?.app_metadata ?? {};
    return this.db.auth.admin.updateUserById(id, {
      app_metadata: { ...current, ...patch },
    });
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  private async _create(
    email:   string,
    pass:    string,
    role:    Role,
    profile: Record<string, unknown>
  ): Promise<UserResult> {
    if (pass.length < 10) return { success: false, error: "Password too short" };

    const { data, error: aErr } = await this.db.auth.admin.createUser({
      email, password: pass, email_confirm: true,
      app_metadata:  { role, active: true },
      user_metadata: profile,
    });

    if (aErr || !data.user) return { success: false, error: aErr?.message ?? "Auth failed" };

    const { error: dbErr } = await this.db.from("profiles").insert({
      id: data.user.id, email, role, active: true, ...profile,
    });

    if (dbErr) {
      await this.db.auth.admin.deleteUser(data.user.id);
      return { success: false, error: "Profile sync failed — user rolled back" };
    }

    return { success: true, userId: data.user.id };
  }

  createClient(p: CreateClientParams): Promise<UserResult> {
    return this._create(p.email, p.password, "client", {
      company_name: p.companyName,
      sheet_id:     p.sheetId    ?? null,
      sheet_range:  p.sheetRange ?? "expenses!B3:F1000",
    });
  }

  createAccountant(p: CreateAccountantParams): Promise<UserResult> {
    return this._create(p.email, p.password, "accountant", {
      full_name: p.fullName,
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  // Merges { active } into existing metadata — role is preserved
  async setStatus(id: string, active: boolean): Promise<UserResult> {
    const [{ error: aErr }, { error: pErr }] = await Promise.all([
      this._mergeMeta(id, { active }),
      this.db.from("profiles").update({ active }).eq("id", id),
    ]);
    const error = aErr?.message ?? pErr?.message;
    return { success: !error, error };
  }

  // Merges { role } into existing metadata — active is preserved
  async updateRole(id: string, role: Role): Promise<UserResult> {
    const [{ error: aErr }, { error: pErr }] = await Promise.all([
      this._mergeMeta(id, { role }),
      this.db.from("profiles").update({ role }).eq("id", id),
    ]);
    const error = aErr?.message ?? pErr?.message;
    return { success: !error, error };
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async deleteUser(id: string): Promise<UserResult> {
    const { error } = await this.db.auth.admin.deleteUser(id);
    return { success: !error, error: error?.message };
  }

  // ── Sheet ──────────────────────────────────────────────────────────────────
  async updateSheet(id: string, sheetId: string, sheetRange?: string): Promise<UserResult> {
    const { error } = await this.db.from("profiles").update({
      sheet_id:    sheetId,
      sheet_range: sheetRange ?? "expenses!B3:F1000",
    }).eq("id", id);
    return { success: !error, error: error?.message };
  }
}

export const userManager = UserManager.getInstance();