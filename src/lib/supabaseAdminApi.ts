/**
 * Admin-side API backed by Supabase.
 * Mirrors the shape of mockAdminApi so the existing admin pages keep working.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AdminStats,
  AdminUser,
  Expert,
  ExpertAssignment,
  PendingValidation,
  RevenuePoint,
  UserRole,
} from "@/types/admin";
import type { Auction, AuctionEvent, Car } from "@/types/auction";
import { getCarImages } from "./carImages";

const COMMISSION_RATE = 0.05;

/* ──────────────────────────── helpers ──────────────────────────── */

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

type CarRow = {
  id: string;
  vendeur_id: string | null;
  vendeur_nom: string;
  type: Car["type"];
  body_type: string | null;
  marque: string;
  modele: string;
  finition: string;
  transmission: Car["transmission"];
  carburant: Car["carburant"];
  annee: number;
  kilometrage: number;
  couleur_exterieur: string;
  couleur_interieur: string;
  note_expert: number | null;
  nombre_cles: number;
  opposition: boolean;
  main_levee: boolean;
  puissance_fiscale: number;
  carte_grise_barree: boolean;
  procuration: Car["procuration"];
  date_vente: string | null;
  status: Car["status"];
  payment_status: Car["paymentStatus"];
  delivery_status: Car["deliveryStatus"];
  prix_attendu: number;
  prix_plancher: number | null;
  prix_minimum: number | null;
  minimum_accepted_price: number | null;
  images: string[] | null;
};

function mapCar(row: CarRow): Car {
  return {
    id: row.id,
    vendeurId: row.vendeur_id ?? "",
    vendeurNom: row.vendeur_nom || "Vendeur",
    type: row.type,
    bodyType: row.body_type ?? null,
    marque: row.marque,
    modele: row.modele,
    finition: row.finition,
    transmission: row.transmission,
    carburant: row.carburant,
    annee: row.annee,
    kilometrage: row.kilometrage,
    couleurExterieur: row.couleur_exterieur,
    couleurInterieur: row.couleur_interieur,
    noteExpert: row.note_expert,
    nombreCles: row.nombre_cles,
    opposition: row.opposition,
    mainLevee: row.main_levee,
    puissanceFiscale: row.puissance_fiscale,
    carteGriseBarree: row.carte_grise_barree,
    procuration: row.procuration,
    dateVente: row.date_vente,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    prixAttendu: row.prix_attendu,
    prixPlancher: row.prix_plancher ?? null,
    prixMinimum: row.prix_minimum ?? null,
    minimumAcceptedPrice: row.minimum_accepted_price ?? undefined,
    images: row.images && row.images.length ? row.images : getCarImages(row.marque),
  };
}

function carPatchToRow(p: Partial<Car>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.vendeurId !== undefined) out.vendeur_id = p.vendeurId || null;
  if (p.vendeurNom !== undefined) out.vendeur_nom = p.vendeurNom;
  if (p.type !== undefined) out.type = p.type;
  if (p.bodyType !== undefined) out.body_type = p.bodyType || null;
  if (p.marque !== undefined) out.marque = p.marque;
  if (p.modele !== undefined) out.modele = p.modele;
  if (p.finition !== undefined) out.finition = p.finition;
  if (p.transmission !== undefined) out.transmission = p.transmission;
  if (p.carburant !== undefined) out.carburant = p.carburant;
  if (p.annee !== undefined) out.annee = p.annee;
  if (p.kilometrage !== undefined) out.kilometrage = p.kilometrage;
  if (p.couleurExterieur !== undefined) out.couleur_exterieur = p.couleurExterieur;
  if (p.couleurInterieur !== undefined) out.couleur_interieur = p.couleurInterieur;
  if (p.nombreCles !== undefined) out.nombre_cles = p.nombreCles;
  if (p.opposition !== undefined) out.opposition = p.opposition;
  if (p.mainLevee !== undefined) out.main_levee = p.mainLevee;
  if (p.puissanceFiscale !== undefined) out.puissance_fiscale = p.puissanceFiscale;
  if (p.carteGriseBarree !== undefined) out.carte_grise_barree = p.carteGriseBarree;
  if (p.procuration !== undefined) out.procuration = p.procuration;
  if (p.prixAttendu !== undefined) out.prix_attendu = p.prixAttendu;
  if (p.prixPlancher !== undefined) out.prix_plancher = p.prixPlancher ?? null;
  if (p.prixMinimum !== undefined) out.prix_minimum = p.prixMinimum ?? null;
  if (p.minimumAcceptedPrice !== undefined) out.minimum_accepted_price = p.minimumAcceptedPrice;
  if (p.status !== undefined) out.status = p.status;
  return out;
}

