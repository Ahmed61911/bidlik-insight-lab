import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, X, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdminPaiements, type AdminPayment, type AdminPaymentStatus } from "@/lib/supabaseAdminPaiements";
import { formatMad } from "@/lib/format";

export const Route = createFileRoute("/admin/cautions")({
  head: () => ({
    meta: [
      { title: "Cautions acheteurs — Admin Bidlik" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCautionsPage,
});

const STATUS_LABEL: Record<AdminPaymentStatus, string> = {
  en_attente: "En attente",
  paye: "Validée",
  rembourse: "Remboursée",
  annule: "Rejetée",
};
const STATUS_TONE: Record<AdminPaymentStatus, string> = {
  en_attente: "bg-amber-100 text-amber-900",
  paye: "bg-emerald-100 text-emerald-900",
  rembourse: "bg-secondary text-secondary-foreground",
  annule: "bg-destructive/15 text-destructive",
};

type RefundMethod = "virement" | "cheque" | "especes";

function AdminCautionsPage() {
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"en_attente" | "all">("en_attente");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminPayment | null>(null);
  const [rMethod, setRMethod] = useState<RefundMethod>("virement");
  const [rBank, setRBank] = useState("");
  const [rReference, setRReference] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [rFile, setRFile] = useState<File | null>(null);

  const refresh = () => {
    setLoading(true);
    supabaseAdminPaiements
      .list()
      .then((all) => setItems(all.filter((p) => p.type === "caution")))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.status === "en_attente")),
    [items, filter],
  );

  const pendingTotal = useMemo(
    () => items.filter((p) => p.status === "en_attente").reduce((s, p) => s + p.amount, 0),
    [items],
  );
  const validatedTotal = useMemo(
    () => items.filter((p) => p.status === "paye").reduce((s, p) => s + p.amount, 0),
    [items],
  );

  const openProof = async (path: string) => {
    try {
      const url = await supabaseAdminPaiements.signedProofUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const decide = async (id: string, decision: "validee" | "rejetee") => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("admin_validate_caution", {
        p_id: id,
        p_decision: decision,
      } as never);
      if (error) throw new Error(error.message);
      toast.success(decision === "validee" ? "Caution validée" : "Caution rejetée");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const openRefund = (p: AdminPayment) => {
    setRefundTarget(p);
    setRMethod("virement");
    setRBank("");
    setRReference("");
    setRNotes("");
    setRFile(null);
  };

  const submitRefund = async () => {
    if (!refundTarget) return;
    if (!rFile) {
      toast.error("Le justificatif de remboursement est obligatoire");
      return;
    }
    setBusyId(refundTarget.id);
    try {
      const { path, name } = await supabaseAdminPaiements.uploadProof(rFile);
      const { error } = await supabase.rpc("admin_refund_caution", {
        p_id: refundTarget.id,
        p_reference: rReference || null,
        p_proof_url: path,
        p_proof_name: name,
        p_notes: rNotes || null,
        p_payment_method: rMethod,
        p_bank: rMethod === "virement" || rMethod === "cheque" ? (rBank || null) : null,
      } as never);
      if (error) throw new Error(error.message);
      toast.success("Caution remboursée");
      setRefundTarget(null);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cautions acheteurs</h2>
          <p className="text-xs text-muted-foreground">
            Vérifiez les justificatifs déposés par les acheteurs et validez leur caution.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="en_attente">À vérifier</option>
          <option value="all">Tout l'historique</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card label="En attente" value={formatMad(pendingTotal)} tone="warn" />
        <Card label="Cautions actives" value={formatMad(validatedTotal)} tone="ok" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {filter === "en_attente" ? "Aucune caution en attente." : "Aucune caution."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {p.userNom ?? p.userEmail ?? "—"}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.userEmail ?? ""}
                    {p.paymentMethod && <> · Mode <span className="font-medium">{p.paymentMethod}</span></>}
                    {p.bank && <> · {p.bank}</>}
                    {p.reference && <> · Réf {p.reference}</>}
                  </p>
                  <p className="mt-2 text-base font-bold text-foreground">{formatMad(p.amount)}</p>
                  {p.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">Note : {p.notes}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Soumis le {new Date(p.paidAt ?? p.createdAt).toLocaleString("fr-FR")}
                  </p>
                  {p.proofUrl && (
                    <button
                      onClick={() => openProof(p.proofUrl!)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {p.proofName ?? "Voir le justificatif"}
                    </button>
                  )}
                </div>
                {p.status === "en_attente" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => decide(p.id, "rejetee")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" /> Rejeter
                    </button>
                    <button
                      disabled={busyId === p.id}
                      onClick={() => decide(p.id, "validee")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" /> Valider
                    </button>
                  </div>
                )}
                {p.status === "paye" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      disabled={busyId === p.id}
                      onClick={() => openRefund(p)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-60"
                    >
                      Rembourser
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
