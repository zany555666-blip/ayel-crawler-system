import { create } from "zustand";

interface CrawlStatusState {
  collecting: boolean;
  setCollecting: (collecting: boolean) => void;
}

export const useCrawlStatus = create<CrawlStatusState>((set) => ({
  collecting: false,
  setCollecting: (collecting) => set({ collecting }),
}));