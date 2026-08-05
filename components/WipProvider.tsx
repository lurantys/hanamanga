"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WipModal } from "./WipModal";
import type { Manga } from "@/lib/mangadex";

type WipContextValue = {
  openWip: (manga?: Manga) => void;
  closeWip: () => void;
};

const WipContext = createContext<WipContextValue | null>(null);

export function WipProvider({ children }: { children: ReactNode }) {
  const [media, setMedia] = useState<Manga | null>(null);
  const [open, setOpen] = useState(false);

  const openWip = useCallback((target?: Manga) => {
    setMedia(target ?? null);
    setOpen(true);
  }, []);

  const closeWip = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openWip, closeWip }),
    [openWip, closeWip],
  );

  return (
    <WipContext.Provider value={value}>
      {children}
      <WipModal open={open} media={media} onClose={closeWip} />
    </WipContext.Provider>
  );
}

export function useWip(): WipContextValue {
  const context = useContext(WipContext);
  if (!context) {
    throw new Error("useWip must be used within a WipProvider");
  }
  return context;
}
