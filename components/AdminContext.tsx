"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AdminContext = createContext(false);

export function AdminProvider({ isAdmin, children }: { isAdmin: boolean; children: React.ReactNode }) {
  return <AdminContext.Provider value={isAdmin}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const isAdmin = useContext(AdminContext);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && isAdmin;
}
