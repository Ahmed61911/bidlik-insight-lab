/**
 * Real expert API backed by Supabase.
 * Inspections = expert_assignments rows assigned to the logged-in expert
 * joined with cars + vendor profiles.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ExpertInspection,
  ExpertReport,
  ExpertStats,
  InspectionChecklist,
} from "@/types/expert";

const DEADLINE_DAYS = 7;

function fmtDate(d: string | Date | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function addDays(iso: string | null, days: number): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

async function currentExpertId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

type RawAssignment = {
  id: string;
  car_id: string;
  expert_id: string | null;
  status: string;
  assigne_le: string | null;
  rapport_recu_le: string | null;
  note_finale: number | null;
};

async function fetchInspections(expertId: string): Promise<ExpertInspection[]> {
  const { data: rows, error } = await supabase
    .from("expert_assignments")
    .select("*")
    .eq("expert_id", expertId)
    .order("assigne_le", { ascending: false, nullsFirst: false });
  if (error) throw error;
  const assignments = (rows ?? []) as RawAssignment[];
  if (assignments.length === 0) return [];

  const carIds = Array.from(new Set(assignments.map((a) => a.car_id)));
  const { data: cars, error: cErr } = await supabase
    .from("cars")
    .select("id, marque, modele, annee, kilometrage, vendeur_id, vendeur_nom")
    .in("id", carIds);
  if (cErr) throw cErr;
  const carMap = new Map((cars ?? []).map((c) => [c.id, c]));

  const vendorIds = Array.from(
    new Set((cars ?? []).map((c) => c.vendeur_id).filter((v): v is string => !!v)),
  );
  const villeByVendor = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, ville")
      .in("user_id", vendorIds);
    (profs ?? []).forEach((p) => villeByVendor.set(p.user_id, p.ville ?? ""));
  }

  return assignments.map((a) => {
    const car = carMap.get(a.car_id);
    const stage = a.status === "rapport_recu" ? "rapport_recu" : "en_inspection";
    return {
      id: a.id,
      carId: a.car_id,
      carLabel: car ? `${car.marque} ${car.modele} (${car.annee})` : a.car_id,
      marque: car?.marque ?? "",
      modele: car?.modele ?? "",
      annee: car?.annee ?? 0,
      kilometrage: car?.kilometrage ?? 0,
      vendeurNom: car?.vendeur_nom ?? "—",
      ville: (car?.vendeur_id && villeByVendor.get(car.vendeur_id)) || "—",
      assigneLe: fmtDate(a.assigne_le),
      echeance: addDays(a.assigne_le, DEADLINE_DAYS),
      stage,
      noteFinale: a.note_finale,
      rapportRecuLe: a.rapport_recu_le ? fmtDate(a.rapport_recu_le) : null,
    } satisfies ExpertInspection;
  });
}

export const supabaseExpertApi = {
  async getStats(): Promise<ExpertStats> {
    const expertId = await currentExpertId();
    const items = await fetchInspections(expertId);
    const enCours = items.filter((i) => i.stage === "en_inspection");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const reportsMonth = items.filter(
      (i) => i.stage === "rapport_recu" && i.rapportRecuLe && new Date(i.rapportRecuLe) >= monthStart,
    );
    const allReports = items.filter((i) => i.stage === "rapport_recu" && i.noteFinale != null);
    const avg =
      allReports.length === 0
        ? 0
        : allReports.reduce((s, i) => s + (i.noteFinale ?? 0), 0) / allReports.length;
    const prochaine = enCours.map((i) => i.echeance).sort()[0] ?? null;
    return {
      enCours: enCours.length,
      rapportsCeMois: reportsMonth.length,
      noteMoyenneDonnee: Number(avg.toFixed(1)),
      prochaineEcheance: prochaine,
    };
  },

  async listInspections(): Promise<ExpertInspection[]> {
    const expertId = await currentExpertId();
    return fetchInspections(expertId);
  },

  async getInspection(id: string): Promise<ExpertInspection> {
    const expertId = await currentExpertId();
    const all = await fetchInspections(expertId);
    const found = all.find((i) => i.id === id);
    if (!found) throw new Error("Inspection introuvable");
    return found;
  },

  computeNote(c: InspectionChecklist): number {
    const avg = (c.carrosserie + c.moteur + c.interieur + c.pneus + c.electronique) / 5;
    const docsBonus = c.documents ? 0 : -0.5;
    return Math.max(0, Math.min(10, Number((avg + docsBonus).toFixed(1))));
  },

  async submitReport(report: ExpertReport): Promise<void> {
    // 1. Look up assignment to get car_id
    const { data: assignment, error: aErr } = await supabase
      .from("expert_assignments")
      .select("car_id")
      .eq("id", report.inspectionId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) throw new Error("Inspection introuvable");
    const carId = assignment.car_id;

    // 2. Optionally update car details when expert confirmed them
    if (report.carDetails && report.detailsConfirmes) {
      const d = report.carDetails;
      const updates: {
        marque: string;
        modele: string;
        annee: number;
        kilometrage: number;
        couleur_exterieur?: string;
      } = {
        marque: d.marque,
        modele: d.modele,
        annee: d.annee,
        kilometrage: d.kilometrage,
      };
      if (d.couleur && d.couleur !== "—") updates.couleur_exterieur = d.couleur;
      const { error: uErr } = await supabase.from("cars").update(updates).eq("id", carId);
      if (uErr) throw uErr;
    }


    // 3. Append commercial images to the car (kept in cars.images JSON)
    if (report.images && report.images.length > 0) {
      const { data: car } = await supabase
        .from("cars")
        .select("images")
        .eq("id", carId)
        .maybeSingle();
      const existing = Array.isArray(car?.images) ? (car?.images as string[]) : [];
      const merged = [...existing, ...report.images].slice(0, 24);
      await supabase.from("cars").update({ images: merged }).eq("id", carId);
    }

    // 4. Submit the final note via RPC (rounds to nearest int 0-10)
    const note = Math.round(Math.max(0, Math.min(10, report.noteFinale)));
    const { error: rErr } = await supabase.rpc("submit_expert_report", {
      p_car_id: carId,
      p_note: note,
    });
    if (rErr) throw rErr;
  },
};
