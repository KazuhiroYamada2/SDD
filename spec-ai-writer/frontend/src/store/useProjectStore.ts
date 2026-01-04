/**
 * Zustand Store for Project Management
 */

import { create } from 'zustand';
import type { Project, ProjectStatusResponse } from '@/types';

interface ProjectStore {
  // State
  projects: Project[];
  currentProject: Project | null;
  currentProjectStatus: ProjectStatusResponse | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectStatus: (status: ProjectStatusResponse | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  // Initial state
  projects: [],
  currentProject: null,
  currentProjectStatus: null,
  isLoading: false,
  error: null,

  // Actions
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentProjectStatus: (status) => set({ currentProjectStatus: status }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () =>
    set({
      projects: [],
      currentProject: null,
      currentProjectStatus: null,
      isLoading: false,
      error: null,
    }),
}));