function nextCarId(existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = parseInt(id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 100);
  return String(max + 1).padStart(5, "0");
}

/* ──────────────────────────── analytics ──────────────────────────── */

async function getStats(): Promise<AdminStats> {
  const monthStart = startOfMonthISO();

  const [
    totalAuctionsRes,
    liveAuctionsRes,
    pendingValidationsRes,
    validatedMonthRes,
    closedMonthRes,
    allClosedMonthRes,
    rolesRes,
    allValidatedRes,
    paidPaymentsRes,
  ] = await Promise.all([
    supabase.from("auctions").select("id", { count: "exact", head: true }),
    supabase.from("auctions").select("id", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("auctions").select("id", { count: "exact", head: true }).eq("status", "closed"),
    supabase
      .from("auctions")
      .select("current_price")
      .eq("status", "validated")
      .gte("updated_at", monthStart),
    supabase
      .from("auctions")
      .select("id, bid_count")
      .in("status", ["closed", "validated"])
      .gte("updated_at", monthStart),
    supabase
      .from("auctions")
      .select("id", { count: "exact", head: true })
      .in("status", ["closed", "validated", "cancelled"])
      .gte("updated_at", monthStart),
    supabase.from("user_roles").select("role, user_id"),
    supabase.from("auctions").select("current_price").eq("status", "validated"),
    supabase.from("payments").select("amount").eq("status", "paid"),
  ]);

  const validated = validatedMonthRes.data ?? [];
  const volumeMois = validated.reduce((s, r) => s + (r.current_price ?? 0), 0);
  const caMois = Math.round(volumeMois * COMMISSION_RATE);

  const closedMonth = closedMonthRes.data ?? [];
  const closedTotal = allClosedMonthRes.count ?? 0;
  const withBids = closedMonth.filter((r) => (r.bid_count ?? 0) > 0).length;
  const tauxConversion = closedTotal > 0 ? withBids / closedTotal : 0;

  const roles = rolesRes.data ?? [];
  const uniqueUsers = new Set(roles.map((r) => r.user_id as string));
  const count = (role: string) => roles.filter((r) => r.role === role).length;

  return {
    totalAuctions: totalAuctionsRes.count ?? 0,
    liveAuctions: liveAuctionsRes.count ?? 0,
    totalUsers: uniqueUsers.size,
    acheteursActifs: count("acheteur"),
    vendeursActifs: count("vendeur"),
    experts: count("expert"),
    ventesValideesMois: validated.length,
    caMois,
    volumeMois,
    totalVentesValidees: (allValidatedRes.data ?? []).reduce((s, r) => s + (r.current_price ?? 0), 0),
    totalVentesEncaissees: (paidPaymentsRes.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
    tauxConversion,
    enchersValidationsEnAttente: pendingValidationsRes.count ?? 0,
  };
}

async function getRevenue(days = 30): Promise<RevenuePoint[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("auctions")
    .select("current_price, updated_at, status")
    .in("status", ["closed", "validated"])
    .gte("updated_at", since.toISOString());
  if (error) throw new Error(error.message);
  const buckets = new Map<string, { ca: number; ventes: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), { ca: 0, ventes: 0 });
  }
  for (const row of data ?? []) {
    const key = new Date(row.updated_at as string).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    b.ventes += 1;
    b.ca += Math.round((row.current_price ?? 0) * COMMISSION_RATE);
  }
  return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
}

