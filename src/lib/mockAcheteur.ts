/**
 * Acheteur mock store.
 * - Reads live auctions from the auction realtime bus to track outbids and wins.
 * - Holds notifications + payment history in memory.
 * - Designed to be swapped with `/api/me/encheres`, `/api/me/paiements`, `/api/me/notifications`.
 */

import { useSyncExternalStore } from "react";
import type { MonEnchere, Notification, Paiement } from "@/types/acheteur";
import { realtimeBus } from "./realtime";
import { api } from "./api";
import type { Auction, Bid } from "@/types/auction";

interface State {
  encheres: Map<string, MonEnchere>;
  paiements: Paiement[];
  notifications: Notification[];
}

const state: State = {
  encheres: new Map(),
  paiements: [
    {
      id: "p-001",
      date: new Date(Date.now() - 12 * 24 * 3600_000).toISOString(),
      type: "caution",
      libelle: "Dépôt de caution",
      montant: 5000,
      status: "regle",
      reference: "CAUT-2026-0421",
    },
  ],
  notifications: [
    {
      id: "n-welcome",
      type: "system",
      titre: "Bienvenue sur Bidlic",
      message: "Votre caution a été validée. Vous pouvez maintenant participer aux enchères.",
      createdAt: new Date(Date.now() - 11 * 24 * 3600_000).toISOString(),
      read: true,
    },
  ],
};

const listeners = new Set<() => void>();

// Cached snapshots — required for useSyncExternalStore reference stability.
let encheresSnapshot: MonEnchere[] = [];
let paiementsSnapshot: Paiement[] = state.paiements;
let notificationsSnapshot: Notification[] = state.notifications;

function rebuildEncheresSnapshot() {
  encheresSnapshot = Array.from(state.encheres.values()).sort(
    (a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
  );
}

function emit() {
  rebuildEncheresSnapshot();
  paiementsSnapshot = state.paiements;
  notificationsSnapshot = state.notifications;
  listeners.forEach((l) => l());
}

function upsertFromBid(auction: Auction, bid: Bid) {
  const mine = bid.bidderId === "me";
  const existing = state.encheres.get(auction.id);

  // Track auctions I've participated in
  if (mine) {
    state.encheres.set(auction.id, {
      auctionId: auction.id,
      carId: auction.car.id,
      marque: auction.car.marque,
      modele: auction.car.modele,
      annee: auction.car.annee,
      monMontant: bid.amount,
      prixActuel: auction.currentPrice,
      prixAttendu: auction.car.prixAttendu,
      jeSuisLeader: auction.topBidderId === "me",
      endsAt: auction.endsAt,
      status: "active",
      bidCount: auction.bidCount,
    });
  } else if (existing) {
    // Someone else outbid us
    const wasLeader = existing.jeSuisLeader;
    existing.prixActuel = auction.currentPrice;
    existing.jeSuisLeader = auction.topBidderId === "me";
    existing.bidCount = auction.bidCount;
    if (wasLeader && !existing.jeSuisLeader) {
      pushNotification({
        type: "outbid",
        titre: "Vous avez été surenchéri",
        message: `${auction.car.marque} ${auction.car.modele} — nouveau prix ${auction.currentPrice.toLocaleString("fr-MA")} DH`,
        auctionId: auction.id,
      });
    }
  }
  emit();
}

function pushNotification(n: Omit<Notification, "id" | "createdAt" | "read">) {
  state.notifications = [
    {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...n,
    },
    ...state.notifications,
  ].slice(0, 50);
  emit();
}

let installed = false;
function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Listen to ALL bid events globally via realtime bus
  realtimeBus.onAny((event: string, payload: { auction: unknown; bid: unknown }) => {
    if (!event.startsWith("auction:") || !event.endsWith(":bid")) return;
    upsertFromBid(payload.auction as Auction, payload.bid as Bid);
  });

  // Periodic check for ended auctions → resolve win/loss
  setInterval(() => {
    const now = Date.now();
    let changed = false;
    state.encheres.forEach((e) => {
      if (e.status === "active" && new Date(e.endsAt).getTime() <= now) {
        if (e.jeSuisLeader) {
          e.status = "en_attente_validation";
          pushNotification({
            type: "won",
            titre: "Vous avez remporté l'enchère !",
            message: `${e.marque} ${e.modele} pour ${e.monMontant.toLocaleString("fr-MA")} DH. En attente de validation Bidlic.`,
            auctionId: e.auctionId,
          });
          // Create pending payment
          state.paiements = [
            {
              id: `p-${Date.now()}`,
              date: new Date().toISOString(),
              type: "achat",
              libelle: `${e.marque} ${e.modele} (${e.annee})`,
              montant: e.monMontant,
              status: "en_attente",
              reference: `INV-${e.auctionId.toUpperCase()}`,
              auctionId: e.auctionId,
            },
            ...state.paiements,
          ];
        } else {
          e.status = "perdue";
          pushNotification({
            type: "lost",
            titre: "Enchère terminée",
            message: `${e.marque} ${e.modele} — vous n'avez pas remporté cette enchère.`,
            auctionId: e.auctionId,
          });
        }
        changed = true;
      }
    });
    if (changed) emit();
  }, 5000);
}

export const acheteurStore = {
  getEncheres(): MonEnchere[] {
    install();
    return encheresSnapshot;
  },
  getPaiements(): Paiement[] {
    install();
    return paiementsSnapshot;
  },
  getNotifications(): Notification[] {
    install();
    return notificationsSnapshot;
  },
  unreadCount(): number {
    return state.notifications.filter((n) => !n.read).length;
  },
  markAllRead() {
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    emit();
  },
  markRead(id: string) {
    state.notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  },
  subscribe(l: () => void) {
    install();
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/* React hooks */

export function useMesEncheres(): MonEnchere[] {
  return useSyncExternalStore(
    acheteurStore.subscribe,
    acheteurStore.getEncheres,
    () => [],
  );
}

export function useMesPaiements(): Paiement[] {
  return useSyncExternalStore(
    acheteurStore.subscribe,
    acheteurStore.getPaiements,
    () => [],
  );
}

export function useMesNotifications(): Notification[] {
  return useSyncExternalStore(
    acheteurStore.subscribe,
    acheteurStore.getNotifications,
    () => [],
  );
}

// Re-export api for convenience in components
export { api };
