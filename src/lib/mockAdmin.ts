/**
 * Mock admin backend — lives alongside mockApi.
 *
 * In production all of these become authenticated REST calls to the
 * ASP.NET Core admin API, gated by RBAC ([Authorize(Roles = "Admin")]).
 * Frontend never trusts admin actions; it only renders state and dispatches
 * intent. The server is the source of truth.
 */

import type {
  AdminStats,
  AdminUser,
  Expert,
  ExpertAssignment,
  PendingSubmission,
  PendingValidation,
  RevenuePoint,
} from "@/types/admin";
import type { Auction, AuctionEvent, Car } from "@/types/auction";
import { addAuctionFromCar, addAuctionEvent } from "./mockApi";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

let users: AdminUser[] = [
  { id: "u1", nom: "Karim Benali", email: "karim.b@email.ma", telephone: "+212 6 12 34 56 78", role: "acheteur", cautionDeposee: true, cautionMontant: 20000, inscritLe: "2025-09-12", actif: true },
  { id: "u2", nom: "Fatima Zahra", email: "fatima.z@email.ma", telephone: "+212 6 23 45 67 89", role: "acheteur", cautionDeposee: true, cautionMontant: 20000, inscritLe: "2025-08-03", actif: true },
  { id: "u3", nom: "Youssef Amrani", email: "y.amrani@email.ma", telephone: "+212 6 34 56 78 90", role: "acheteur", cautionDeposee: false, cautionMontant: 0, inscritLe: "2026-01-15", actif: true },
  { id: "u4", nom: "Sara Mansouri", email: "sara.m@email.ma", telephone: "+212 6 45 67 89 01", role: "vendeur", cautionDeposee: false, cautionMontant: 0, inscritLe: "2025-11-21", actif: true },
  { id: "u5", nom: "Hicham El Idrissi", email: "h.idrissi@email.ma", telephone: "+212 6 56 78 90 12", role: "vendeur", cautionDeposee: false, cautionMontant: 0, inscritLe: "2025-07-09", actif: true },
  { id: "u6", nom: "Nadia Ouazzani", email: "n.ouazzani@email.ma", telephone: "+212 6 67 89 01 23", role: "acheteur", cautionDeposee: true, cautionMontant: 50000, inscritLe: "2025-05-30", actif: false },
  { id: "u7", nom: "Auto Maroc SARL", email: "contact@automaroc.ma", telephone: "+212 5 22 11 22 33", role: "vendeur", cautionDeposee: false, cautionMontant: 0, inscritLe: "2025-02-14", actif: true },
  { id: "u8", nom: "Omar Tazi", email: "o.tazi@bidlic.ma", telephone: "+212 6 78 90 12 34", role: "expert", cautionDeposee: false, cautionMontant: 0, inscritLe: "2025-01-10", actif: true },
  { id: "u9", nom: "Leila Berrada", email: "l.berrada@bidlic.ma", telephone: "+212 6 89 01 23 45", role: "expert", cautionDeposee: false, cautionMontant: 0, inscritLe: "2025-03-22", actif: true },
];

let experts: Expert[] = [
  { id: "e1", nom: "Omar Tazi", email: "o.tazi@bidlic.ma", ville: "Casablanca", inspectionsEnCours: 3, inspectionsTotal: 142, noteMoyenne: 7.8, actif: true },
  { id: "e2", nom: "Leila Berrada", email: "l.berrada@bidlic.ma", ville: "Rabat", inspectionsEnCours: 1, inspectionsTotal: 98, noteMoyenne: 8.1, actif: true },
  { id: "e3", nom: "Anas Cherkaoui", email: "a.cherkaoui@bidlic.ma", ville: "Marrakech", inspectionsEnCours: 5, inspectionsTotal: 211, noteMoyenne: 7.5, actif: true },
  { id: "e4", nom: "Mounia Slaoui", email: "m.slaoui@bidlic.ma", ville: "Tanger", inspectionsEnCours: 0, inspectionsTotal: 56, noteMoyenne: 8.4, actif: false },
];