/* ──────────────────────────── users ──────────────────────────── */

async function listUsers(): Promise<AdminUser[]> {
  // email + telephone are restricted columns; admins fetch them through a
  // SECURITY DEFINER RPC that re-checks the admin role server-side.
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.rpc("admin_list_profiles"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);

  const roleByUser = new Map<string, UserRole>();
  for (const r of rolesRes.data ?? []) {
    const cur = roleByUser.get(r.user_id as string);
    const next = r.role as UserRole;
    const rank = (x: UserRole) => ({ admin: 4, expert: 3, vendeur: 2, acheteur: 1 }[x] ?? 0);
    if (!cur || rank(next) > rank(cur)) roleByUser.set(r.user_id as string, next);
  }

  return (profilesRes.data ?? []).map((p: {
    user_id: string; nom: string | null; email: string | null; telephone: string | null;
    actif: boolean | null; caution_validee: boolean | null; caution_montant: number | null;
    created_at: string;
  }) => ({
    id: p.user_id,
    nom: p.nom ?? "",
    email: p.email ?? "",
    telephone: p.telephone ?? "",
    role: roleByUser.get(p.user_id) ?? "acheteur",
    cautionDeposee: !!p.caution_validee,
    cautionMontant: p.caution_montant ?? 0,
    inscritLe: p.created_at?.slice(0, 10) ?? "",
    actif: p.actif ?? true,
  }));
}

async function toggleUserActive(id: string): Promise<void> {
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("actif")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const { error: rpcErr } = await supabase.rpc("admin_set_user_active", {
    p_user_id: id,
    p_actif: !(prof?.actif ?? true),
  });
  if (rpcErr) throw new Error(rpcErr.message);
}

async function createUser(input: {
  nom: string;
  email: string;
  telephone: string;
  role: "admin" | "expert" | "vendeur";
}): Promise<AdminUser> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Session expirée");
  const res = await fetch("/api/public/admin-create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as { ok: boolean; error?: string; userId?: string };
  if (!res.ok || !body.ok) throw new Error(body.error ?? "Création impossible");
  return {
    id: body.userId!,
    nom: input.nom,
    email: input.email,
    telephone: input.telephone,
    role: input.role,
    cautionDeposee: false,
    cautionMontant: 0,
    inscritLe: new Date().toISOString().slice(0, 10),
    actif: true,
  };
}

/* ──────────────────────────── cars ──────────────────────────── */

async function listCars(): Promise<(Car & { proprietaireId: string })[]> {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CarRow[]).map((r) => ({ ...mapCar(r), proprietaireId: r.vendeur_id ?? "" }));
}

