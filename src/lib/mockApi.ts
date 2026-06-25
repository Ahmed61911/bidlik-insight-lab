/**
 * Mock backend — simulates the ASP.NET Core API for frontend-only dev.
 * Behaviors mirror the real server contract:
 *  - bids must exceed current price (server-side check)
 *  - auctions auto-close at endsAt
 *  - emits realtime events through the in-process realtime bus
 */

import type { Auction, AuctionEvent, Bid, Car, Offer } from "@/types/auction";
import type { ApiClient, PlaceBidInput, SubmitOfferInput } from "./api";
import { realtimeBus } from "./realtime";
import { getCarImages } from "./carImages";

function makeCar(partial: Partial<Car> & Pick<Car, "id" | "marque" | "modele" | "annee">): Car {
  return {
    vendeurId: "v1",
    vendeurNom: "Auto Maroc SARL",
    type: "particulier",
    finition: "Premium",
    transmission: "automatique",
    carburant: "diesel",
    kilometrage: 85000,
    couleurExterieur: "Noir",
    couleurInterieur: "Beige",
    noteExpert: 8,
    nombreCles: 2,
    opposition: false,
    mainLevee: true,
    puissanceFiscale: 8,
    carteGriseBarree: false,
    procuration: "procuration",
    dateVente: null,
    status: "en_cours",
    paymentStatus: "non_paye",
    deliveryStatus: "non_livre",
    prixAttendu: 180000,
    images: [],
    ...partial,
  };
}

