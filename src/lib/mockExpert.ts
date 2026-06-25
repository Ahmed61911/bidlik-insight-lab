/**
 * Mock expert backend.
 * Production: each call is an authenticated REST call scoped to the
 * logged-in expert (expertId from JWT). The /10 note submitted by an expert
 * is final and triggers the auction-ready state on the backend.
 */

import type {
  ExpertInspection,
  ExpertReport,
  ExpertStats,
  InspectionChecklist,
} from "@/types/expert";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

let inspections: ExpertInspection[] = [
  {
    id: "ins1",
    carId: "00105",
    carLabel: "Peugeot 208 GT Line (2021)",
    marque: "Peugeot",
    modele: "208 GT Line",
    annee: 2021,
    kilometrage: 45000,
    vendeurNom: "Sara Mansouri",
    ville: "Casablanca",
    assigneLe: "2026-04-25",
    echeance: "2026-05-02",
    stage: "en_inspection",
    noteFinale: null,
    rapportRecuLe: null,
  },
  {
    id: "ins2",
    carId: "cr1",
    carLabel: "Renault Captur (2021)",
    marque: "Renault",
    modele: "Captur",
    annee: 2021,
    kilometrage: 58000,
    vendeurNom: "Hicham El Idrissi",
    ville: "Rabat",
    assigneLe: "2026-04-24",
    echeance: "2026-05-01",
    stage: "en_inspection",
    noteFinale: null,
    rapportRecuLe: null,
  },
  {
    id: "ins3",
    carId: "cr2",
    carLabel: "Citroën C3 Aircross (2020)",
    marque: "Citroën",
    modele: "C3 Aircross",
    annee: 2020,
    kilometrage: 76000,
    vendeurNom: "Karim Benali",
    ville: "Marrakech",
    assigneLe: "2026-04-22",
    echeance: "2026-04-29",
    stage: "en_inspection",
    noteFinale: null,
    rapportRecuLe: null,
  },
  {
    id: "ins4",
    carId: "00101",
    carLabel: "Mercedes-Benz Classe C 220d (2021)",
    marque: "Mercedes-Benz",
    modele: "Classe C 220d",
    annee: 2021,
    kilometrage: 62000,
    vendeurNom: "Auto Maroc SARL",
    ville: "Casablanca",
    assigneLe: "2026-04-10",
    echeance: "2026-04-17",
    stage: "rapport_recu",
    noteFinale: 9,
    rapportRecuLe: "2026-04-15",
  },
  {
    id: "ins5",
    carId: "00102",
    carLabel: "Renault Clio 5 Intens (2022)",
    marque: "Renault",
    modele: "Clio 5 Intens",
    annee: 2022,
    kilometrage: 38000,
    vendeurNom: "Sara Mansouri",
    ville: "Casablanca",
    assigneLe: "2026-04-12",
    echeance: "2026-04-19",
    stage: "rapport_recu",
    noteFinale: 8,
    rapportRecuLe: "2026-04-17",
  },
];

export const mockExpertApi = {
  async getStats(): Promise<ExpertStats> {
    await delay(60);
    const enCours = inspections.filter((i) => i.stage === "en_inspection");
    const rapports = inspections.filter((i) => i.stage === "rapport_recu");
    const noteMoyenne =
      rapports.length === 0
        ? 0
        : rapports.reduce((s, i) => s + (i.noteFinale ?? 0), 0) / rapports.length;
    const prochaineEcheance = enCours
      .map((i) => i.echeance)
      .sort()[0] ?? null;
    return {
      enCours: enCours.length,
      rapportsCeMois: rapports.length,
      noteMoyenneDonnee: Number(noteMoyenne.toFixed(1)),
      prochaineEcheance,
    };
  },
  async listInspections(): Promise<ExpertInspection[]> {
    await delay(60);
    return [...inspections];
  },
  async getInspection(id: string): Promise<ExpertInspection> {
    await delay(60);
    const i = inspections.find((x) => x.id === id);
    if (!i) throw new Error("Inspection introuvable");
    return { ...i };
  },
  computeNote(c: InspectionChecklist): number {
    const avg = (c.carrosserie + c.moteur + c.interieur + c.pneus + c.electronique) / 5;
    const docsBonus = c.documents ? 0 : -0.5;
    return Math.max(0, Math.min(10, Number((avg + docsBonus).toFixed(1))));
  },
  async submitReport(report: ExpertReport): Promise<void> {
    await delay(180);
    inspections = inspections.map((i) =>
      i.id === report.inspectionId
        ? {
            ...i,
            stage: "rapport_recu" as const,
            noteFinale: report.noteFinale,
            rapportRecuLe: new Date().toISOString().slice(0, 10),
          }
        : i,
    );
  },
};