async function createCar(
  input: Partial<Car> & Pick<Car, "marque" | "modele" | "annee" | "prixAttendu">,
): Promise<Car> {
  const { data: existing, error: listErr } = await supabase.from("cars").select("id");
  if (listErr) throw new Error(listErr.message);
  const id = nextCarId((existing ?? []).map((c) => c.id as string));
  const payload = {
    id,
    ...carPatchToRow({ ...input, status: "open" }),
    marque: input.marque,
    modele: input.modele,
    annee: input.annee,
    prix_attendu: input.prixAttendu,
  };
  const { data, error } = await supabase
    .from("cars")
    .insert(payload as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCar(data as CarRow);
}

async function updateCar(id: string, patch: Partial<Car>): Promise<Car> {
  const { data, error } = await supabase
    .from("cars")
    .update(carPatchToRow(patch) as never)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCar(data as CarRow);
}

async function deleteCar(id: string): Promise<void> {
  const { error } = await supabase.from("cars").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ──────────────────────────── experts ──────────────────────────── */

async function listExperts(): Promise<Expert[]> {
  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "expert");
  if (rolesErr) throw new Error(rolesErr.message);
  const expertIds = (roles ?? []).map((r) => r.user_id as string);
  if (expertIds.length === 0) return [];

  const [profilesRes, assignmentsRes] = await Promise.all([
    // admin-only RPC — exposes email/telephone after re-checking the admin role.
    supabase.rpc("admin_list_profiles"),
    supabase
      .from("expert_assignments")
      .select("expert_id, status, note_finale")
      .in("expert_id", expertIds),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);

  // Need ville per profile — admin_list_profiles doesn't return it, fetch separately.
  const { data: villes } = await supabase
    .from("profiles")
    .select("user_id, ville")
    .in("user_id", expertIds);
  const villeMap = new Map<string, string>();
  (villes ?? []).forEach((v) => villeMap.set(v.user_id as string, (v.ville as string) ?? "—"));

  const expertIdSet = new Set(expertIds);
  const expertProfiles = (profilesRes.data ?? []).filter(
    (p: { user_id: string }) => expertIdSet.has(p.user_id),
  );

  const byExpert = new Map<string, { en: number; total: number; sumNote: number; cntNote: number }>();
  for (const a of assignmentsRes.data ?? []) {
    const eid = a.expert_id as string | null;
    if (!eid) continue;
    const b = byExpert.get(eid) ?? { en: 0, total: 0, sumNote: 0, cntNote: 0 };
    if (a.status === "en_inspection") b.en += 1;
    if (a.status === "rapport_recu") {
      b.total += 1;
      if (a.note_finale != null) { b.sumNote += a.note_finale; b.cntNote += 1; }
    }
    byExpert.set(eid, b);
  }

  return expertProfiles.map((p: { user_id: string; nom: string | null; email: string | null; actif: boolean | null }) => {
    const b = byExpert.get(p.user_id) ?? { en: 0, total: 0, sumNote: 0, cntNote: 0 };
    return {
      id: p.user_id,
      nom: p.nom ?? "",
      email: p.email ?? "",
      ville: villeMap.get(p.user_id) ?? "—",
      inspectionsEnCours: b.en,
      inspectionsTotal: b.total,
      noteMoyenne: b.cntNote > 0 ? b.sumNote / b.cntNote : 0,
      actif: p.actif ?? true,
    };
  });
}

async function listAssignments(): Promise<ExpertAssignment[]> {
  const { data, error } = await supabase
    .from("expert_assignments")
    .select("id, car_id, expert_id, status, assigne_le, rapport_recu_le, note_finale")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const carIds = rows.map((r) => r.car_id as string);
  const expertIds = Array.from(new Set(rows.map((r) => r.expert_id).filter(Boolean) as string[]));

  const [carsRes, profsRes] = await Promise.all([
    carIds.length
      ? supabase.from("cars").select("id, marque, modele, annee").in("id", carIds)
      : Promise.resolve({ data: [], error: null } as const),
    expertIds.length
      ? supabase.from("profiles").select("user_id, nom").in("user_id", expertIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const carLabel = new Map<string, string>();
  for (const c of carsRes.data ?? []) {
    carLabel.set(c.id as string, `${c.marque} ${c.modele} (${c.annee})`);
  }
  const expertName = new Map<string, string>();
  for (const p of profsRes.data ?? []) expertName.set(p.user_id as string, p.nom ?? "");

  return rows.map((r) => ({
    id: r.id as string,
    carId: r.car_id as string,
    carLabel: carLabel.get(r.car_id as string) ?? r.car_id as string,
    expertId: (r.expert_id as string) ?? null,
    expertNom: r.expert_id ? expertName.get(r.expert_id as string) ?? null : null,
    status: r.status as ExpertAssignment["status"],
    assigneLe: r.assigne_le as string | null,
    rapportRecuLe: r.rapport_recu_le as string | null,
    noteFinale: (r.note_finale as number) ?? null,
  }));
}

async function assignExpert(carId: string, expertId: string): Promise<void> {
  const { error } = await supabase.rpc("assign_expert", { p_car_id: carId, p_expert_id: expertId });
  if (error) throw new Error(error.message);
}

/* ─────────────────────── auctions / events ─────────────────────── */

async function listExpertiseReady(): Promise<(Car & { proprietaireId: string; noteFinale: number })[]> {
  const { data: assignments, error: aErr } = await supabase
    .from("expert_assignments")
    .select("car_id, note_finale")
    .eq("status", "rapport_recu");
  if (aErr) throw new Error(aErr.message);
  const ids = (assignments ?? []).map((a) => a.car_id as string);
  if (ids.length === 0) return [];
  const { data: cars, error: cErr } = await supabase
    .from("cars")
    .select("*")
    .in("id", ids)
    .eq("status", "open");
  if (cErr) throw new Error(cErr.message);
  const noteByCar = new Map<string, number>();
  for (const a of assignments ?? []) noteByCar.set(a.car_id as string, (a.note_finale as number) ?? 0);
  return (cars as CarRow[]).map((r) => ({
    ...mapCar(r),
    proprietaireId: r.vendeur_id ?? "",
    noteFinale: noteByCar.get(r.id) ?? 0,
  }));
}

type CreateAuctionOpts = {
  startingPrice: number;
  durationHours: number;
  startsAt?: string;
  visibility?: "ouvert" | "ferme";
  auctionType?: "ouverte" | "fermee";
  minimumAcceptedPrice?: number;
  eventId?: string;
};

async function insertAuctionRow(car: CarRow, opts: CreateAuctionOpts) {
  const startsAtMs = opts.startsAt ? new Date(opts.startsAt).getTime() : Date.now();
  const startsAt = new Date(startsAtMs).toISOString();
  const endsAt = new Date(startsAtMs + opts.durationHours * 3600_000).toISOString();
  const status = startsAtMs <= Date.now() ? "live" : "scheduled";
  const auctionType = opts.auctionType ?? "ouverte";
  const id = `${car.id}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("auctions")
    .insert({
      id,
      car_id: car.id,
      event_id: opts.eventId ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      starting_price: opts.startingPrice,
      current_price: opts.startingPrice,
      status,
      visibility: opts.visibility ?? "ouvert",
      auction_type: auctionType,
    } as never)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Mark car as in-auction and store minimum accepted price
  await supabase
    .from("cars")
    .update({
      status: "en_cours" as const,
      minimum_accepted_price: opts.minimumAcceptedPrice ?? null,
    } as never)
    .eq("id", car.id);

  return data as { id: string };
}

async function createAuctionFromCar(carId: string, opts: CreateAuctionOpts): Promise<Auction> {
  const { data: car, error } = await supabase.from("cars").select("*").eq("id", carId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!car) throw new Error("Voiture introuvable");
  if ((car as CarRow).status !== "open") throw new Error("Cette voiture est déjà en enchère");
  const inserted = await insertAuctionRow(car as CarRow, opts);
  // Re-fetch with joined car to build Auction
  const { data: full } = await supabase
    .from("auctions")
    .select("*, cars(*)")
    .eq("id", inserted.id)
    .single();
  const c = mapCar((full as { cars: CarRow }).cars);
  const f = full as Record<string, unknown>;
  return {
    id: f.id as string,
    car: c,
    startsAt: f.starts_at as string,
    endsAt: f.ends_at as string,
    currentPrice: f.current_price as number,
    startingPrice: f.starting_price as number,
    bidCount: f.bid_count as number,
    status: f.status as Auction["status"],
    visibility: f.visibility as Auction["visibility"],
    topBidderId: (f.top_bidder_id as string) ?? null,
    auctionType: f.auction_type as Auction["auctionType"],
    eventId: (f.event_id as string) ?? null,
  };
}

async function createMultiCarEvent(input: {
  title: string;
  durationHours: number;
  startsAt?: string;
  visibility: "ouvert" | "ferme";
  auctionType?: "ouverte" | "fermee";
  items: { carId: string; startingPrice: number; minimumAcceptedPrice?: number }[];
}): Promise<AuctionEvent> {
  if (input.items.length === 0) throw new Error("Sélectionnez au moins une voiture");
  const auctionType = input.auctionType ?? (input.visibility === "ferme" ? "fermee" : "ouverte");
  const startsAtMs = input.startsAt ? new Date(input.startsAt).getTime() : Date.now();
  const startsAt = new Date(startsAtMs).toISOString();
  const endsAt = new Date(startsAtMs + input.durationHours * 3600_000).toISOString();
  const eventId = `evt-${Date.now().toString(36)}`;
  const status = startsAtMs <= Date.now() ? "live" : "scheduled";

  const { data: ev, error: evErr } = await supabase
    .from("auction_events")
    .insert({
      id: eventId,
      title: input.title,
      starts_at: startsAt,
      ends_at: endsAt,
      visibility: input.visibility,
      status,
    } as never)
    .select("*")
    .single();
  if (evErr) throw new Error(evErr.message);

  const carIds = input.items.map((it) => it.carId);
  const { data: cars, error: cErr } = await supabase
    .from("cars")
    .select("*")
    .in("id", carIds);
  if (cErr) throw new Error(cErr.message);
  const carById = new Map<string, CarRow>((cars as CarRow[]).map((c) => [c.id, c]));

  const lotIds: string[] = [];
  for (const it of input.items) {
    const car = carById.get(it.carId);
    if (!car) throw new Error(`Voiture ${it.carId} introuvable`);
    if (car.status !== "open") throw new Error(`Voiture ${it.carId} déjà en enchère`);
    const r = await insertAuctionRow(car, {
      startingPrice: it.startingPrice,
      durationHours: input.durationHours,
      startsAt,
      visibility: input.visibility,
      auctionType,
      minimumAcceptedPrice: it.minimumAcceptedPrice,
      eventId,
    });
    lotIds.push(r.id);
  }

  const e = ev as Record<string, unknown>;
  return {
    id: e.id as string,
    title: e.title as string,
    startsAt: e.starts_at as string,
    endsAt: e.ends_at as string,
    status: e.status as AuctionEvent["status"],
    visibility: e.visibility as AuctionEvent["visibility"],
    lotIds,
  };
}

/* ──────────────────────────── validations ──────────────────────────── */

async function listPendingValidations(): Promise<PendingValidation[]> {
  const { data, error } = await supabase
    .from("auctions")
    .select("id, car_id, current_price, ends_at, top_bidder_id, updated_at, closed_at, admin_validation_deadline, cars(marque, modele, annee, vendeur_nom, prix_attendu)")
    .eq("status", "closed")
    .order("admin_validation_deadline", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const bidderIds = Array.from(new Set(rows.map((r) => r.top_bidder_id).filter(Boolean) as string[]));
  const { data: profs } = bidderIds.length
    ? await supabase.from("profiles").select("user_id, nom").in("user_id", bidderIds)
    : { data: [] as { user_id: string; nom: string }[] };
  const nameById = new Map((profs ?? []).map((p) => [p.user_id as string, p.nom as string]));

  return rows.map((r) => {
    const c = r.cars as { marque: string; modele: string; annee: number; vendeur_nom: string; prix_attendu: number } | null;
    const ecart = (r.current_price as number) - (c?.prix_attendu ?? 0);
    const raison: PendingValidation["raison"] = Math.abs(ecart) > 5000 ? "ecart_prix" : "verification_paiement";
    return {
      auctionId: r.id as string,
      carId: r.car_id as string,
      carLabel: c ? `${c.marque} ${c.modele} (${c.annee})` : (r.car_id as string),
      vendeurNom: c?.vendeur_nom ?? "—",
      acheteurNom: r.top_bidder_id ? nameById.get(r.top_bidder_id as string) ?? "Acheteur" : "—",
      prixFinal: r.current_price as number,
      prixAttendu: c?.prix_attendu ?? 0,
      termineLe: new Date(r.ends_at as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
      raison,
      adminValidationDeadline: (r.admin_validation_deadline as string) ?? null,
    };
  });
}

async function validateAuction(auctionId: string, decision: "validee" | "annulee"): Promise<void> {
  const { error } = await supabase.rpc("validate_auction", {
    p_auction_id: auctionId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message);
}

export type ProcessedValidation = {
  auctionId: string;
  carId: string;
  carLabel: string;
  acheteurNom: string;
  vendeurNom: string;
  prixFinal: number;
  decision: "validee" | "annulee";
  decideLe: string | null;
  paymentStatus: "aucun" | "en_attente" | "paye" | "annule" | "rembourse";
  paymentDeadline: string | null;
};

async function listProcessedValidations(): Promise<ProcessedValidation[]> {
  const { data, error } = await supabase
    .from("auctions")
    .select("id, car_id, current_price, status, top_bidder_id, validated_at, updated_at, payment_deadline, cars(marque, modele, annee, vendeur_nom)")
    .in("status", ["validated", "cancelled"])
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const bidderIds = Array.from(new Set(rows.map((r) => r.top_bidder_id).filter(Boolean) as string[]));
  const auctionIds = rows.map((r) => r.id as string);

  const [profsRes, paysRes] = await Promise.all([
    bidderIds.length
      ? supabase.from("profiles").select("user_id, nom").in("user_id", bidderIds)
      : Promise.resolve({ data: [] as { user_id: string; nom: string }[] }),
    auctionIds.length
      ? supabase
          .from("payments")
          .select("auction_id, status, updated_at")
          .eq("type", "achat")
          .in("auction_id", auctionIds)
      : Promise.resolve({ data: [] as { auction_id: string; status: string; updated_at: string }[] }),
  ]);
  const nameById = new Map((profsRes.data ?? []).map((p) => [p.user_id as string, p.nom as string]));
  const payByAuction = new Map<string, { status: string; updated_at: string }>();
  for (const p of paysRes.data ?? []) {
    const cur = payByAuction.get(p.auction_id as string);
    if (!cur || new Date(p.updated_at as string) > new Date(cur.updated_at)) {
      payByAuction.set(p.auction_id as string, { status: p.status as string, updated_at: p.updated_at as string });
    }
  }

  return rows.map((r) => {
    const c = r.cars as { marque: string; modele: string; annee: number; vendeur_nom: string } | null;
    const pay = payByAuction.get(r.id as string);
    return {
      auctionId: r.id as string,
      carId: r.car_id as string,
      carLabel: c ? `${c.marque} ${c.modele} (${c.annee})` : (r.car_id as string),
      acheteurNom: r.top_bidder_id ? nameById.get(r.top_bidder_id as string) ?? "Acheteur" : "—",
      vendeurNom: c?.vendeur_nom ?? "—",
      prixFinal: r.current_price as number,
      decision: r.status === "validated" ? "validee" : "annulee",
      decideLe: (r.validated_at as string) ?? (r.updated_at as string) ?? null,
      paymentStatus: (pay?.status as ProcessedValidation["paymentStatus"]) ?? "aucun",
      paymentDeadline: (r.payment_deadline as string) ?? null,
    };
  });
}

export const supabaseAdminApi = {
  getStats,
  getRevenue,
  listUsers,
  toggleUserActive,
  createUser,
  listCars,
  createCar,
  updateCar,
  deleteCar,
  listExperts,
  listAssignments,
  assignExpert,
  listExpertiseReady,
  createAuctionFromCar,
  createMultiCarEvent,
  listPendingValidations,
  validateAuction,
  listProcessedValidations,
};
