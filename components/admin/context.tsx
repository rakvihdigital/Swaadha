'use client';
import { createContext, useContext } from 'react';
import { useAdminData } from './state/use-admin-data';
import { useUploads } from './state/use-uploads';
import { useProducts } from './state/use-products';
import { useCategories } from './state/use-categories';
import { useBanners } from './state/use-banners';
import { useCoupons } from './state/use-coupons';
import { useOrders } from './state/use-orders';
import { useTeam } from './state/use-team';
import { usePos } from './state/use-pos';

/** All admin state and actions, combined. Created once by the admin shell. */
export function useAdminState() {
  const data = useAdminData();
  return {
    ...data,
    ...useUploads(data),
    ...useProducts(data),
    ...useCategories(data),
    ...useBanners(data),
    ...useCoupons(data),
    ...useOrders(data),
    ...useTeam(data),
    ...usePos(data),
  };
}

export type AdminValue = ReturnType<typeof useAdminState>;
export const AdminContext = createContext<AdminValue | null>(null);

/** What admin pages, dialogs and the frame use to read data and run actions. */
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside the admin layout');
  return value;
}
