import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  UserPlus,
  Upload,
  ClipboardCheck,
  Search,
  Camera,
  Megaphone,
  Gavel,
  CheckCircle2,
  CreditCard,
  Banknote,
  FileText,
  Wrench,
  Car,
  Sofa,
  ShieldCheck,
  Star,
  ListChecks,
  Volume2,
  Eye,
  Users,
  Lock,
  Headset,
  Globe2,
  Activity,
  Sparkles,
  FolderCheck,
  CalendarClock,
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";

export const Route = createFileRoute("/comment-ca-marche-vendeur")({
  head: () => ({
    meta: [
      { title: "Comment vendre sur Bidlik — Guide vendeur" },
      {
        name: "description",
        content:
          "Guide complet du vendeur Bidlik : parcours de vente, expertise indépendante, mise en enchères, paiement sécurisé et bonnes pratiques.",
      },
      { property: "og:title", content: "Comment vendre sur Bidlik ?" },
      {
        property: "og:description",
        content:
          "Vendez votre véhicule rapidement grâce à un processus transparent, une expertise indépendante et des enchères en temps réel.",
      },
    ],
  }),
  component: SellerGuide,
});

function SellerGuide() {
  return (
    <div className="font-sans">
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,oklch(0.66_0.21_35_/_0.35),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            <BadgeCheck className="h-3.5 w-3.5" /> Guide vendeur officiel
          </span>
          <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Comment vendre votre véhicule sur{" "}
            <span className="text-accent">Bidlik</span> ?
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
            Vendez votre véhicule rapidement grâce à un processus transparent,
            une expertise indépendante et des enchères en temps réel.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-orange)]"
            >
              <Upload className="h-4 w-4" /> Soumettre mon véhicule
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 1 — Parcours vendeur */}
      <Section eyebrow="De A à Z" title="Le parcours vendeur">
        <ol className="relative mt-12 space-y-4 border-l border-border pl-6 sm:pl-8">
          {JOURNEY.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
            >
              <span className="absolute -left-[42px] top-6 flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground shadow-md sm:-left-[50px]">
                {i + 1}
              </span>
              <div className="flex items-start gap-4">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent sm:flex">
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.text}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* SECTION 2 — Conditions */}
      <Section alt eyebrow="Prérequis" title="Conditions pour vendre">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard icon={<FileText className="h-5 w-5" />} title="Carte grise & documents de propriété" text="Fournir la carte grise originale ou tout document officiel prouvant la propriété du véhicule." />
          <InfoCard icon={<ListChecks className="h-5 w-5" />} title="Informations exactes" text="Renseigner avec précision la marque, le modèle, l'année, l'état et l'historique du véhicule." />
          <InfoCard icon={<Activity className="h-5 w-5" />} title="Kilométrage réel" text="Déclarer le kilométrage exact indiqué au compteur, sans arrondi ni approximation." />
          <InfoCard icon={<FolderCheck className="h-5 w-5" />} title="Documents administratifs" text="Rassembler l'ensemble des documents nécessaires à la mutation et à la sortie du véhicule." />
          <InfoCard icon={<CalendarClock className="h-5 w-5" />} title="Disponibilité pour l'expertise" text="Le véhicule doit être disponible et accessible pour l'inspection par l'expert indépendant." />
        </div>

        <Callout tone="warning" icon={<AlertTriangle className="h-5 w-5" />}>
          <strong>Attention :</strong> toute déclaration inexacte ou omission
          d'information peut entraîner un retard de mise en vente, une décote
          significative, voire l'annulation pure et simple de la vente.
        </Callout>
      </Section>

      {/* SECTION 3 — Expertise */}
      <Section eyebrow="Transparence garantie" title="Expertise indépendante">
        <p className="mt-6 max-w-3xl text-muted-foreground">
          Chaque véhicule mis en vente passe par une expertise complète
          réalisée par un professionnel indépendant. Le rapport produit est
          intégralement visible par les acheteurs.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard icon={<Search className="h-5 w-5" />} title="Inspection complète" text="Un contrôle approfondi couvrant l'ensemble du véhicule." />
          <InfoCard icon={<Wrench className="h-5 w-5" />} title="Contrôle mécanique" text="Analyse du moteur, de la transmission et des organes de sécurité." />
          <InfoCard icon={<Car className="h-5 w-5" />} title="Contrôle carrosserie" text="Vérification de la structure, de la peinture et des éléments extérieurs." />
          <InfoCard icon={<Sofa className="h-5 w-5" />} title="Contrôle intérieur" text="Évaluation de l'habitacle, des équipements et des finitions." />
          <InfoCard icon={<ShieldCheck className="h-5 w-5" />} title="Vérification administrative" text="Contrôle de la conformité et de la validité des documents." />
          <InfoCard icon={<FileText className="h-5 w-5" />} title="Rapport détaillé" text="Un document complet remis au format PDF, accessible aux acheteurs." />
          <InfoCard icon={<Star className="h-5 w-5" />} title="Note globale sur 10" text="Une notation synthétique reflétant l'état général du véhicule." />
          <InfoCard icon={<ListChecks className="h-5 w-5" />} title="+ de 200 points de contrôle" text="Un référentiel d'expertise exhaustif et standardisé." />
          <InfoCard icon={<Camera className="h-5 w-5" />} title="Photos professionnelles" text="Reportage photo HD sous tous les angles réalisé par l'expert." />
          <InfoCard icon={<Volume2 className="h-5 w-5" />} title="Enregistrements audio" text="Captation sonore du démarrage à froid et de l'accélération moteur." />
        </div>
      </Section>

      {/* SECTION 4 — Mise en vente */}
      <Section alt eyebrow="Publication" title="Mise en vente">
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FlowStep n={1} title="Intégration à une session" text="Votre véhicule est planifié dans la prochaine session d'enchères adaptée." />
          <FlowStep n={2} title="Consultation acheteurs" text="Les acheteurs consultent photos, rapport d'expertise et documents disponibles." />
          <FlowStep n={3} title="Enchères en temps réel" text="Les offres sont visibles en direct pendant toute la session d'enchères." />
          <FlowStep n={4} title="Suivi personnel" text="Vous suivez l'évolution de la vente depuis votre espace vendeur." />
        </div>
      </Section>

      {/* SECTION 5 — Après clôture */}
      <Section eyebrow="Après la vente" title="Après la clôture">
        <div className="mt-12 grid gap-3 md:grid-cols-6">
          {AFTER_CLOSE.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]"
            >
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* SECTION 6 — Paiement */}
      <Section alt eyebrow="Modalités financières" title="Paiement">
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <PaymentCard
            icon={<CreditCard className="h-5 w-5" />}
            title="Après réception effective des fonds"
            text="Le versement au vendeur est déclenché uniquement après l'encaissement complet du paiement de l'acheteur, garantissant une sécurité totale."
          />
          <PaymentCard
            icon={<Banknote className="h-5 w-5" />}
            title="Commission déduite avant versement"
            text="La commission Bidlik est prélevée automatiquement avant transfert. Vous recevez le montant net, sans démarche supplémentaire."
          />
          <PaymentCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Montant net garanti"
            text="Le solde net vous est viré directement sur le compte bancaire renseigné dans votre espace vendeur."
          />
          <PaymentCard
            icon={<Activity className="h-5 w-5" />}
            title="Suivi en temps réel"
            text="Consultez à tout moment le statut du paiement et l'historique complet depuis votre espace personnel."
          />
        </div>
      </Section>

      {/* SECTION 7 — Pourquoi vendre */}
      <Section eyebrow="Vos avantages" title="Pourquoi vendre sur Bidlik ?">
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Advantage icon={<Search />} title="Expertise indépendante" text="Un expert tiers évalue objectivement votre véhicule." />
          <Advantage icon={<Eye />} title="Enchères transparentes" text="Toutes les offres sont visibles en temps réel." />
          <Advantage icon={<Users />} title="Acheteurs qualifiés" text="Uniquement des professionnels référencés et vérifiés." />
          <Advantage icon={<Lock />} title="Processus sécurisé" text="Cadre juridique clair et engagements fermes." />
          <Advantage icon={<ShieldCheck />} title="Paiement sécurisé" text="Versement uniquement après encaissement effectif." />
          <Advantage icon={<Headset />} title="Accompagnement dédié" text="Un interlocuteur vous suit à chaque étape." />
          <Advantage icon={<Globe2 />} title="Visibilité nationale" text="Un réseau d'acheteurs actifs partout au Maroc." />
          <Advantage icon={<Activity />} title="Suivi en temps réel" text="Un tableau de bord clair et instantané." />
        </div>
      </Section>

      {/* SECTION 8 — Bonnes pratiques */}
      <Section alt eyebrow="Maximisez la valeur de votre vente" title="Bonnes pratiques">
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PracticeCard icon={<ListChecks />} title="Fournir des informations exactes" text="La transparence rassure les acheteurs et sécurise votre vente." />
          <PracticeCard icon={<Sparkles />} title="Présenter un véhicule propre" text="Un véhicule soigné met en valeur son état réel et son potentiel." />
          <PracticeCard icon={<FolderCheck />} title="Fournir tous les documents" text="Un dossier complet accélère la validation et rassure les enchérisseurs." />
          <PracticeCard icon={<CalendarClock />} title="Rester disponible pendant la vente" text="Une réactivité constante fluidifie l'ensemble du processus." />
          <PracticeCard icon={<Activity />} title="Consulter régulièrement l'espace vendeur" text="Suivez les offres et notifications pour ne rien manquer." />
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="Questions fréquentes" title="FAQ">
        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-3xl">
          <Faq q="Comment soumettre un véhicule ?" a="Depuis votre espace vendeur, remplissez le formulaire de soumission avec les informations et documents de votre véhicule. La demande est ensuite validée par l'équipe Bidlik." />
          <Faq q="Combien coûte la mise en vente ?" a="La soumission d'un véhicule est libre ; une commission Bidlik n'est prélevée qu'en cas de vente effective, directement déduite du montant final avant versement." />
          <Faq q="Qui réalise l'expertise ?" a="L'expertise est confiée à un expert automobile indépendant, sans lien avec le vendeur ni les acheteurs, garantissant une évaluation totalement objective." />
          <Faq q="Puis-je suivre les enchères ?" a="Oui. Vous suivez en temps réel l'évolution des offres, le nombre d'enchérisseurs et l'état de la session depuis votre espace vendeur." />
          <Faq q="Quand suis-je payé ?" a="Le versement est effectué dès que Bidlik a effectivement encaissé le paiement de l'acheteur, après déduction automatique de la commission." />
          <Faq q="Puis-je retirer mon véhicule avant la vente ?" a="Le retrait avant publication d'une session est possible. Une fois le véhicule intégré à une session active, un retrait n'est envisageable qu'à titre exceptionnel et sur validation de Bidlik." />
          <Faq q="Que se passe-t-il si la meilleure offre est refusée ?" a="Si l'offre finale n'est pas confirmée, le véhicule peut être reproposé lors d'une session ultérieure. Vous en êtes informé par notification depuis votre espace." />
        </Accordion>
      </Section>

      {/* CTA final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-accent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,oklch(1_0_0_/_0.15),transparent_60%)]" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <h2 className="font-display max-w-3xl text-3xl font-extrabold tracking-tight text-brand-orange sm:text-4xl md:text-5xl">
            Prêt à vendre votre véhicule ?
          </h2>
          <p className="max-w-2xl text-base text-primary/90">
            Soumettez votre véhicule dès aujourd'hui et bénéficiez d'une vente
            sécurisée, transparente et compétitive grâce aux enchères Bidlik.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Upload className="h-4 w-4" /> Soumettre mon véhicule
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-transparent px-8 py-4 text-sm font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Créer un compte vendeur <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- Data -------------------- */

const JOURNEY = [
  { icon: <UserPlus className="h-5 w-5" />, title: "Création du compte vendeur", text: "Inscrivez-vous en quelques minutes et transmettez les justificatifs nécessaires à la validation de votre compte vendeur." },
  { icon: <Upload className="h-5 w-5" />, title: "Soumission du véhicule", text: "Renseignez les informations complètes du véhicule et téléversez les documents requis depuis votre espace personnel." },
  { icon: <ClipboardCheck className="h-5 w-5" />, title: "Validation administrative", text: "L'équipe Bidlik vérifie la cohérence des informations et la conformité des documents fournis." },
  { icon: <Search className="h-5 w-5" />, title: "Inspection par un expert indépendant", text: "Un expert automobile tiers se déplace pour réaliser une inspection complète du véhicule." },
  { icon: <Camera className="h-5 w-5" />, title: "Photos professionnelles", text: "Un reportage photo HD est réalisé afin de mettre en valeur votre véhicule auprès des acheteurs." },
  { icon: <Megaphone className="h-5 w-5" />, title: "Publication dans une session", text: "Votre véhicule est intégré à la prochaine session d'enchères et devient visible dans le catalogue." },
  { icon: <Gavel className="h-5 w-5" />, title: "Vente aux enchères", text: "Les acheteurs professionnels référencés enchérissent en temps réel pendant toute la session." },
  { icon: <CheckCircle2 className="h-5 w-5" />, title: "Validation de la meilleure offre", text: "L'offre gagnante est présentée pour validation, garantissant votre pleine maîtrise du prix." },
  { icon: <CreditCard className="h-5 w-5" />, title: "Paiement de l'acheteur", text: "L'acheteur règle intégralement le véhicule dans un délai encadré de 48 heures ouvrées." },
  { icon: <Banknote className="h-5 w-5" />, title: "Versement du montant au vendeur", text: "Après encaissement effectif et déduction de la commission, votre versement est déclenché." },
];

const AFTER_CLOSE = [
  { title: "Fin des enchères", text: "Clôture de la session." },
  { title: "Validation", text: "Contrôle de l'adjudication." },
  { title: "Confirmation", text: "Vente officiellement confirmée." },
  { title: "Paiement acheteur", text: "Sous 48h ouvrées." },
  { title: "Versement vendeur", text: "Après encaissement effectif." },
  { title: "Remise du véhicule", text: "Sur bon de sortie signé." },
];

/* -------------------- Building blocks -------------------- */

function Section({
  children,
  eyebrow,
  title,
  alt = false,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  alt?: boolean;
}) {
  return (
    <section className={alt ? "bg-secondary/40 py-20" : "py-20"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            {eyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function FlowStep({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
        {n}
      </div>
      <h4 className="font-display mt-4 text-base font-bold text-foreground">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PaymentCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
        {icon}
      </div>
      <div>
        <h4 className="font-display text-lg font-bold text-foreground">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Advantage({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-accent/50">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <h3 className="font-display mt-5 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PracticeCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-4 rounded-2xl border-l-4 border-l-accent border-y border-r border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <div>
        <h4 className="font-display text-base font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Callout({
  children,
  icon,
  tone = "warning",
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone?: "warning" | "danger";
}) {
  const styles =
    tone === "danger"
      ? "border-l-red-500 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100"
      : "border-l-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100";
  return (
    <div className={`mt-10 flex items-start gap-4 rounded-2xl border-l-4 border-y border-r border-border p-5 shadow-[var(--shadow-card)] ${styles}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <AccordionItem value={q} className="border-border">
      <AccordionTrigger className="text-left text-base font-semibold text-foreground hover:no-underline">
        {q}
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
        {a}
      </AccordionContent>
    </AccordionItem>
  );
}
