import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Truck, CheckCircle2, XCircle, Clock, Download, FileText, Star } from "lucide-react";
import { api } from "@/lib/api";
import { getCarExpertise } from "@/lib/supabaseApi";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import type { Auction } from "@/types/auction";
import type { CarExpertise } from "@/types/expert";
import { formatMad, formatDateTime } from "@/lib/format";
import { CarGallery } from "@/components/CarGallery";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { requireRole } from "@/lib/routeGuard";

export const Route = createFileRoute("/acheteur/gagnees/$auctionId")({
  beforeLoad: ({ location }) => requireRole(["acheteur"], location.href),
  loader: async ({ params }) => {
    const auction = await api.getAuction(params.auctionId);
    const expertise = await getCarExpertise(auction.car.id).catch(() => null);
    const { data: meta } = await supabase
      .from("auctions")
      .select("closed_at, validated_at, payment_deadline")
      .eq("id", params.auctionId)
      .maybeSingle();
    return {
      auction,
      expertise,
      closedAt: (meta?.closed_at as string | null) ?? null,
      validatedAt: (meta?.validated_at as string | null) ?? null,
      paymentDeadline: (meta?.payment_deadline as string | null) ?? null,
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Enchère introuvable.{" "}
      <Link to="/acheteur/gagnees" className="font-semibold text-accent hover:underline">
        Retour
      </Link>
    </div>
  ),
  component: WonCarDetailsPage,
});

type WonStatus = "en_attente" | "validee" | "livree" | "annulee";

function computeStatus(a: Auction): WonStatus {
  if (a.status === "cancelled" || a.car.status === "vendu_annulee") return "annulee";
  if (a.car.deliveryStatus === "livre") return "livree";
  if (a.status === "validated") return "validee";
  return "en_attente";
}

function WonCarDetailsPage() {
  const { auction: initial, expertise, closedAt, validatedAt, paymentDeadline } = Route.useLoaderData();
  const [auction, setAuction] = useState<Auction>(initial);
  const [meta, setMeta] = useState({ closedAt, validatedAt, paymentDeadline });
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      const fresh = await api.getAuction(initial.id).catch(() => null);
      const { data } = await supabase
        .from("auctions")
        .select("closed_at, validated_at, payment_deadline")
        .eq("id", initial.id)
        .maybeSingle();
      if (!alive) return;
      if (fresh) setAuction(fresh);
      if (data) setMeta({
        closedAt: (data.closed_at as string | null) ?? null,
        validatedAt: (data.validated_at as string | null) ?? null,
        paymentDeadline: (data.payment_deadline as string | null) ?? null,
      });
    }
    const ch = supabase
      .channel(`won-car-${initial.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${initial.id}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "cars", filter: `id=eq.${initial.car.id}` }, () => void refresh())
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [initial.id, initial.car.id]);

  useEffect(() => {
    let alive = true;
    async function sign() {
      const path = (expertise as CarExpertise | null)?.rapportUrl;
      if (!path) return;
      try {
        const url = await storage.signedUrl("car-images", path);
        if (alive) setReportUrl(url);
      } catch {
        /* noop */
      }
    }
    void sign();
    return () => { alive = false; };
  }, [expertise]);

  const status = computeStatus(auction);
  const car = auction.car;

  return (
    <div className="space-y-5">
      <Link
        to="/acheteur/gagnees"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voitures gagnées
      </Link>

      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-primary">#{car.id}</p>
            <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {car.marque} {car.modele}{" "}
              <span className="font-normal text-muted-foreground">({car.annee})</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prix final :{" "}
              <span className="font-semibold text-foreground">{formatMad(auction.currentPrice)}</span>
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </header>

      <CarGallery images={car.images} marque={car.marque} modele={car.modele} />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Suivi de la transaction</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <TimelineItem
            done={true}
            title="Enchère remportée"
            date={auction.closedAt ?? auction.endsAt}
          />
          <TimelineItem
            done={auction.status === "validated" || auction.status === "cancelled" || car.deliveryStatus === "livre"}
            active={status === "en_attente"}
            title="Validation par l'administrateur"
            date={auction.validatedAt}
            note={status === "en_attente" ? "En attente…" : undefined}
          />
          <TimelineItem
            done={car.paymentStatus === "paye"}
            active={status === "validee" && car.paymentStatus !== "paye"}
            title="Paiement du véhicule"
            note={
              status === "validee" && car.paymentStatus !== "paye" && auction.paymentDeadline
                ? undefined
                : car.paymentStatus === "paye" ? "Payé" : undefined
            }
            extra={
              status === "validee" && car.paymentStatus !== "paye" && auction.paymentDeadline ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                  <Clock className="h-3.5 w-3.5" /> Sous : <DeadlineCountdown deadline={auction.paymentDeadline} />
                </span>
              ) : null
            }
          />
          <TimelineItem
            done={car.deliveryStatus === "livre"}
            active={car.paymentStatus === "paye" && car.deliveryStatus !== "livre"}
            title="Livraison du véhicule"
            note={car.deliveryStatus === "livre" ? "Livré" : status === "annulee" ? "—" : "En attente"}
          />
        </ul>
        {status === "validee" && car.paymentStatus !== "paye" && (
          <Link
            to="/acheteur/paiements"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Régler et téléverser le justificatif
          </Link>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Caractéristiques</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Info label="Marque" value={car.marque} />
          <Info label="Modèle" value={car.modele} />
          <Info label="Année" value={String(car.annee)} />
          <Info label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
          <Info label="Carburant" value={car.carburant} />
          <Info label="Boîte" value={car.transmission} />
          <Info label="Finition" value={car.finition || "—"} />
          <Info label="Couleur ext." value={car.couleurExterieur || "—"} />
          <Info label="Couleur int." value={car.couleurInterieur || "—"} />
          <Info label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
          <Info label="Nombre de clés" value={String(car.nombreCles)} />
          <Info label="Procuration" value={car.procuration} />
        </dl>
      </section>

      {expertise && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Rapport d'expertise</h2>
            {expertise.noteFinale != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {expertise.noteFinale}/10
              </span>
            )}
          </div>
          {expertise.commentaire && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{expertise.commentaire}</p>
          )}
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80"
            >
              <Download className="h-4 w-4" /> Télécharger le rapport PDF
            </a>
          )}
          {!reportUrl && expertise.rapportUrl && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Préparation du lien de téléchargement…
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

function TimelineItem({
  done,
  active = false,
  title,
  date,
  note,
  extra,
}: {
  done: boolean;
  active?: boolean;
  title: string;
  date?: string | null;
  note?: string;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-border bg-card text-muted-foreground",
        ].join(" ")}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Clock className="h-3 w-3" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-foreground" : active ? "text-amber-800" : "text-muted-foreground"}`}>
          {title}
        </p>
        {date && <p className="text-xs text-muted-foreground">{formatDateTime(date)}</p>}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {extra && <div className="mt-1">{extra}</div>}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: WonStatus }) {
  const map: Record<WonStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" /> },
    validee: { label: "Validée", cls: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    livree: { label: "Livrée", cls: "bg-emerald-100 text-emerald-800", icon: <Truck className="h-3 w-3" /> },
    annulee: { label: "Annulée", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
