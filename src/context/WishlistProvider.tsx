import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { WishlistApi } from "../lib/api";
import { normalizeId } from "../utils/format";
import type { ApiUser } from "../lib/types";

interface WishlistCtx {
  ids: Set<string>;
  loading: boolean;
  user: ApiUser | null;
  has: (id: string | number) => boolean;
  toggle: (id: string | number) => Promise<boolean>;
  reload: () => Promise<void>;
}

const Ctx = createContext<WishlistCtx>({
  ids: new Set(),
  loading: false,
  user: null,
  has: () => false,
  toggle: async () => false,
  reload: async () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const raw = await WishlistApi.ids();
      const rawList =
        raw.ids ||
        raw.savedPropertyIds ||
        (Array.isArray(raw.savedProperties)
          ? raw.savedProperties.map(x => (typeof x === "object" ? (x as { propertyId: unknown }).propertyId : x))
          : []) ||
        [];
      setIds(new Set((rawList as unknown[]).map(normalizeId)));
    } catch {
      // Wishlist is non-critical; keep previous state on failure.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const has = useCallback((id: unknown) => ids.has(normalizeId(id)), [ids]);

  const toggle = useCallback(
    async (id: string | number) => {
      const sid = normalizeId(id);
      if (!sid || !user) return false;
      const wasSaved = ids.has(sid);
      // optimistic
      const next = new Set(ids);
      if (wasSaved) next.delete(sid);
      else next.add(sid);
      setIds(next);
      try {
        if (wasSaved) await WishlistApi.remove(id);
        else await WishlistApi.add(id);
        return true;
      } catch {
        // revert
        const revert = new Set(ids);
        if (wasSaved) revert.add(sid);
        else revert.delete(sid);
        setIds(revert);
        return false;
      }
    },
    [ids, user]
  );

  return <Ctx.Provider value={{ ids, loading, user, has, toggle, reload }}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  return useContext(Ctx);
}
