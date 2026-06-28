import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel, ShieldCheck, Sparkles, Timer, TrendingUp, Wallet } from "lucide-react";
import heroCarLot from "@/assets/hero-car-lot.png";

export const Route = createFileRoute("/home-v2")({
  head: () => ({
    meta: [
      { title: "Bidlic — Accueil (v2)" },
      {
        name: "description",
        content:
          "Variante d'accueil Bidlic : enchères automobiles au Maroc, design éditorial et expérience premium.",
      },
      { property: "og:title", content: "Bidlic — Accueil (v2)" },
      {
        property: "og:description",
        content: "Une autre vision de la page d'accueil Bidlic.",
      },
    ],
  }),
  component: HomeV2,
});

function HomeV2() {
  return (
    <>
      {/* Editorial hero — split layout, oversized type, navy field with orange accent */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,oklch(0.66_0.21_35_/_0.35),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-accent">
              <span className="h-px w-10 bg-accent" />
              Édition 2026 · Maroc
            </div>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              L'enchère,
              <br />
              <span className="italic text-accent">réinventée</span>
              <br />
              pour la route.
            </h1>
            <p className="mt-8 max-w-xl text-base text-white/70 sm:text-lg">
              Bidlic réunit collectionneurs, vendeurs et experts dans un salon d'enchères
              digital — transparent, instantané, et résolument marocain.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/auctions"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
              >
                <Gavel className="h-4 w-4" />
                Entrer dans la salle
              </Link>
              <Link
                to="/comment-ca-marche"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white/90 transition-colors hover:bg-white/5"
              >
                Le règlement
              </Link>
            </div>

            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-8 border-t border-white/10 pt-8">
              <Metric value="24h" label="Durée d'enchère" />
              <Metric value="100%" label="Voitures expertisées" />
              <Metric value="MAD" label="Devise" />
            </dl>
          </div>

          <div className="relative md:col-span-5">
            <div className="absolute -inset-6 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur">
              <img
                src={heroCarLot}
                alt="Parc de voitures premium disponibles aux enchères Bidlic"
                width={1024}
                height={1024}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ticker bar */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            En direct sur Bidlic
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <TickerItem label="Audi A4" value="172 000" />
            <TickerItem label="BMW Série 3" value="245 500" />
            <TickerItem label="Peugeot 3008" value="198 000" />
            <TickerItem label="Renault Clio" value="84 000" />
          </div>
        </div>
      </section>

      {/* Three pillars — editorial cards */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Pourquoi Bidlic
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Trois promesses, zéro compromis.
            </h2>
          </div>
          <Link to="/trust" className="text-sm font-semibold text-accent hover:underline">
            Notre charte de confiance →
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Pillar
            icon={<ShieldCheck className="h-5 w-5" />}
            num="01"
            title="Expertise indépendante"
            text="Chaque voiture est inspectée et notée sur 10 par un expert agréé avant la mise en vente."
          />
          <Pillar
            icon={<Timer className="h-5 w-5" />}
            num="02"
            title="Temps réel absolu"
            text="Offres synchronisées à la milliseconde, anti-snipe, auto-enchère et notifications instantanées."
          />
          <Pillar
            icon={<Wallet className="h-5 w-5" />}
            num="03"
            title="Paiement sécurisé"
            text="Validation administrative sous 24h, règlement CMI ou virement sous 48h. Aucun risque caché."
          />
        </div>
      </section>

      {/* Workflow — vertical numbered timeline */}
      <section className="bg-secondary/40 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Le parcours
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              De l'inspiration à la clé en main.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Quatre étapes calibrées pour vendeurs et acheteurs, orchestrées par Bidlic.
            </p>
            <Link
              to="/auctions"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent"
            >
              Voir les enchères ouvertes <TrendingUp className="h-4 w-4" />
            </Link>
          </div>

          <ol className="relative space-y-8 border-l border-border pl-8">
            <Step n="01" title="Mise en ligne" text="Le vendeur soumet son véhicule avec photos et documents." />
            <Step n="02" title="Inspection experte" text="Un expert Bidlic se déplace, note la voiture et publie le rapport." />
            <Step n="03" title="Enchère live 24h" text="Les acheteurs vérifiés enchérissent en temps réel, avec auto-bid." />
            <Step n="04" title="Validation & paiement" text="L'équipe Bidlic valide, l'acheteur règle sous 48h via CMI ou virement." />
          </ol>
        </div>
      </section>

      {/* Closing CTA — full-bleed orange band */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-accent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(1_0_0_/_0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <Sparkles className="h-8 w-8 text-white" />
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Votre prochaine voiture vous attend dans la salle.
          </h2>
          <p className="max-w-xl text-white/85">
            Rejoignez les milliers d'enchérisseurs marocains qui ont fait de Bidlic leur
            place de marché automobile.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="rounded-full bg-primary px-7 py-3 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              Créer un compte
            </Link>
            <Link
              to="/auctions"
              className="rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-semibold uppercase tracking-wider text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Explorer les enchères
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="text-3xl font-extrabold text-white">{value}</dd>
      <dt className="mt-1 text-xs uppercase tracking-wider text-white/55">{label}</dt>
    </div>
  );
}

function TickerItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">MAD</span>
    </span>
  );
}

function Pillar({
  icon,
  num,
  title,
  text,
}: {
  icon: React.ReactNode;
  num: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="absolute right-6 top-6 text-5xl font-extrabold text-accent/10 transition-colors group-hover:text-accent/20">
        {num}
      </div>
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-bold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[42px] flex h-8 w-8 items-center justify-center rounded-full border border-accent bg-background text-xs font-bold text-accent">
        {n.slice(-1)}
      </span>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{n}</p>
      <h3 className="mt-1 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </li>
  );
}
