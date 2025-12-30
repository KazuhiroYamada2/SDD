/**
 * Zustand Store for Interview State
 */

import { create } from 'zustand';
import type { ChatMessage } from '@/types';

interface InterviewStore {
  // State
  projectName: string | null;
  currentPhase: number;
  phaseName: string;
  messages: ChatMessage[];
  isInterviewActive: boolean;
  isWaitingForResponse: boolean;

  // Actions
  setProjectName: (name: string) => void;
  setCurrentPhase: (phase: number, name: string) => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setInterviewActive: (isActive: boolean) => void;
  setWaitingForResponse: (isWaiting: boolean) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  // Initial state
  projectName: null,
  currentPhase: 1,
  phaseName: '',
  messages: [],
  isInterviewActive: false,
  isWaitingForResponse: false,

  // Actions
  setProjectName: (name) => set({ projectName: name }),
  setCurrentPhase: (phase, name) => set({ currentPhase: phase, phaseName: name }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setInterviewActive: (isActive) => set({ isInterviewActive: isActive }),
  setWaitingForResponse: (isWaiting) => set({ isWaitingForResponse: isWaiting }),
  reset: () =>
    set({
      projectName: null,
      currentPhase: 1,
      phaseName: '',
      messages: [],
      isInterviewActive: false,
      isWaitingForResponse: false,
    }),
}));
