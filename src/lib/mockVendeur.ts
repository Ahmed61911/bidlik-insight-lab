/**
 * Mock seller backend.
 * In production, every call becomes an authenticated REST call to ASP.NET Core,
 * scoped to the logged-in seller (vendeurId from JWT). The frontend never
 * trusts client-supplied seller ids.
 */

import type {
  SellerCar,
  SellerPayout,
  SellerStats,
  SellerSubmitCarInput,
} from "@/types/vendeur";
import { mockAdminApi } from "./mockAdmin";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

let cars: SellerCar[] = [
  {
    id: "sc1",
    marque: "Mercedes-Benz",
    modele: "Classe C 220d",
    annee: 2021,
    kilometrage: 62000,
    prixAttendu: 320000,
    noteExpert: 9,
    stage: "en_enchere",
    soumisLe: "2026-04-08",
    expertNom: "Omar Tazi",
    prixCourant: 285000,
    bidCount: 14,
    prixFinal: null,
    acheteurNom: null,
    paymentStatus: null,
    deliveryStatus: null,
    carStatus: "en_cours",
    auctionId: "a1",
  },
  {
    id: "sc2",
    marque: "BMW",
    modele: "Série 3 320d",
    annee: 2019,
    kilometrage: 110000,
    prixAttendu: 280000,
    noteExpert: 7,
    stage: "vendu",
    soumisLe: "2026-03-22",
    expertNom: "Leila Berrada",
    prixCourant: 295000,
    bidCount: 31,
    prixFinal: 295000,
    acheteurNom: "Fatima Z.",
    paymentStatus: "paye",
    deliveryStatus: "livre",
    carStatus: "vendu_validee",
    auctionId: "a2",
  },
  {
    id: "sc3",
    marque: "Hyundai",
    modele: "Tucson",
    annee: 2022,
    kilometrage: 41000,
    prixAttendu: 240000,
    noteExpert: 8,
    stage: "en_attente_validation",
    soumisLe: "2026-04-18",
    expertNom: "Anas Cherkaoui",
    prixCourant: 245000,
    bidCount: 19,
    prixFinal: 245000,
    acheteurNom: "Nadia O.",
    paymentStatus: "non_paye",
    deliveryStatus: "non_livre",
    carStatus: "en_attente_validation",
    auctionId: "a3",
  },
  {
    id: "sc4",
    marque: "Volkswagen",
    modele: "Golf 7 GTD",
    annee: 2018,
    kilometrage: 132000,
    prixAttendu: 195000,
    noteExpert: null,
    stage: "brouillon",
    soumisLe: "2026-04-26",
    expertNom: null,
    prixCourant: null,
    bidCount: null,
    prixFinal: null,
    acheteurNom: null,
    paymentStatus: null,
    deliveryStatus: null,
    carStatus: "open",
    auctionId: null,
  },
  {
    id: "sc5",
    marque: "Renault",
    modele: "Captur",
    annee: 2021,
    kilometrage: 58000,
    prixAttendu: 175000,
    noteExpert: null,
    stage: "en_inspection",
    soumisLe: "2026-04-24",
    expertNom: "Omar Tazi",
    prixCourant: null,
    bidCount: null,
    prixFinal: null,
    acheteurNom: null,
    paymentStatus: null,
    deliveryStatus: null,
    carStatus: "open",
    auctionId: null,
  },
];

const payouts: SellerPayout[] = [
  { id: "p1", carId: "00104", carLabel: "BMW Série 3 320d (2019)", prixFinal: 295000, commission: 14750, net: 280250, status: "vire", date: "2026-04-20" },
  { id: "p2", carId: "00111", carLabel: "Toyota Yaris (2020)", prixFinal: 138000, commission: 6900, net: 131100, status: "vire", date: "2026-03-12" },
  { id: "p3", carId: "00107", carLabel: "Hyundai Tucson (2022)", prixFinal: 245000, commission: 12250, net: 232750, status: "en_attente", date: "2026-04-29" },
];

function computeStats(): SellerStats {
  const enInspection = cars.filter((c) => c.stage === "en_inspection").length;
  const enEnchereLive = cars.filter((c) => c.stage === "en_enchere").length;
  const venduMois = cars.filter((c) => c.stage === "vendu").length;
  const caBrutMois = cars
    .filter((c) => c.stage === "vendu")
    .reduce((s, c) => s + (c.prixFinal ?? 0), 0);
  const commissionMois = Math.round(caBrutMois * 0.05);
  const caNetMois = caBrutMois - commissionMois;
  const prochain = payouts.find((p) => p.status === "en_attente");
  return {
    voituresActives: cars.filter((c) => c.stage !== "annulee").length,
    enInspection,
    enEnchereLive,
    ventesValideesMois: venduMois,
    caBrutMois,
    commissionMois,
    caNetMois,
    prochainPaiement: prochain?.date ?? null,
    prochainPaiementMontant: prochain?.net ?? 0,
  };
}

export const mockVendeurApi = {
  async getStats(): Promise<SellerStats> {
    await delay(60);
    return computeStats();
  },
  async listCars(): Promise<SellerCar[]> {
    await delay(60);
    return [...cars];
  },
  async submitCar(input: SellerSubmitCarInput): Promise<SellerCar> {
    await delay(150);
    const created: SellerCar = {
      id: `sc${Date.now()}`,
      marque: input.marque,
      modele: input.modele,
      annee: input.annee,
      kilometrage: input.kilometrage,
      prixAttendu: input.prixAttendu,
      noteExpert: null,
      stage: "brouillon",
      soumisLe: new Date().toISOString().slice(0, 10),
      expertNom: null,
      prixCourant: null,
      bidCount: null,
      prixFinal: null,
      acheteurNom: null,
      paymentStatus: null,
      deliveryStatus: null,
      carStatus: "open",
      auctionId: null,
    };
    cars = [created, ...cars];
    // Push to admin queue for approval
    void mockAdminApi.addSubmission({
      vendeurNom: "Vendeur",
      marque: input.marque,
      modele: input.modele,
      annee: input.annee,
      kilometrage: input.kilometrage,
      prixAttendu: input.prixAttendu,
    });
    return created;
  },
  async cancelCar(id: string): Promise<void> {
    await delay(100);
    cars = cars.map((c) =>
      c.id === id && (c.stage === "brouillon" || c.stage === "en_inspection")
        ? { ...c, stage: "annulee" as const }
        : c,
    );
  },
  async listPayouts(): Promise<SellerPayout[]> {
    await delay(60);
    return [...payouts];
  },
};
