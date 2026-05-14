import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CampaignType, LaunchLog } from "@/types/tiktok";

interface TikTokState {
  // Conexão (espelho do que está no banco — fonte de verdade é o servidor)
  connected: boolean;
  advertiserIds: string[];
  bcId: string | null;
  // Wizard
  currentStep: number;
  campaignType: CampaignType | null;
  selectedAccounts: string[];
  config: Record<string, unknown>;
  // Execução
  isLaunching: boolean;
  launchLogs: LaunchLog[];
  launchProgress: number;

  setConnection: (s: { connected: boolean; advertiserIds: string[]; bcId: string | null }) => void;
  setBcId: (bcId: string | null) => void;
  disconnect: () => void;

  setStep: (step: number) => void;
  setCampaignType: (type: CampaignType | null) => void;
  setSelectedAccounts: (ids: string[]) => void;
  updateConfig: (config: Record<string, unknown>) => void;

  startLaunch: () => void;
  addLog: (log: LaunchLog) => void;
  setProgress: (p: number) => void;
  finishLaunch: () => void;
  resetWizard: () => void;
}

export const useTikTokStore = create<TikTokState>()(
  persist(
    (set) => ({
      connected: false,
      advertiserIds: [],
      bcId: null,
      currentStep: 0,
      campaignType: null,
      selectedAccounts: [],
      config: {},
      isLaunching: false,
      launchLogs: [],
      launchProgress: 0,

      setConnection: ({ connected, advertiserIds, bcId }) =>
        set({ connected, advertiserIds, bcId }),
      setBcId: (bcId) => set({ bcId }),
      disconnect: () => set({ connected: false, advertiserIds: [], bcId: null }),

      setStep: (currentStep) => set({ currentStep }),
      setCampaignType: (campaignType) => set({ campaignType }),
      setSelectedAccounts: (selectedAccounts) => set({ selectedAccounts }),
      updateConfig: (config) => set((s) => ({ config: { ...s.config, ...config } })),

      startLaunch: () => set({ isLaunching: true, launchLogs: [], launchProgress: 0 }),
      addLog: (log) => set((s) => ({ launchLogs: [...s.launchLogs, log] })),
      setProgress: (launchProgress) => set({ launchProgress }),
      finishLaunch: () => set({ isLaunching: false, launchProgress: 100 }),
      resetWizard: () =>
        set({ currentStep: 0, campaignType: null, selectedAccounts: [], config: {} }),
    }),
    {
      name: "cognexpro_tiktok",
      partialize: (s) => ({
        connected: s.connected,
        advertiserIds: s.advertiserIds,
        bcId: s.bcId,
      }),
    },
  ),
);