let cars: (Car & { proprietaireId: string })[] = [
  { id: "00101", proprietaireId: "u7", vendeurId: "u7", vendeurNom: "Auto Maroc SARL", type: "particulier", marque: "Mercedes-Benz", modele: "Classe C 220d", finition: "AMG Line", transmission: "automatique", carburant: "diesel", annee: 2021, kilometrage: 62000, couleurExterieur: "Gris graphite", couleurInterieur: "Noir", noteExpert: 9, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 8, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "en_cours", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 320000, images: [] },
  { id: "00102", proprietaireId: "u4", vendeurId: "u4", vendeurNom: "Sara Mansouri", type: "particulier", marque: "Renault", modele: "Clio 5 Intens", finition: "Intens", transmission: "manuelle", carburant: "essence", annee: 2022, kilometrage: 38000, couleurExterieur: "Blanc nacré", couleurInterieur: "Gris", noteExpert: 8, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 6, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "en_cours", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 145000, images: [] },
  { id: "00103", proprietaireId: "u5", vendeurId: "u5", vendeurNom: "Hicham El Idrissi", type: "particulier", marque: "Dacia", finition: "Prestige", modele: "Duster Prestige", transmission: "manuelle", carburant: "diesel", annee: 2020, kilometrage: 95000, couleurExterieur: "Bleu cosmos", couleurInterieur: "Noir", noteExpert: 7, nombreCles: 1, opposition: false, mainLevee: true, puissanceFiscale: 7, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "en_cours", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 165000, images: [] },
  { id: "00104", proprietaireId: "u7", vendeurId: "u7", vendeurNom: "Auto Maroc SARL", type: "particulier", marque: "BMW", modele: "Série 3 320d", finition: "Sport", transmission: "automatique", carburant: "diesel", annee: 2019, kilometrage: 110000, couleurExterieur: "Noir saphir", couleurInterieur: "Beige", noteExpert: 7, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 8, carteGriseBarree: false, procuration: "procuration", dateVente: "2026-04-12", status: "vendu_validee", paymentStatus: "paye", deliveryStatus: "livre", prixAttendu: 280000, images: [] },
  { id: "00105", proprietaireId: "u4", vendeurId: "u4", vendeurNom: "Sara Mansouri", type: "particulier", marque: "Peugeot", modele: "208 GT Line", finition: "GT Line", transmission: "automatique", carburant: "essence", annee: 2021, kilometrage: 45000, couleurExterieur: "Rouge ultimate", couleurInterieur: "Noir", noteExpert: 9, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 6, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "open", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 155000, images: [] },
  { id: "00106", proprietaireId: "u5", vendeurId: "u5", vendeurNom: "Hicham El Idrissi", type: "particulier", marque: "Volkswagen", modele: "Golf 7 GTD", finition: "GTD", transmission: "automatique", carburant: "diesel", annee: 2018, kilometrage: 132000, couleurExterieur: "Blanc pur", couleurInterieur: "Noir", noteExpert: null, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 9, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "open", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 195000, images: [] },
  { id: "00107", proprietaireId: "u4", vendeurId: "u4", vendeurNom: "Sara Mansouri", type: "particulier", marque: "Audi", modele: "A3 Sportback", finition: "S Line", transmission: "automatique", carburant: "diesel", annee: 2020, kilometrage: 72000, couleurExterieur: "Gris Daytona", couleurInterieur: "Noir", noteExpert: 8, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 7, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "open", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 245000, images: [] },
  { id: "00108", proprietaireId: "u7", vendeurId: "u7", vendeurNom: "Auto Maroc SARL", type: "particulier", marque: "Kia", modele: "Sportage", finition: "GT Line", transmission: "automatique", carburant: "diesel", annee: 2021, kilometrage: 58000, couleurExterieur: "Rouge infra", couleurInterieur: "Noir", noteExpert: 9, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 8, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "open", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 285000, images: [] },
  { id: "00109", proprietaireId: "u5", vendeurId: "u5", vendeurNom: "Hicham El Idrissi", type: "particulier", marque: "Citroën", modele: "C3 Shine", finition: "Shine", transmission: "manuelle", carburant: "essence", annee: 2022, kilometrage: 28000, couleurExterieur: "Bleu", couleurInterieur: "Gris", noteExpert: 8, nombreCles: 2, opposition: false, mainLevee: true, puissanceFiscale: 6, carteGriseBarree: false, procuration: "procuration", dateVente: null, status: "open", paymentStatus: "non_paye", deliveryStatus: "non_livre", prixAttendu: 135000, images: [] },
];

