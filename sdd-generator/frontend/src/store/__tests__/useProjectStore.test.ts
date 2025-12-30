import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from '../useProjectStore'
import type { Project } from '@/types'

describe('useProjectStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useProjectStore.getState().reset()
  })

  it('should have initial state', () => {
    const state = useProjectStore.getState()

    expect(state.projects).toEqual([])
    expect(state.currentProject).toBeNull()
    expect(state.currentProjectStatus).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('should set projects', () => {
    const mockProjects: Project[] = [
      {
        name: 'project-1',
        current_phase: 1,
        phase_status: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        total_qa_pairs: 0,
      },
    ]

    useProjectStore.getState().setProjects(mockProjects)

    expect(useProjectStore.getState().projects).toEqual(mockProjects)
  })

  it('should set current project', () => {
    const mockProject: Project = {
      name: 'test-project',
      current_phase: 1,
      phase_status: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      total_qa_pairs: 0,
    }

    useProjectStore.getState().setCurrentProject(mockProject)

    expect(useProjectStore.getState().currentProject).toEqual(mockProject)
  })

  it('should set loading state', () => {
    useProjectStore.getState().setLoading(true)
    expect(useProjectStore.getState().isLoading).toBe(true)

    useProjectStore.getState().setLoading(false)
    expect(useProjectStore.getState().isLoading).toBe(false)
  })

  it('should set and clear error', () => {
    const errorMessage = 'Test error'

    useProjectStore.getState().setError(errorMessage)
    expect(useProjectStore.getState().error).toBe(errorMessage)

    useProjectStore.getState().clearError()
    expect(useProjectStore.getState().error).toBeNull()
  })

  it('should reset state', () => {
    // Set some state
    useProjectStore.getState().setProjects([{} as Project])
    useProjectStore.getState().setLoading(true)
    useProjectStore.getState().setError('Error')

    // Reset
    useProjectStore.getState().reset()

    const state = useProjectStore.getState()
    expect(state.projects).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})
