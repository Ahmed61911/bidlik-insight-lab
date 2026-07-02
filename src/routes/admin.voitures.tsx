import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2, X, ChevronLeft, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { Car } from "@/types/auction";
import { BODY_TYPES } from "@/types/auction";
import { formatMad } from "@/lib/format";
import { Dropdown } from "@/components/ui/dropdown";
import { CAR_CATALOG, CAR_MAKES } from "@/lib/carCatalog";

export const Route = createFileRoute("/admin/voitures")({
  component: AdminCarsPage,
});


type CarRow = Car & { proprietaireId: string };

function AdminCarsPage() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarRow | null>(null);
  const [previewing, setPreviewing] = useState<CarRow | null>(null);
  const [query, setQuery] = useState("");

  const refresh = () => {
    setLoading(true);
    supabaseAdminApi.listCars().then((c) => {
      setCars(c);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const handleDelete = async (c: CarRow) => {
    if (!confirm(`Supprimer ${c.marque} ${c.modele} ?`)) return;
    await supabaseAdminApi.deleteCar(c.id);
    toast.success("Voiture supprimée");
    if (previewing?.id === c.id) setPreviewing(null);
    refresh();
  };


  const filtered = cars.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.marque.toLowerCase().includes(q) ||
      c.modele.toLowerCase().includes(q) ||
      c.vendeurNom.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Voitures</h2>
          <p className="text-xs text-muted-foreground">{cars.length} véhicules au catalogue</p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-56"
          />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && filtered.length === 0 && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucune voiture trouvée.</p>}
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground"><span className="font-mono text-muted-foreground">#{c.id}</span> · {c.marque} {c.modele}</p>
                <p className="text-xs text-muted-foreground">{c.bodyType || "—"} · {c.finition || "—"} · {c.couleurExterieur}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-[10px] uppercase text-muted-foreground">MEC (Mise En Circulation)</p><p className="font-medium">{c.annee}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">KM</p><p className="font-medium">{c.kilometrage.toLocaleString("fr-FR")}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Prix plancher</p><p className="font-medium">{c.prixPlancher != null ? formatMad(c.prixPlancher) : "—"}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Prix minimum</p><p className="font-medium">{c.prixMinimum != null ? formatMad(c.prixMinimum) : "—"}</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Vendeur : {c.vendeurNom}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setEditing(c)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Supprimer ${c.marque} ${c.modele} ?`)) return;
                  await supabaseAdminApi.deleteCar(c.id);
                  toast.success("Voiture supprimée");
                  refresh();
                }}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Véhicule</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Vendeur</th>
              <th className="px-4 py-3">MEC</th>
              <th className="px-4 py-3">KM</th>
              <th className="px-4 py-3">Prix plancher</th>
              <th className="px-4 py-3">Prix minimum</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">Chargement…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune voiture trouvée.</td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground"><span className="font-mono text-muted-foreground">#{c.id}</span> · {c.marque} {c.modele}</p>
                  <p className="text-xs text-muted-foreground">{c.finition || "—"} · {c.couleurExterieur}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.bodyType || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.vendeurNom}</td>
                <td className="px-4 py-3">{c.annee}</td>
                <td className="px-4 py-3">{c.kilometrage.toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 font-medium text-foreground">{c.prixPlancher != null ? formatMad(c.prixPlancher) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.prixMinimum != null ? formatMad(c.prixMinimum) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => setEditing(c)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer ${c.marque} ${c.modele} ?`)) return;
                        await supabaseAdminApi.deleteCar(c.id);
                        toast.success("Voiture supprimée");
                        refresh();
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <CarFormDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
      {editing && <CarFormDialog existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function StatusBadge({ status }: { status: Car["status"] }) {
  const map: Record<Car["status"], { label: string; cls: string }> = {
    open: { label: "Ouverte", cls: "bg-secondary text-secondary-foreground" },
    en_cours: { label: "En cours", cls: "bg-accent/15 text-accent" },
    en_attente_validation: { label: "À valider", cls: "bg-warning/20 text-warning-foreground" },
    expertise: { label: "Expertisé", cls: "bg-primary/15 text-primary" },
    vendu_validee: { label: "Vendue", cls: "bg-success/15 text-success" },
    vendu_annulee: { label: "Annulée", cls: "bg-destructive/15 text-destructive" },
  };
  const { label, cls } = map[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function CarFormDialog({ existing, onClose, onSaved }: { existing?: CarRow; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    vendeurId: existing?.vendeurId ?? "",
    type: (existing?.type ?? "particulier") as "loueur" | "entreprise" | "particulier",
    bodyType: (existing?.bodyType ?? "") as string,
    marque: existing?.marque ?? "",
    modele: existing?.modele ?? "",
    finition: existing?.finition ?? "",
    transmission: (existing?.transmission ?? "manuelle") as "manuelle" | "automatique",
    carburant: (existing?.carburant ?? "essence") as "essence" | "diesel" | "essence_hybride" | "diesel_hybride" | "electrique",
    annee: existing?.annee ?? 2022,
    kilometrage: existing?.kilometrage ?? 50000,
    couleurExterieur: existing?.couleurExterieur ?? "",
    nombreCles: existing?.nombreCles ?? 2,
    opposition: existing?.opposition ?? false,
    mainLevee: existing?.mainLevee ?? true,
    puissanceFiscale: existing?.puissanceFiscale ?? 6,
    couleurInterieur: existing?.couleurInterieur ?? "",
    carteGriseBarree: existing?.carteGriseBarree ?? false,
    procuration: (existing?.procuration ?? "procuration") as "procuration" | "carton_ouvert" | "carton_ferme",
    prixPlancher: (existing?.prixPlancher ?? 0) as number,
    prixMinimum: (existing?.prixMinimum ?? 0) as number,
  });
  const [vendeurs, setVendeurs] = useState<{ id: string; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextId, setNextId] = useState(existing?.id ?? "—");
  const initialMarque = existing && CAR_CATALOG[existing.marque] ? existing.marque : existing?.marque ? "__autre__" : "";
  const initialModele = existing && initialMarque !== "__autre__" && CAR_CATALOG[existing.marque]?.includes(existing.modele) ? existing.modele : existing?.modele ? "__autre__" : "";
  const [marqueSel, setMarqueSel] = useState(initialMarque);
  const [modeleSel, setModeleSel] = useState(initialModele);

  const isMarqueAutre = marqueSel === "__autre__";
  const isModeleAutre = modeleSel === "__autre__";
  const modelOptions = !isMarqueAutre && marqueSel && CAR_CATALOG[marqueSel]
    ? CAR_CATALOG[marqueSel]
    : [];

  useEffect(() => {
    supabaseAdminApi.listUsers().then((users) => {
      setVendeurs(users.filter((u) => u.role === "vendeur" && u.actif).map((u) => ({ id: u.id, nom: u.nom })));
    });
    if (!isEdit) {
      supabaseAdminApi.listCars().then((cs) => {
        const maxNum = cs.reduce((m, c) => { const n = parseInt(c.id, 10); return Number.isFinite(n) && n > m ? n : m; }, 100);
        setNextId(String(maxNum + 1).padStart(5, "0"));
      });
    }
  }, [isEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.marque || !form.modele) {
      toast.error("Marque et modèle obligatoires");
      return;
    }
    if (!form.vendeurId) {
      toast.error("Veuillez assigner la voiture à un vendeur");
      return;
    }
    const vendeur = vendeurs.find((v) => v.id === form.vendeurId);
    setSaving(true);
    try {
      if (isEdit && existing) {
        await supabaseAdminApi.updateCar(existing.id, {
          ...form,
          vendeurNom: vendeur?.nom ?? existing.vendeurNom,
        });
        toast.success("Voiture mise à jour");
      } else {
        await supabaseAdminApi.createCar({
          ...form,
          vendeurNom: vendeur?.nom ?? "",
          prixAttendu: 0,
        });
        toast.success("Voiture créée et assignée au vendeur");
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const yesNo = [
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{isEdit ? `Modifier voiture ${existing!.id}` : "Nouvelle voiture"}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="ID">
            <input disabled value={nextId} className="input opacity-60 font-mono" />
          </Field>
          <Field label="Vendeur *">
            <Dropdown
              value={form.vendeurId}
              onChange={(v) => setForm({ ...form, vendeurId: v })}
              placeholder="— Choisir un vendeur —"
              ariaLabel="Vendeur"
              name="vendeurId"
              required
              options={vendeurs.map((v) => ({ value: v.id, label: v.nom }))}
            />
          </Field>
          <Field label="Type de vendeur">
            <Dropdown
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              ariaLabel="Type de vendeur"
              name="type"
              options={[
                { value: "particulier", label: "Particulier" },
                { value: "entreprise", label: "Entreprise" },
                { value: "loueur", label: "Loueur" },
              ]}
            />
          </Field>
          <Field label="Type (carrosserie)">
            <Dropdown
              value={form.bodyType}
              onChange={(v) => setForm({ ...form, bodyType: v })}
              placeholder="— Choisir le type —"
              ariaLabel="Type de carrosserie"
              name="bodyType"
              options={BODY_TYPES.map((b) => ({ value: b, label: b }))}
            />
          </Field>
          <Field label="Marque">
            <Dropdown
              value={marqueSel}
              onChange={(v) => {
                setMarqueSel(v);
                setModeleSel("");
                if (v === "__autre__") {
                  setForm({ ...form, marque: "", modele: "" });
                } else {
                  setForm({ ...form, marque: v, modele: "" });
                }
              }}
              placeholder="— Choisir une marque —"
              ariaLabel="Marque"
              name="marque"
              required
              options={[
                ...CAR_MAKES.map((m) => ({ value: m, label: m })),
                { value: "__autre__", label: "Autre" },
              ]}
            />
            {isMarqueAutre && (
              <input
                required
                value={form.marque}
                onChange={(e) => setForm({ ...form, marque: e.target.value })}
                placeholder="Saisir la marque"
                className="input mt-2"
              />
            )}
          </Field>
          <Field label="Modèle">
            {isMarqueAutre ? (
              <input
                required
                value={form.modele}
                onChange={(e) => setForm({ ...form, modele: e.target.value })}
                placeholder="Saisir le modèle"
                className="input"
              />
            ) : (
              <>
                <Dropdown
                  value={modeleSel}
                  onChange={(v) => {
                    setModeleSel(v);
                    if (v === "__autre__") {
                      setForm({ ...form, modele: "" });
                    } else {
                      setForm({ ...form, modele: v });
                    }
                  }}
                  placeholder={marqueSel ? "— Choisir un modèle —" : "Choisir une marque d'abord"}
                  ariaLabel="Modèle"
                  name="modele"
                  required
                  options={[
                    ...modelOptions.map((m) => ({ value: m, label: m })),
                    { value: "__autre__", label: "Autre" },
                  ]}
                />
                {isModeleAutre && (
                  <input
                    required
                    value={form.modele}
                    onChange={(e) => setForm({ ...form, modele: e.target.value })}
                    placeholder="Saisir le modèle"
                    className="input mt-2"
                  />
                )}
              </>
            )}
          </Field>
          <Field label="Finition"><input value={form.finition} onChange={(e) => setForm({ ...form, finition: e.target.value })} className="input" /></Field>
          <Field label="Transmission">
            <Dropdown
              value={form.transmission}
              onChange={(v) => setForm({ ...form, transmission: v as typeof form.transmission })}
              ariaLabel="Transmission"
              name="transmission"
              options={[
                { value: "manuelle", label: "Manuelle" },
                { value: "automatique", label: "Automatique" },
              ]}
            />
          </Field>
          <Field label="Carburant">
            <Dropdown
              value={form.carburant}
              onChange={(v) => setForm({ ...form, carburant: v as typeof form.carburant })}
              ariaLabel="Carburant"
              name="carburant"
              options={[
                { value: "essence", label: "Essence" },
                { value: "diesel", label: "Diesel" },
                { value: "essence_hybride", label: "Essence hybride" },
                { value: "diesel_hybride", label: "Diesel hybride" },
                { value: "electrique", label: "Électrique" },
              ]}
            />
          </Field>
          <Field label="MEC (Mise En Circulation)"><input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: +e.target.value })} className="input" /></Field>
          <Field label="Kilométrage"><input type="number" value={form.kilometrage} onChange={(e) => setForm({ ...form, kilometrage: +e.target.value })} className="input" /></Field>
          <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Zone prix (interne)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prix plancher (MAD)"><input type="number" min={0} value={form.prixPlancher} onChange={(e) => setForm({ ...form, prixPlancher: +e.target.value })} className="input" /></Field>
              <Field label="Prix minimum (MAD)"><input type="number" min={0} value={form.prixMinimum} onChange={(e) => setForm({ ...form, prixMinimum: +e.target.value })} className="input" /></Field>
            </div>
          </div>
          <Field label="Couleur extérieure"><input value={form.couleurExterieur} onChange={(e) => setForm({ ...form, couleurExterieur: e.target.value })} className="input" /></Field>
          <Field label="Couleur intérieure"><input value={form.couleurInterieur} onChange={(e) => setForm({ ...form, couleurInterieur: e.target.value })} className="input" /></Field>
          <Field label="Nombre de clés"><input type="number" min={0} value={form.nombreCles} onChange={(e) => setForm({ ...form, nombreCles: +e.target.value })} className="input" /></Field>
          <Field label="Puissance fiscale (CV)"><input type="number" min={1} value={form.puissanceFiscale} onChange={(e) => setForm({ ...form, puissanceFiscale: +e.target.value })} className="input" /></Field>
          <Field label="Opposition">
            <Dropdown
              value={form.opposition ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, opposition: v === "oui" })}
              ariaLabel="Opposition"
              name="opposition"
              options={yesNo}
            />
          </Field>
          <Field label="Main levée">
            <Dropdown
              value={form.mainLevee ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, mainLevee: v === "oui" })}
              ariaLabel="Main levée"
              name="mainLevee"
              options={yesNo}
            />
          </Field>
          <Field label="Carte grise barrée">
            <Dropdown
              value={form.carteGriseBarree ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, carteGriseBarree: v === "oui" })}
              ariaLabel="Carte grise barrée"
              name="carteGriseBarree"
              options={yesNo}
            />
          </Field>
          <Field label="Procuration">
            <Dropdown
              value={form.procuration}
              onChange={(v) => setForm({ ...form, procuration: v as typeof form.procuration })}
              ariaLabel="Procuration"
              name="procuration"
              options={[
                { value: "procuration", label: "Procuration" },
                { value: "carton_ouvert", label: "Carton ouvert" },
                { value: "carton_ferme", label: "Carton fermé" },
              ]}
            />
          </Field>
          <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
            <button disabled={saving} type="submit" className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? (isEdit ? "Enregistrement…" : "Création…") : isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
        <style>{`.input{height:36px;width:100%;border-radius:6px;border:1px solid var(--color-input);background:var(--color-background);padding:0 12px;font-size:14px;}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
