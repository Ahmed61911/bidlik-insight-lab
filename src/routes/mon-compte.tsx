import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, User, KeyRound, Mail, Phone, MapPin, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/mon-compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Bidlik" },
      { name: "description", content: "Gérez vos informations personnelles et votre mot de passe." },
    ],
  }),
  component: MonComptePage,
});

function MonComptePage() {
  const auth = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("");
  const [email, setEmail] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (auth.status === "anonymous") {
      router.navigate({ to: "/login" });
    }
  }, [auth.status, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_my_profile");
      const p = Array.isArray(data) ? data[0] : null;
      if (cancelled) return;
      setNom(p?.nom ?? auth.user?.nom ?? "");
      setTelephone(p?.telephone ?? "");
      setVille(p?.ville ?? "");
      setEmail(p?.email ?? auth.user?.email ?? "");
      setNewEmail(p?.email ?? auth.user?.email ?? "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [auth.user?.email, auth.user?.nom]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    const { error } = await supabase.rpc("update_my_profile", {
      p_nom: nom,
      p_telephone: telephone,
      p_ville: ville,
    });
    setSavingProfile(false);
    if (error) setProfileMsg({ kind: "err", text: error.message });
    else setProfileMsg({ kind: "ok", text: "Informations mises à jour." });
  }

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    if (!newEmail || newEmail === email) {
      setEmailMsg({ kind: "err", text: "Saisissez une nouvelle adresse e-mail." });
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSavingEmail(false);
    if (error) setEmailMsg({ kind: "err", text: error.message });
    else setEmailMsg({ kind: "ok", text: "Un lien de confirmation a été envoyé à votre nouvelle adresse." });
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (pwd.length < 6) {
      setPwdMsg({ kind: "err", text: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (pwd !== pwd2) {
      setPwdMsg({ kind: "err", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSavingPwd(false);
    if (error) {
      setPwdMsg({ kind: "err", text: error.message });
    } else {
      setPwd(""); setPwd2("");
      setPwdMsg({ kind: "ok", text: "Mot de passe mis à jour." });
    }
  }

  if (auth.status !== "authenticated" || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mon compte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gérez vos informations personnelles, votre e-mail et votre mot de passe.
          </p>
        </header>

        {/* Profile */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Informations personnelles</h2>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Nom complet" icon={<User className="h-4 w-4" />}>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="input"
              />
            </Field>
            <Field label="Téléphone" icon={<Phone className="h-4 w-4" />}>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+212 6 12 34 56 78"
                className="input"
              />
            </Field>
            <Field label="Ville" icon={<MapPin className="h-4 w-4" />}>
              <input
                type="text"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                className="input"
              />
            </Field>
            {profileMsg && <Msg kind={profileMsg.kind}>{profileMsg.text}</Msg>}
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </form>
        </section>

        {/* Email */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Adresse e-mail</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            E-mail actuel : <span className="font-medium text-foreground">{email}</span>
          </p>
          <form onSubmit={saveEmail} className="space-y-4">
            <Field label="Nouvelle adresse e-mail" icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
              />
            </Field>
            {emailMsg && <Msg kind={emailMsg.kind}>{emailMsg.text}</Msg>}
            <button
              type="submit"
              disabled={savingEmail}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
            >
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Mettre à jour l'e-mail
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Mot de passe</h2>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Nouveau mot de passe" icon={<KeyRound className="h-4 w-4" />}>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                minLength={6}
                required
                className="input"
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" icon={<KeyRound className="h-4 w-4" />}>
              <input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                minLength={6}
                required
                className="input"
              />
            </Field>
            {pwdMsg && <Msg kind={pwdMsg.kind}>{pwdMsg.text}</Msg>}
            <button
              type="submit"
              disabled={savingPwd}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
            >
              {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Modifier le mot de passe
            </button>
          </form>
        </section>
      </main>
      <SiteFooter />

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0.55rem 0.75rem;
          font-size: 0.9rem;
          color: hsl(var(--foreground));
          outline: none;
        }
        .input:focus { border-color: hsl(var(--accent)); box-shadow: 0 0 0 3px hsl(var(--accent) / 0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Msg({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <div
      className={
        kind === "ok"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {children}
    </div>
  );
}
