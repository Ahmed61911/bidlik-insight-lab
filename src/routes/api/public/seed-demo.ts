/**
 * Idempotent demo-account seeder.
 * Creates the 4 demo users (admin / expert / vendeur / acheteur) with the
 * roles attached, using the admin client. Safe to call any number of times.
 *
 * Called by the login page when the user clicks a demo button so the account
 * exists before the sign-in attempt.
 */

import { createFileRoute } from "@tanstack/react-router";

type DemoAccount = {
  email: string;
  password: string;
  role: "admin" | "expert" | "vendeur" | "acheteur";
  nom: string;
};

const DEMO: DemoAccount[] = [
  { email: "admin@bidlic.ma", password: "Admin1234!", role: "admin", nom: "Admin Bidlic" },
  { email: "expert@bidlic.ma", password: "Expert1234!", role: "expert", nom: "Youssef El Amrani" },
  { email: "vendeur@bidlic.ma", password: "Vendeur1234!", role: "vendeur", nom: "Karim Bennani" },
  { email: "acheteur@bidlic.ma", password: "Acheteur1234!", role: "acheteur", nom: "Salma Idrissi" },
];

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const acc of DEMO) {
          // Idempotent create — listUsers and create only when missing.
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const existing = list?.users.find((u) => u.email?.toLowerCase() === acc.email.toLowerCase());

          let userId = existing?.id;
          if (!userId) {
            const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
              email: acc.email,
              password: acc.password,
              email_confirm: true,
              user_metadata: { nom: acc.nom, role: acc.role },
            });
            if (error) {
              return new Response(
                JSON.stringify({ ok: false, error: `create ${acc.email}: ${error.message}` }),
                { status: 500, headers: { "Content-Type": "application/json" } },
              );
            }
            userId = created.user.id;
          } else {
            // Reset password so the demo card credentials always work.
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: acc.password,
              email_confirm: true,
              user_metadata: { nom: acc.nom, role: acc.role },
            });
          }

          // Ensure profile.
          await supabaseAdmin
            .from("profiles")
            .upsert(
              {
                user_id: userId,
                nom: acc.nom,
                email: acc.email,
                caution_validee: acc.role === "acheteur",
              },
              { onConflict: "user_id" },
            );

          // Ensure role.
          await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role: acc.role }, { onConflict: "user_id,role" });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
