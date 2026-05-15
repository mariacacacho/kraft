import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project } from '../types';

interface ProjectState {
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;
  projects: Project[];
  setProjects: (projects: Project[]) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      projects: [],
      setActiveProject: (id) => set({ activeProjectId: id }),
      setProjects: (projects) => set({ projects }),
    }),
    { name: 'kraft_project' }
  )
);
