"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminProvider } from "./AdminContext";

export function AdminWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(searchParams.get("admin") === "1");
  }, [searchParams]);

  return <AdminProvider isAdmin={isAdmin}>{children}</AdminProvider>;
}