let assignments: ExpertAssignment[] = [
  { id: "as1", carId: "00101", carLabel: "Mercedes-Benz Classe C 220d (2021)", expertId: "e1", expertNom: "Omar Tazi", status: "rapport_recu", assigneLe: "2026-04-10", rapportRecuLe: "2026-04-15", noteFinale: 9 },
  { id: "as2", carId: "00102", carLabel: "Renault Clio 5 Intens (2022)", expertId: "e2", expertNom: "Leila Berrada", status: "rapport_recu", assigneLe: "2026-04-12", rapportRecuLe: "2026-04-17", noteFinale: 8 },
  { id: "as3", carId: "00105", carLabel: "Peugeot 208 GT Line (2021)", expertId: "e3", expertNom: "Anas Cherkaoui", status: "en_inspection", assigneLe: "2026-04-25", rapportRecuLe: null, noteFinale: null },
  { id: "as4", carId: "00106", carLabel: "Volkswagen Golf 7 GTD (2018)", expertId: null, expertNom: null, status: "non_assigne", assigneLe: null, rapportRecuLe: null, noteFinale: null },
  { id: "as5", carId: "00107", carLabel: "Audi A3 Sportback (2020)", expertId: "e1", expertNom: "Omar Tazi", status: "rapport_recu", assigneLe: "2026-04-20", rapportRecuLe: "2026-04-26", noteFinale: 8 },
  { id: "as6", carId: "00108", carLabel: "Kia Sportage (2021)", expertId: "e2", expertNom: "Leila Berrada", status: "rapport_recu", assigneLe: "2026-04-22", rapportRecuLe: "2026-04-28", noteFinale: 9 },
  { id: "as7", carId: "00109", carLabel: "Citroën C3 Shine (2022)", expertId: "e3", expertNom: "Anas Cherkaoui", status: "rapport_recu", assigneLe: "2026-04-24", rapportRecuLe: "2026-04-30", noteFinale: 8 },
];

let pendingSubmissions: PendingSubmission[] = [
  { carId: "csub1", carLabel: "Toyota Yaris (2020)", vendeurNom: "Sara Mansouri", marque: "Toyota", modele: "Yaris", annee: 2020, kilometrage: 78000, prixAttendu: 105000, soumisLe: "2026-04-28" },
  { carId: "csub2", carLabel: "Ford Fiesta (2019)", vendeurNom: "Hicham El Idrissi", marque: "Ford", modele: "Fiesta", annee: 2019, kilometrage: 92000, prixAttendu: 88000, soumisLe: "2026-04-29" },
];

const inAuctionCarIds = new Set<string>(["00101", "00102", "00103"]); // a1, a2, a3 already linked

let pendingValidations: PendingValidation[] = [
  { auctionId: "a1", carId: "00101", carLabel: "Mercedes-Benz Classe C 220d (2021)", vendeurNom: "Auto Maroc SARL", acheteurNom: "Karim Benali", prixFinal: 285000, prixAttendu: 320000, termineLe: "il y a 2h", raison: "ecart_prix", adminValidationDeadline: null },
  { auctionId: "a3", carId: "00103", carLabel: "Dacia Duster Prestige (2020)", vendeurNom: "Hicham El Idrissi", acheteurNom: "Fatima Zahra", prixFinal: 138000, prixAttendu: 165000, termineLe: "il y a 5h", raison: "ecart_prix", adminValidationDeadline: null },
  { auctionId: "a7", carId: "00107", carLabel: "Hyundai Tucson (2022)", vendeurNom: "Auto Maroc SARL", acheteurNom: "Nadia Ouazzani", prixFinal: 245000, prixAttendu: 240000, termineLe: "hier", raison: "verification_paiement", adminValidationDeadline: null },
];

const stats: AdminStats = {
  totalAuctions: 287,
  liveAuctions: 14,
  totalUsers: 1342,
  acheteursActifs: 612,
  vendeursActifs: 84,
  experts: 4,
  ventesValideesMois: 47,
  caMois: 612000,    // commission MAD
  volumeMois: 12240000,
  totalVentesValidees: 86400000,
  totalVentesEncaissees: 54200000,
  tauxConversion: 0.71,
  enchersValidationsEnAttente: pendingValidations.length,
};

