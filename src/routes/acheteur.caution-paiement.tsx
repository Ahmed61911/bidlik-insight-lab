import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Lock, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMad } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CAUTION_AMOUNT = 5000;

export const Route = createFileRoute("/acheteur/caution-paiement")({
  head: () => ({
    meta: [
      { title: "Paiement de la caution — Bidlik" },
      { name: "description", content: "Déposez votre caution remboursable par carte bancaire (CMI 3D Secure) pour participer aux enchères." },
    ],
  }),
  component: CautionPaiementPage,
});

type Profile = {
  nom: string | null;
  email: string | null;
  telephone: string | null;
  ville: string | null;
};

function CautionPaiementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [accept, setAccept] = useState(false);

  useEffect(() => {
    if (user?.cautionValidee) {
      toast.info("Votre caution est déjà active.");
      navigate({ to: "/acheteur/caution" });
    }
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("profiles")
        .select("nom, email, telephone, ville")
        .eq("user_id", uid)
        .maybeSingle();
      if (data) setProfile(data as Profile);
    })();
  }, []);

  async function payerMaintenant() {
    if (!accept) {
      toast.error("Veuillez accepter les conditions pour continuer.");
      return;
    }
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

  const fees = 0;
  const total = CAUTION_AMOUNT + fees;

  return (
    <div className="space-y-4">
      <Link
        to="/acheteur/caution"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: summary + method */}
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h1 className="text-xl font-semibold text-foreground">Paiement de la caution</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Caution remboursable requise pour participer aux enchères. Restituée
              intégralement si vous ne remportez aucune enchère.
            </p>

            <div className="mt-5 space-y-3 rounded-lg border border-border bg-background p-4">
              <Row label="Caution remboursable" value={formatMad(CAUTION_AMOUNT)} />
              <Row label="Frais de service" value={formatMad(fees)} muted />
              <div className="my-2 border-t border-border" />
              <Row label="Total à payer" value={formatMad(total)} bold />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Moyen de paiement
            </h2>
            <div className="mt-3 flex items-center gap-3 rounded-lg border-2 border-accent bg-accent/5 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">Carte bancaire (CMI)</p>
                <p className="text-xs text-muted-foreground">
                  Visa, Mastercard, CMI — paiement sécurisé 3D Secure
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Vos données de carte ne transitent jamais par Bidlik. Elles sont
              saisies directement sur la page sécurisée de CMI.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations de facturation
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Info label="Nom" value={profile?.nom} />
              <Info label="Email" value={profile?.email} />
              <Info label="Téléphone" value={profile?.telephone} />
              <Info label="Ville" value={profile?.ville} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Ces informations proviennent de votre profil. Vous pouvez les
              modifier dans votre compte avant de payer.
            </p>
          </section>
        </div>

        {/* Right: action card */}
        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">Paiement 100% sécurisé</span>
            </div>

            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground">Montant à payer</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {formatMad(total)}
              </p>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                J'accepte que ce montant soit débité de ma carte au titre d'une
                caution remboursable et confirme les{" "}
                <a href="#" className="underline">conditions générales</a>.
              </span>
            </label>

            <button
              onClick={payerMaintenant}
              disabled={loading || !accept}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Payer {formatMad(total)}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
              Vous serez redirigé vers la page sécurisée de CMI.
            </p>

            <div className="flex items-center justify-center gap-3 border-t border-border pt-3">
              <Badge>VISA</Badge>
              <Badge>Mastercard</Badge>
              <Badge>CMI</Badge>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span
        className={
          bold
            ? "text-lg font-bold text-foreground"
            : muted
              ? "text-muted-foreground"
              : "font-semibold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-border bg-background px-2 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}
