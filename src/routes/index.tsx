import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { authStore } from "@/lib/auth";
import type { Auction } from "@/types/auction";
import { AuctionCard } from "@/components/AuctionCard";
import { Countdown } from "@/components/Countdown";
import { formatDateTime } from "@/lib/format";
import heroCar from "@/assets/hero-car.png";
import heroTruck from "@/assets/hero-truck-new.png";
import heroMoto from "@/assets/hero-moto.png";
import heroGavelFigure from "@/assets/hero-gavel-figure.png";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const { session } = authStore.getState();
    const roles = session?.user.roles ?? [];
    if (roles.includes("expert") && !roles.some((r) => r === "admin" || r === "acheteur" || r === "vendeur")) {
      throw redirect({ to: "/expert/inspections" });
    }
    if (roles.includes("vendeur") && !roles.includes("admin")) {
      throw redirect({ to: "/vendeur" });
    }
  },
  head: () => ({
    meta: [
      { title: "Bidlic — Enchères automobiles en temps réel au Maroc" },
      {
        name: "description",
        content:
          "Découvrez les enchères en cours sur Bidlic. Voitures expertisées, paiement sécurisé, livraison au Maroc.",
      },
      { property: "og:title", content: "Bidlic — Enchères automobiles au Maroc" },
      {
        property: "og:description",
        content: "Enchères en direct, voitures expertisées, prix en MAD.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [featured, setFeatured] = useState<Auction[]>([]);
  const [nextAuction, setNextAuction] = useState<Auction | null>(null);

  useEffect(() => {
    // Seed shuffle by current hour so the selection rotates every hour
    // and stays stable within that hour.
    const pickRandom = (all: Auction[]) => {
      const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000));
      let s = hourSeed;
      const rand = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      const shuffled = [...all]
        .map((a) => ({ a, k: rand() }))
        .sort((x, y) => x.k - y.k)
        .map(({ a }) => a);
      return shuffled.slice(0, 3);
    };

    const refresh = () => {
      api.listAuctions("closed").then((all) => setFeatured(pickRandom(all)));
    };
    refresh();
    // Re-roll at the top of each hour.
    const msToNextHour = 60 * 60 * 1000 - (Date.now() % (60 * 60 * 1000));
    const timeout = setTimeout(() => {
      refresh();
      const interval = setInterval(refresh, 60 * 60 * 1000);
      // Cleanup handled by outer effect return via captured ref.
      (refresh as unknown as { _i?: ReturnType<typeof setInterval> })._i = interval;
    }, msToNextHour);

    api.listAuctions("live").then((all) => {
      const now = Date.now();
      const upcoming = all
        .filter((a) => new Date(a.startsAt).getTime() > now)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      setNextAuction(upcoming[0] ?? null);
    });

    return () => {
      clearTimeout(timeout);
      const i = (refresh as unknown as { _i?: ReturnType<typeof setInterval> })._i;
      if (i) clearInterval(i);
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-[1.2fr_1fr] md:items-center md:py-28">
          <div className="text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              Enchères en direct au Maroc
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Achetez votre prochaine voiture <span className="text-accent">aux enchères</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg">
              Bidlic réunit acheteurs, vendeurs et experts automobiles dans une plateforme d'enchères transparente,
              sécurisée et 100% en temps réel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auctions"
                className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
              >
                Voir les enchères
              </Link>
              <Link
                to="/comment-ca-marche"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/5 px-6 py-3 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
              >
                Comment ça marche
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <Stat label="Voitures expertisées" value="100%" />
              <Stat label="Durée enchère" value="24h" />
              <Stat label="Devise" value="MAD" />
            </dl>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -inset-10 rounded-full bg-accent/20 blur-3xl" />

            {/* Truck behind, to the left */}
            <div
              className="absolute right-[5%] top-[5%] z-2 w-[78%] opacity-90 animate-car-enter"
              style={{ animationDelay: "150ms" }}
            >
              <img src={heroTruck} alt="" aria-hidden className="w-full drop-shadow-xl" />
              {/* Orange strobe light on the roof */}
              <span
                aria-hidden
                className="pointer-events-none absolute strobe-light"
                style={{ left: "18%", top: "27%", width: "21%", height: "6%" }}
              />
            </div>

            {/* Car (foreground center) */}
            <div className="relative z-10 left-[30%] mt-16 animate-car-enter" style={{ containerType: "inline-size" }}>
              <img
                src={heroCar}
                alt="Voiture de luxe aux enchères sur Bidlic"
                className="relative mx-auto w-full max-w-[560px] drop-shadow-2xl"
              />
              {/* Headlight flash anchors — 0x0 points centered exactly on each headlight.
                  All glow/flare layers center on these anchors so they stay aligned at every breakpoint. */}
              <span
                aria-hidden
                className="pointer-events-none absolute headlight-flash"
                style={{ left: "10%", top: "51%" }}
              />
              <span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute headlight-flash"
                  style={{ left: "43%", top: "52%" }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute headlight-flash"
                  style={{ left: "47%", top: "50%" }}
                />
              </span>
            </div>

            {/* Motorcycle in front, to the right */}
            <div
              className="absolute right-[68%] bottom-[35%] z-1 w-[30%] -translate-y-1/3 animate-car-enter"
              style={{ animationDelay: "300ms" }}
            >
              <img src={heroMoto} alt="" aria-hidden className="w-full drop-shadow-2xl" />
            </div>

            {/* 3D gavel figure — front-most mascot */}
            <div
              className="absolute right-[-26%] bottom-[12%] z-30 w-[42%] animate-car-enter"
              style={{ animationDelay: "450ms" }}
            >
              <img
                src={heroGavelFigure}
                alt="Mascotte 3D tenant un marteau de commissaire-priseur"
                className="w-full drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Next auction countdown */}
      {nextAuction && (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6 sm:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
              <CalendarClock className="h-4 w-4" />
              Prochaine enchère
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              La prochaine vente démarre dans
            </h2>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-6 backdrop-blur-md">
              <Countdown endsAt={nextAuction.startsAt} className="!text-4xl !text-white sm:!text-6xl md:!text-7xl" />
            </div>
            <p className="text-sm text-white/80 sm:text-base">
              Préparez-vous — l'enchère ouvrira le {formatDateTime(nextAuction.startsAt)}.
            </p>
            <Link
              to="/auctions"
              search={{ filter: "live" }}
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-primary shadow-lg transition-all hover:-translate-y-0.5"
            >
              Voir toutes les enchères
            </Link>
          </div>
        </section>
      )}

      {/* Live auctions preview */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Enchères Passées</h2>
            <p className="mt-1 text-sm text-muted-foreground">Les ventes récemment clôturées.</p>
          </div>
          <Link to="/auctions" className="text-sm font-semibold text-accent hover:underline">
            Tout voir →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Une expérience d'enchère pensée pour vous
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Feature
              num="01"
              title="Voitures expertisées"
              text="Chaque véhicule est inspecté par un expert indépendant et noté sur 10."
            />
            <Feature
              num="02"
              title="Enchères en temps réel"
              text="Voyez chaque offre instantanément. Activez l'auto-enchère pour ne jamais perdre."
            />
            <Feature
              num="03"
              title="Paiement sécurisé"
              text="48 heures pour régler votre achat après validation de l'enchère."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-white/60">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
    </div>
  );
}

function Feature({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <span className="text-xs font-bold tracking-wider text-accent">{num}</span>
      <h3 className="mt-2 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