function buildRevenue(): RevenuePoint[] {
  const out: RevenuePoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const ventes = 1 + Math.floor(Math.random() * 4);
    out.push({
      date: d.toISOString().slice(0, 10),
      ventes,
      ca: ventes * (8000 + Math.floor(Math.random() * 12000)),
    });
  }
  return out;
}

const revenue = buildRevenue();

export const mockAdminApi = {
  async getStats(): Promise<AdminStats> {
    await delay(60);
    return { ...stats, enchersValidationsEnAttente: pendingValidations.length };
  },
  async getRevenue(): Promise<RevenuePoint[]> {
    await delay(60);
    return [...revenue];
  },
  async listUsers(): Promise<AdminUser[]> {
    await delay(60);
    return [...users];
  },
  async toggleUserActive(id: string): Promise<void> {
    await delay(80);
    users = users.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u));
  },
  async createUser(input: { nom: string; email: string; telephone: string; role: "admin" | "expert" | "vendeur" }): Promise<AdminUser> {
    await delay(120);
    if (!input.nom.trim() || !input.email.trim()) throw new Error("Nom et email obligatoires");
    if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("Un compte existe déjà avec cet email");
    }
    const created: AdminUser = {
      id: `u${Date.now()}`,
      nom: input.nom.trim(),
      email: input.email.trim(),
      telephone: input.telephone.trim(),
      role: input.role,
      cautionDeposee: false,
      cautionMontant: 0,
      inscritLe: new Date().toISOString().slice(0, 10),
      actif: true,
    };
    users = [created, ...users];
    if (input.role === "expert") {
      experts = [
        {
          id: `e${Date.now()}`,
          nom: created.nom,
          email: created.email,
          ville: "—",
          inspectionsEnCours: 0,
          inspectionsTotal: 0,
          noteMoyenne: 0,
          actif: true,
        },
        ...experts,
      ];
    }
    return created;
  },
  async listExperts(): Promise<Expert[]> {
    await delay(60);
    return [...experts];
  },
  async listCars(): Promise<(Car & { proprietaireId: string })[]> {
    await delay(60);
    return [...cars];
  },
  async createCar(input: Partial<Car> & Pick<Car, "marque" | "modele" | "annee" | "prixAttendu">): Promise<Car> {
    await delay(120);
    const maxNum = cars.reduce((m, c) => { const n = parseInt(c.id, 10); return Number.isFinite(n) && n > m ? n : m; }, 100);
    const id = String(maxNum + 1).padStart(5, "0");
    const created: Car & { proprietaireId: string } = {
      id,
      proprietaireId: "admin",
      vendeurId: input.vendeurId ?? "admin",
      vendeurNom: input.vendeurNom ?? "Bidlic",
      type: input.type ?? "particulier",
      finition: input.finition ?? "",
      transmission: input.transmission ?? "manuelle",
      carburant: input.carburant ?? "essence",
      kilometrage: input.kilometrage ?? 0,
      couleurExterieur: input.couleurExterieur ?? "—",
      couleurInterieur: input.couleurInterieur ?? "—",
      noteExpert: null,
      nombreCles: input.nombreCles ?? 1,
      opposition: false,
      mainLevee: true,
      puissanceFiscale: input.puissanceFiscale ?? 6,
      carteGriseBarree: false,
      procuration: input.procuration ?? "procuration",
      dateVente: null,
      status: "open",
      paymentStatus: "non_paye",
      deliveryStatus: "non_livre",
      prixAttendu: input.prixAttendu,
      images: [],
      marque: input.marque,
      modele: input.modele,
      annee: input.annee,
    };
    cars = [created, ...cars];
    assignments = [
      {
        id: `as${Date.now()}`,
        carId: id,
        carLabel: `${created.marque} ${created.modele} (${created.annee})`,
        expertId: null,
        expertNom: null,
        status: "non_assigne",
        assigneLe: null,
        rapportRecuLe: null,
        noteFinale: null,
      },
      ...assignments,
    ];
    return created;
  },
  async updateCar(id: string, patch: Partial<Car>): Promise<Car> {
    await delay(100);
    let updated: (Car & { proprietaireId: string }) | null = null;
    cars = cars.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...patch, id: c.id };
      return updated;
    });
    if (!updated) throw new Error("Voiture introuvable");
    // keep assignment label in sync
    assignments = assignments.map((a) =>
      a.carId === id
        ? { ...a, carLabel: `${updated!.marque} ${updated!.modele} (${updated!.annee})` }
        : a,
    );
    return updated;
  },
  async deleteCar(id: string): Promise<void> {
    await delay(100);
    cars = cars.filter((c) => c.id !== id);
    assignments = assignments.filter((a) => a.carId !== id);
  },
  async listAssignments(): Promise<ExpertAssignment[]> {
    await delay(60);
    return [...assignments];
  },
  async assignExpert(carId: string, expertId: string): Promise<void> {
    await delay(120);
    const expert = experts.find((e) => e.id === expertId);
    if (!expert) throw new Error("Expert introuvable");
    assignments = assignments.map((a) =>
      a.carId === carId
        ? {
            ...a,
            expertId,
            expertNom: expert.nom,
            status: "en_inspection",
            assigneLe: new Date().toISOString().slice(0, 10),
          }
        : a,
    );
  },
  async listPendingValidations(): Promise<PendingValidation[]> {
    await delay(60);
    return [...pendingValidations];
  },
  async validateAuction(auctionId: string, decision: "validee" | "annulee"): Promise<void> {
    await delay(150);
    pendingValidations = pendingValidations.filter((p) => p.auctionId !== auctionId);
    if (decision === "validee") stats.ventesValideesMois += 1;
  },
  async listSubmissions(): Promise<PendingSubmission[]> {
    await delay(60);
    return [...pendingSubmissions];
  },
  async approveSubmission(carId: string): Promise<void> {
    await delay(120);
    const sub = pendingSubmissions.find((s) => s.carId === carId);
    if (!sub) throw new Error("Soumission introuvable");
    pendingSubmissions = pendingSubmissions.filter((s) => s.carId !== carId);
    const created: Car & { proprietaireId: string } = {
      id: sub.carId,
      proprietaireId: sub.vendeurNom,
      vendeurId: sub.vendeurNom,
      vendeurNom: sub.vendeurNom,
      type: "particulier",
      marque: sub.marque,
      modele: sub.modele,
      finition: "",
      transmission: "manuelle",
      carburant: "essence",
      annee: sub.annee,
      kilometrage: sub.kilometrage,
      couleurExterieur: "—",
      couleurInterieur: "—",
      noteExpert: null,
      nombreCles: 1,
      opposition: false,
      mainLevee: true,
      puissanceFiscale: 6,
      carteGriseBarree: false,
      procuration: "procuration",
      dateVente: null,
      status: "open",
      paymentStatus: "non_paye",
      deliveryStatus: "non_livre",
      prixAttendu: sub.prixAttendu,
      images: [],
    };
    cars = [created, ...cars];
    assignments = [
      {
        id: `as-${Date.now()}`,
        carId: sub.carId,
        carLabel: `${sub.marque} ${sub.modele} (${sub.annee})`,
        expertId: null,
        expertNom: null,
        status: "non_assigne",
        assigneLe: null,
        rapportRecuLe: null,
        noteFinale: null,
      },
      ...assignments,
    ];
  },
  async rejectSubmission(carId: string): Promise<void> {
    await delay(80);
    pendingSubmissions = pendingSubmissions.filter((s) => s.carId !== carId);
  },
  async addSubmission(sub: { vendeurNom: string; marque: string; modele: string; annee: number; kilometrage: number; prixAttendu: number }): Promise<void> {
    const carId = `csub-${Date.now()}`;
    pendingSubmissions = [
      {
        carId,
        carLabel: `${sub.marque} ${sub.modele} (${sub.annee})`,
        vendeurNom: sub.vendeurNom,
        marque: sub.marque,
        modele: sub.modele,
        annee: sub.annee,
        kilometrage: sub.kilometrage,
        prixAttendu: sub.prixAttendu,
        soumisLe: new Date().toISOString().slice(0, 10),
      },
      ...pendingSubmissions,
    ];
  },
  async listExpertiseReady(): Promise<(Car & { proprietaireId: string; noteFinale: number })[]> {
    await delay(60);
    return cars
      .filter((c) => {
        const a = assignments.find((x) => x.carId === c.id);
        return a?.status === "rapport_recu" && !inAuctionCarIds.has(c.id);
      })
      .map((c) => {
        const a = assignments.find((x) => x.carId === c.id)!;
        return { ...c, noteFinale: a.noteFinale ?? 0 };
      });
  },
  async createAuctionFromCar(
    carId: string,
    opts: {
      startingPrice: number;
      durationHours: number;
      startsAt?: string;
      visibility?: "ouvert" | "ferme";
      auctionType?: "ouverte" | "fermee";
      minimumAcceptedPrice?: number;
    },
  ): Promise<Auction> {
    await delay(150);
    const car = cars.find((c) => c.id === carId);
    if (!car) throw new Error("Voiture introuvable");
    const a = assignments.find((x) => x.carId === carId);
    if (!a || a.status !== "rapport_recu") throw new Error("La voiture doit être expertisée avant la mise en enchère");
    if (inAuctionCarIds.has(carId)) throw new Error("Cette voiture est déjà en enchère");
    if (opts.auctionType === "fermee") {
      if (!opts.minimumAcceptedPrice || opts.minimumAcceptedPrice <= 0) {
        throw new Error("Prix minimum accepté requis pour une enchère à enveloppe fermée");
      }
    }
    const auction = addAuctionFromCar(car, opts);
    inAuctionCarIds.add(carId);
    cars = cars.map((c) => (c.id === carId ? { ...c, status: "en_cours", minimumAcceptedPrice: opts.minimumAcceptedPrice ?? c.minimumAcceptedPrice } : c));
    return auction;
  },

  /**
   * Create a multi-car auction event. Each car becomes its own lot (Auction)
   * with independent bidding, all sharing the same start/end window.
   */
  async createMultiCarEvent(input: {
    title: string;
    durationHours: number;
    startsAt?: string;
    visibility: "ouvert" | "ferme";
    auctionType?: "ouverte" | "fermee";
    items: { carId: string; startingPrice: number; minimumAcceptedPrice?: number }[];
  }): Promise<AuctionEvent> {
    await delay(200);
    if (input.items.length === 0) throw new Error("Sélectionnez au moins une voiture");
    const auctionType = input.auctionType ?? (input.visibility === "ferme" ? "fermee" : "ouverte");
    const startsAtMs = input.startsAt ? new Date(input.startsAt).getTime() : Date.now();
    const startsAt = new Date(startsAtMs).toISOString();
    const endsAt = new Date(startsAtMs + input.durationHours * 3600_000).toISOString();
    const lotIds: string[] = [];
    for (const it of input.items) {
      const car = cars.find((c) => c.id === it.carId);
      if (!car) throw new Error(`Voiture ${it.carId} introuvable`);
      const a = assignments.find((x) => x.carId === it.carId);
      if (!a || a.status !== "rapport_recu") throw new Error(`Voiture ${it.carId} non expertisée`);
      if (inAuctionCarIds.has(it.carId)) throw new Error(`Voiture ${it.carId} déjà en enchère`);
      if (auctionType === "fermee" && (!it.minimumAcceptedPrice || it.minimumAcceptedPrice <= 0)) {
        throw new Error(`Prix minimum accepté requis pour ${car.marque} ${car.modele}`);
      }
      const lot = addAuctionFromCar(car, {
        startingPrice: it.startingPrice,
        durationHours: input.durationHours,
        startsAt,
        visibility: input.visibility,
        auctionType,
        minimumAcceptedPrice: it.minimumAcceptedPrice,
      });
      lotIds.push(lot.id);
      inAuctionCarIds.add(it.carId);
      cars = cars.map((c) => (c.id === it.carId ? { ...c, status: "en_cours", minimumAcceptedPrice: it.minimumAcceptedPrice ?? c.minimumAcceptedPrice } : c));
    }
    return addAuctionEvent({
      title: input.title,
      startsAt,
      endsAt,
      visibility: input.visibility,
      lotIds,
    });
  },
};
