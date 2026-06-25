/**
 * Admin-only endpoint: create an auth user with a given role.
 * Caller MUST be authenticated as an admin (verified via Bearer token).
 */

import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";
import { z } from "zod";

const BodySchema = z.object({
  nom: z.string().trim().min(1, "Nom requis").max(120),
  email: z.string().trim().toLowerCase().email("Email invalide").max(255),
  telephone: z
    .string()
    .trim()
    .max(32)
    .regex(/^[+0-9 ()-]*$/, "Téléphone invalide")
    .optional()
    .default(""),
  role: z.enum(["admin", "expert", "vendeur", "acheteur"]),
  password: z.string().min(8).max(128).optional(),
});

export const Route = createFileRoute("/api/public/admin-create-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ ok: false, error: "Non autorisé" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Verify caller is admin
        const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userRes.user) return json({ ok: false, error: "Session invalide" }, 401);
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return json({ ok: false, error: "Réservé aux administrateurs" }, 403);

        // 2. Parse + validate body with Zod
        let raw: unknown;
        try { raw = await request.json(); }
        catch { return json({ ok: false, error: "Body invalide" }, 400); }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide" }, 400);
        }
        const { nom, email, telephone, role, password: providedPwd } = parsed.data;

        // 3. Idempotency — refuse if email already exists
        const { data: list } = await supabaseAdmin.auth.admin.listUsers();
        if (list?.users.some((u) => u.email?.toLowerCase() === email)) {
          return json({ ok: false, error: "Un compte existe déjà avec cet email" }, 409);
        }

        // 4. Create auth user — trigger handle_new_user creates profile + role
        const password = providedPwd ?? randomBytes(12).toString("base64url") + "A1!";
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nom, telephone, role, actif: true },
        });
        if (createErr || !created.user) return json({ ok: false, error: createErr?.message ?? "Création impossible" }, 500);

        // 5. Patch telephone on profile (trigger may have set it from metadata already)
        if (telephone) {
          await supabaseAdmin.from("profiles").update({ telephone }).eq("user_id", created.user.id);
        }

        return json({ ok: true, userId: created.user.id, tempPassword: password }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
