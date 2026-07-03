import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMad } from "@/lib/format";
import { useMesPaiements } from "@/lib/supabaseAcheteurStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/acheteur/caution")({
  validateSearch: (s: Record<string, unknown>) => ({
    cmi: s.cmi === "ok" || s.cmi === "fail" ? (s.cmi as "ok" | "fail") : undefined,
  }),
  component: CautionPage,
});

const CAUTION_AMOUNT = 5000;

function CautionPage() {
  const { user } = useAuth();
  const ok = user?.cautionValidee ?? false;
  const paiements = useMesPaiements();
  const cautionPay = paiements.find((p) => p.type === "caution");
  const { cmi } = useSearch({ from: "/acheteur/caution" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cmi === "ok") {
      toast.success("Paiement reçu. Validation en cours…");
    } else if (cmi === "fail") {
      toast.error("Paiement échoué ou annulé.");
    }
  }, [cmi]);

  async function payerCaution() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/public/cmi-init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "caution", amount: CAUTION_AMOUNT }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Impossible d'initier le paiement.");
        setLoading(false);
        return;
      }
      // Auto-submit hidden form to CMI hosted page
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.action;
      form.style.display = "none";
      for (const [k, v] of Object.entries(data.fields as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v ?? "");
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              ok ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive",
            ].join(" ")}
          >
            {ok ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight text-foreground">
              {ok ? "Caution validée" : "Caution requise"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Une caution remboursable de{" "}
              <span className="font-semibold text-foreground">{formatMad(CAUTION_AMOUNT)}</span> est
              nécessaire pour participer aux enchères. Elle vous est restituée intégralement si vous
              ne remportez aucune enchère.
            </p>
            <div className="mt-3">
              {ok ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <Shield className="h-3.5 w-3.5" />
                  Active
                </span>
              ) : (
                <>
                  <Link
                    to="/acheteur/caution-paiement"
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
                  >
                    Déposer ma caution
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Virement, chèque ou espèces — validation manuelle par un administrateur. Paiement par carte bientôt disponible.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Historique des paiements</h3>
        {paiements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun mouvement.</p>
        ) : (
          <>
            <div className="mt-3 space-y-3 sm:hidden">
              {paiements.map((p) => (
                <article key={p.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-foreground">{p.libelle}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {p.reference}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <PayStatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(p.date).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="font-semibold text-foreground">{formatMad(p.montant)}</span>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Libellé</th>
                    <th className="py-2 pr-3">Référence</th>
                    <th className="py-2 pr-3 text-right">Montant</th>
                    <th className="py-2 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paiements.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {new Date(p.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 pr-3 font-medium text-foreground">{p.libelle}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                        {p.reference}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-foreground">
                        {formatMad(p.montant)}
                      </td>
                      <td className="py-3 text-right">
                        <PayStatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {cautionPay && (
          <p className="mt-4 text-xs text-muted-foreground">
            Caution déposée le {new Date(cautionPay.date).toLocaleDateString("fr-FR")} — référence{" "}
            {cautionPay.reference}.
          </p>
        )}
      </div>
    </div>
  );
}

function PayStatusBadge({ status }: { status: "en_attente" | "regle" | "rembourse" }) {
  const map = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
    regle: { label: "Réglé", cls: "bg-emerald-100 text-emerald-800" },
    rembourse: { label: "Remboursé", cls: "bg-secondary text-secondary-foreground" },
  } as const;
  const m = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.cls}`}>{m.label}</span>
  );
}