const now = Date.now();
const inHours = (h: number) => new Date(now + h * 3600_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

const seedAuctions: Auction[] = [
  {
    id: "a1",
    car: makeCar({
      id: "00101",
      marque: "Mercedes-Benz",
      modele: "Classe C 220d",
      annee: 2021,
      kilometrage: 62000,
      couleurExterieur: "Gris graphite",
      prixAttendu: 320000,
      noteExpert: 9,
    }),
    startsAt: hoursAgo(2),
    endsAt: inHours(22),
    startingPrice: 250000,
    currentPrice: 285000,
    bidCount: 14,
    status: "live",
    visibility: "ouvert",
    auctionType: "ouverte",
    topBidderId: "u9",
  },
  {
    id: "a2",
    car: makeCar({
      id: "00102",
      marque: "Renault",
      modele: "Clio 5 Intens",
      annee: 2022,
      kilometrage: 38000,
      couleurExterieur: "Blanc nacré",
      prixAttendu: 145000,
      noteExpert: 8,
    }),
    startsAt: hoursAgo(5),
    endsAt: inHours(19),
    startingPrice: 110000,
    currentPrice: 152000,
    bidCount: 22,
    status: "live",
    visibility: "ouvert",
    auctionType: "ouverte",
    topBidderId: "u3",
  },
  {
    id: "a3",
    car: makeCar({
      id: "00103",
      marque: "Dacia",
      modele: "Duster Prestige",
      annee: 2020,
      kilometrage: 95000,
      couleurExterieur: "Bleu cosmos",
      prixAttendu: 165000,
      noteExpert: 7,
    }),
    startsAt: hoursAgo(1),
    endsAt: inHours(23),
    startingPrice: 120000,
    currentPrice: 138000,
    bidCount: 8,
    status: "live",
    visibility: "ouvert",
    auctionType: "ouverte",
    topBidderId: "u7",
  },
  {
    id: "a4",
    car: makeCar({
      id: "00104",
      marque: "BMW",
      modele: "Série 3 320d",
      annee: 2019,
      kilometrage: 110000,
      couleurExterieur: "Noir saphir",
      prixAttendu: 280000,
      noteExpert: 7,
      status: "vendu_validee",
    }),
    startsAt: hoursAgo(48),
    endsAt: hoursAgo(24),
    startingPrice: 200000,
    currentPrice: 295000,
    bidCount: 31,
    status: "validated",
    visibility: "ouvert",
    auctionType: "ouverte",
    topBidderId: "u2",
  },
  {
    id: "a5",
    car: makeCar({
      id: "00105",
      marque: "Peugeot",
      modele: "208 GT Line",
      annee: 2021,
      kilometrage: 45000,
      couleurExterieur: "Rouge ultimate",
      prixAttendu: 155000,
      noteExpert: 9,
    }),
    startsAt: hoursAgo(72),
    endsAt: hoursAgo(48),
    startingPrice: 110000,
    currentPrice: 148000,
    bidCount: 18,
    status: "closed",
    visibility: "ouvert",
    auctionType: "ouverte",
    topBidderId: "u5",
  },
  {
    id: "a6",
    car: makeCar({
      id: "00106",
      marque: "Audi",
      modele: "A4 Avant 35 TDI",
      annee: 2022,
      kilometrage: 28000,
      couleurExterieur: "Blanc glacier",
      prixAttendu: 380000,
      noteExpert: 9,
      minimumAcceptedPrice: 320000,
    }),
    startsAt: hoursAgo(1),
    endsAt: inHours(30),
    startingPrice: 320000,
    currentPrice: 320000,
    bidCount: 0,
    status: "live",
    visibility: "ferme",
    auctionType: "fermee",
    topBidderId: null,
  },
  {
    id: "a7",
    car: makeCar({
      id: "00107",
      marque: "BMW",
      modele: "Série 3 320d",
      annee: 2021,
      kilometrage: 52000,
      couleurExterieur: "Noir saphir",
      prixAttendu: 295000,
      noteExpert: 8,
      minimumAcceptedPrice: 250000,
    }),
    startsAt: hoursAgo(2),
    endsAt: inHours(22),
    startingPrice: 250000,
    currentPrice: 250000,
    bidCount: 0,
    status: "live",
    visibility: "ferme",
    auctionType: "fermee",
    topBidderId: null,
  },
  {
    id: "a8",
    car: makeCar({
      id: "00108",
      marque: "Mercedes-Benz",
      modele: "Classe C 220d",
      annee: 2022,
      kilometrage: 35000,
      couleurExterieur: "Gris sélénite",
      prixAttendu: 420000,
      noteExpert: 9,
      minimumAcceptedPrice: 360000,
    }),
    startsAt: hoursAgo(2),
    endsAt: inHours(22),
    startingPrice: 360000,
    currentPrice: 360000,
    bidCount: 0,
    status: "live",
    visibility: "ferme",
    auctionType: "fermee",
    topBidderId: null,
  },
  {
    id: "a9",
    car: makeCar({
      id: "00109",
      marque: "Volkswagen",
      modele: "Golf 8 GTD",
      annee: 2023,
      kilometrage: 18000,
      couleurExterieur: "Bleu Atlantic",
      prixAttendu: 340000,
      noteExpert: 9,
      minimumAcceptedPrice: 290000,
    }),
    startsAt: hoursAgo(2),
    endsAt: inHours(22),
    startingPrice: 290000,
    currentPrice: 290000,
    bidCount: 0,
    status: "live",
    visibility: "ferme",
    auctionType: "fermee",
    topBidderId: null,
  },
];

// Attach brand-specific images to each seeded car.
for (const a of seedAuctions) {
  a.car.images = getCarImages(a.car.marque);
}

// Group existing seed auctions into events (multi-car sales).
// EV1 = live event grouping a1,a2,a3. EV2 = scheduled event with a6.
seedAuctions.find((a) => a.id === "a1")!.eventId = "0031";
seedAuctions.find((a) => a.id === "a2")!.eventId = "0031";
seedAuctions.find((a) => a.id === "a3")!.eventId = "0031";
seedAuctions.find((a) => a.id === "a6")!.eventId = "0032";
seedAuctions.find((a) => a.id === "a7")!.eventId = "0033";
seedAuctions.find((a) => a.id === "a8")!.eventId = "0033";
seedAuctions.find((a) => a.id === "a9")!.eventId = "0033";

const events = new Map<string, AuctionEvent>([
  [
    "0031",
    {
      id: "0031",
      title: "Vente du jour — Casablanca",
      startsAt: hoursAgo(5),
      endsAt: inHours(19),
      status: "live",
      visibility: "ouvert",
      lotIds: ["a1", "a2", "a3"],
    },
  ],
  [
    "0032",
    {
      id: "0032",
      title: "Vente programmée — Premium",
      startsAt: inHours(6),
      endsAt: inHours(30),
      status: "scheduled",
      visibility: "ouvert",
      lotIds: ["a6"],
    },
  ],
  [
    "0033",
    {
      id: "0033",
      title: "Vente confidentielle — Enveloppes fermées",
      startsAt: hoursAgo(2),
      endsAt: inHours(22),
      status: "live",
      visibility: "ferme",
      lotIds: ["a7", "a8", "a9"],
    },
  ],
]);

const auctions = new Map<string, Auction>(seedAuctions.map((a) => [a.id, a]));
const bidsByAuction = new Map<string, Bid[]>();
const offersByAuction = new Map<string, Offer[]>();

// seed a few bid history entries (only for open auctions)
for (const a of seedAuctions) {
  if (a.auctionType === "fermee") continue;
  const list: Bid[] = [];
  let price = a.startingPrice;
  const bidders = ["Karim B.", "Fatima Z.", "Youssef A.", "Sara M.", "Hicham E."];
  for (let i = 0; i < Math.min(a.bidCount, 8); i++) {
    price += 1000 + Math.floor(Math.random() * 4) * 1000;
    list.push({
      id: `b${a.id}-${i}`,
      auctionId: a.id,
      carId: a.car.id,
      bidderId: `u${i}`,
      bidderName: bidders[i % bidders.length],
      amount: price,
      createdAt: new Date(now - (a.bidCount - i) * 60_000).toISOString(),
      isAuto: i % 4 === 0,
    });
  }
  bidsByAuction.set(a.id, list);
}

// Seed a few hidden offers on the sealed auction (a6) for admin demo.
const sealedSeed = seedAuctions.find((a) => a.auctionType === "fermee");
if (sealedSeed) {
  const min = sealedSeed.car.minimumAcceptedPrice ?? sealedSeed.startingPrice;
  const seed: Offer[] = [
    { id: "o-seed-1", auctionId: sealedSeed.id, carId: sealedSeed.car.id, userId: "u3", userName: "Karim B.", amount: min + 12000, createdAt: hoursAgo(0.5), updatedAt: hoursAgo(0.5), status: "active" },
    { id: "o-seed-2", auctionId: sealedSeed.id, carId: sealedSeed.car.id, userId: "u7", userName: "Fatima Z.", amount: min + 25500, createdAt: hoursAgo(0.4), updatedAt: hoursAgo(0.4), status: "active" },
    { id: "o-seed-3", auctionId: sealedSeed.id, carId: sealedSeed.car.id, userId: "u9", userName: "Youssef A.", amount: min + 8000, createdAt: hoursAgo(0.3), updatedAt: hoursAgo(0.3), status: "active" },
  ];
  offersByAuction.set(sealedSeed.id, seed);
  sealedSeed.bidCount = seed.length;
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export function addAuctionFromCar(
  car: Car,
  opts: {
    startingPrice: number;
    durationHours: number;
    startsAt?: string;
    visibility?: "ouvert" | "ferme";
    auctionType?: "ouverte" | "fermee";
    minimumAcceptedPrice?: number;
  },
): Auction {
  const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const auctionType = opts.auctionType ?? "ouverte";
  const carWithImages: Car = {
    ...car,
    status: "en_cours",
    images: car.images?.length ? car.images : getCarImages(car.marque),
    minimumAcceptedPrice:
      auctionType === "fermee" ? (opts.minimumAcceptedPrice ?? car.minimumAcceptedPrice ?? opts.startingPrice) : car.minimumAcceptedPrice,
  };
  const startsAtMs = opts.startsAt ? new Date(opts.startsAt).getTime() : Date.now();
  const scheduled = startsAtMs > Date.now() + 1000;
  const auction: Auction = {
    id,
    car: carWithImages,
    startsAt: new Date(startsAtMs).toISOString(),
    endsAt: new Date(startsAtMs + opts.durationHours * 3600_000).toISOString(),
    startingPrice: opts.startingPrice,
    currentPrice: opts.startingPrice,
    bidCount: 0,
    status: scheduled ? "scheduled" : "live",
    visibility: opts.visibility ?? (auctionType === "fermee" ? "ferme" : "ouvert"),
    auctionType,
    topBidderId: null,
  };
  auctions.set(id, auction);
  bidsByAuction.set(id, []);
  return auction;
}

export const mockApi: ApiClient = {
  async listAuctions(filter) {
    await delay(80);
    const all = Array.from(auctions.values());
    if (filter === "live") return all.filter((a) => a.status === "live" || a.status === "scheduled");
    if (filter === "closed")
      return all.filter((a) => a.status === "closed" || a.status === "validated" || a.status === "cancelled");
    return all;
  },

  async getAuction(id) {
    await delay(60);
    const a = auctions.get(id);
    if (!a) throw new Error("Enchère introuvable");
    return { ...a };
  },

  async listBids(auctionId) {
    await delay(60);
    return [...(bidsByAuction.get(auctionId) ?? [])].reverse();
  },

  async placeBid({ auctionId, amount, isAuto }: PlaceBidInput) {
    await delay(150);
    const auction = auctions.get(auctionId);
    if (!auction) throw new Error("Enchère introuvable");
    if (auction.auctionType === "fermee") {
      throw new Error("Cette enchère est à enveloppe fermée. Soumettez une offre confidentielle.");
    }
    if (auction.status !== "live") throw new Error("Cette enchère n'est plus active");
    if (new Date(auction.endsAt).getTime() <= Date.now()) throw new Error("L'enchère est terminée");
    if (amount <= auction.currentPrice) {
      throw new Error(`Votre offre doit dépasser ${auction.currentPrice.toLocaleString("fr-MA")} DH`);
    }

    const bid: Bid = {
      id: `b-${Date.now()}`,
      auctionId,
      carId: auction.car.id,
      bidderId: "me",
      bidderName: "Vous",
      amount,
      createdAt: new Date().toISOString(),
      isAuto: !!isAuto,
    };
    auction.currentPrice = amount;
    auction.bidCount += 1;
    auction.topBidderId = "me";
    bidsByAuction.set(auctionId, [...(bidsByAuction.get(auctionId) ?? []), bid]);

    realtimeBus.emit(`auction:${auctionId}:bid`, { auction: { ...auction }, bid });
    return bid;
  },

  async submitOffer({ auctionId, amount }: SubmitOfferInput) {
    await delay(150);
    const auction = auctions.get(auctionId);
    if (!auction) throw new Error("Enchère introuvable");
    if (auction.auctionType !== "fermee") {
      throw new Error("Cette enchère n'accepte pas d'offres confidentielles.");
    }
    if (auction.status !== "live") throw new Error("Cette enchère n'est plus active");
    if (new Date(auction.endsAt).getTime() <= Date.now()) throw new Error("L'enchère est terminée");
    const min = auction.car.minimumAcceptedPrice ?? auction.startingPrice;
    if (!(amount > min)) {
      throw new Error(`Votre offre doit être strictement supérieure à ${min.toLocaleString("fr-MA")} DH`);
    }
    const list = offersByAuction.get(auctionId) ?? [];
    const existingIdx = list.findIndex((o) => o.userId === "me");
    const nowIso = new Date().toISOString();
    let offer: Offer;
    if (existingIdx >= 0) {
      offer = { ...list[existingIdx], amount, updatedAt: nowIso };
      list[existingIdx] = offer;
    } else {
      offer = {
        id: `o-${Date.now()}`,
        auctionId,
        carId: auction.car.id,
        userId: "me",
        userName: "Vous",
        amount,
        createdAt: nowIso,
        updatedAt: nowIso,
        status: "active",
      };
      list.push(offer);
    }
    offersByAuction.set(auctionId, list);
    // Bump count only — never broadcast amount publicly.
    auction.bidCount = list.length;
    return offer;
  },

  async listMyOffers(auctionId: string) {
    await delay(60);
    return (offersByAuction.get(auctionId) ?? []).filter((o) => o.userId === "me");
  },

  async listAllOffersAdmin(auctionId: string) {
    await delay(60);
    return [...(offersByAuction.get(auctionId) ?? [])].sort((a, b) => b.amount - a.amount);
  },

  async setAutoBid() {
    await delay(80);
  },

  async listEvents(filter) {
    await delay(60);
    const all = Array.from(events.values());
    if (filter === "live") return all.filter((e) => e.status === "live" || e.status === "scheduled");
    if (filter === "closed")
      return all.filter((e) => e.status === "closed" || e.status === "validated" || e.status === "cancelled");
    return all;
  },

  async getEvent(id) {
    await delay(60);
    const ev = events.get(id);
    if (!ev) throw new Error("Événement d'enchère introuvable");
    const lots = ev.lotIds
      .map((lid) => auctions.get(lid))
      .filter((a): a is Auction => !!a);
    return { event: { ...ev }, lots };
  },
};

/** Admin helper: create a new multi-car event grouping several existing lots. */
export function addAuctionEvent(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  visibility: "ouvert" | "ferme";
  lotIds: string[];
}): AuctionEvent {
  const maxNum = Array.from(events.keys()).reduce((m, k) => { const n = parseInt(k, 10); return Number.isFinite(n) && n > m ? n : m; }, 30);
  const id = String(maxNum + 1).padStart(4, "0");
  const scheduled = new Date(input.startsAt).getTime() > Date.now() + 1000;
  const ev: AuctionEvent = {
    id,
    title: input.title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: scheduled ? "scheduled" : "live",
    visibility: input.visibility,
    lotIds: input.lotIds,
  };
  events.set(id, ev);
  // Tag the lots with this event id and align their windows.
  for (const lid of input.lotIds) {
    const lot = auctions.get(lid);
    if (lot) {
      lot.eventId = id;
      lot.startsAt = ev.startsAt;
      lot.endsAt = ev.endsAt;
      lot.status = ev.status;
    }
  }
  return ev;
}

// Simulate other bidders periodically (so the UI feels alive)
if (typeof window !== "undefined") {
  setInterval(() => {
    // Promote scheduled auctions whose start time has arrived.
    for (const a of auctions.values()) {
      if (a.status === "scheduled" && new Date(a.startsAt).getTime() <= Date.now()) {
        a.status = "live";
      }
    }
    const live = Array.from(auctions.values()).filter((a) => a.status === "live" && a.auctionType !== "fermee");
    if (live.length === 0) return;
    const a = live[Math.floor(Math.random() * live.length)];
    if (Math.random() > 0.4) return;
    const inc = [1000, 1000, 2000, 5000][Math.floor(Math.random() * 4)];
    const amount = a.currentPrice + inc;
    const names = ["Karim B.", "Fatima Z.", "Youssef A.", "Sara M.", "Hicham E.", "Nadia O."];
    const name = names[Math.floor(Math.random() * names.length)];
    const bid: Bid = {
      id: `b-sim-${Date.now()}`,
      auctionId: a.id,
      carId: a.car.id,
      bidderId: `sim-${Math.floor(Math.random() * 100)}`,
      bidderName: name,
      amount,
      createdAt: new Date().toISOString(),
      isAuto: Math.random() > 0.6,
    };
    a.currentPrice = amount;
    a.bidCount += 1;
    a.topBidderId = bid.bidderId;
    bidsByAuction.set(a.id, [...(bidsByAuction.get(a.id) ?? []), bid]);
    realtimeBus.emit(`auction:${a.id}:bid`, { auction: { ...a }, bid });
  }, 4500);
}
