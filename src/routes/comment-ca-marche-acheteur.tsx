import { createFileRoute, Link } from "@tanstack/react-router";

const BUYER_STEPS = [
  {
    n: "01",
    title: "Inscrivez-vous et déposez votre caution",
    text: "Créez votre compte en quelques secondes. Une caution est nécessaire avant de pouvoir enchérir.",
  },
  {
    n: "02",
    title: "Parcourez les voitures expertisées",
    text: "Toutes les voitures sont inspectées par un expert indépendant et notées sur 10. Tout est transparent.",
  },
  {
    n: "03",
    title: "Enchérissez en temps réel",
    text: "Placez vos offres en un clic (+1 000 DH, +5 000 DH ou montant libre). Activez l'auto-enchère pour ne jamais perdre de vue.",
  },
  {
    n: "04",
    title: "Validation et paiement",
    text: "L'enchère dure 24h. Après validation par l'administrateur, vous avez 48h pour régler votre achat.",
  },
];

export const Route = createFileRoute("/comment-ca-marche-acheteur")({
  head: () => ({
    meta: [
      { title: "Comment ça marche acheteur — Bidlic" },
      {
        name: "description",
        content:
          "Comment acheter une voiture aux enchères sur Bidlic : inscription, caution, enchère 24h, paiement.",
      },
    ],
  }),
  component: BuyerHowItWorks,
});

function BuyerHowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Comment acheter sur Bidlic ?
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Une plateforme d'enchères automobiles transparente, en temps réel, sécurisée — au Maroc.
        </p>
      </header>

      <ol className="mt-10 space-y-4">
        {BUYER_STEPS.map((s) => (
          <li
            key={s.n}
            className="flex gap-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
          >
            <span className="accent-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-extrabold text-white">
              {s.n}
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="hero-gradient mt-12 rounded-2xl p-8 text-center text-white">
        <h2 className="text-2xl font-bold">Prêt à enchérir ?</h2>
        <p className="mt-2 text-sm text-white/80">
          Découvrez les enchères en cours dès maintenant.
        </p>
        <Link
          to="/auctions"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
        >
          Voir les enchères
        </Link>
      </div>
    </div>
  );
}
