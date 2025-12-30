import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { apiClient } from '../client'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Projects API', () => {
    it('should list projects', async () => {
      const mockData = {
        projects: [
          { name: 'project-1', current_phase: 1 },
          { name: 'project-2', current_phase: 2 },
        ],
        total: 2,
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockResolvedValue({ data: mockData })

      const result = await apiClient.listProjects()
      expect(result).toEqual(mockData)
    })

    it('should create project', async () => {
      const projectData = {
        name: 'new-project',
        description: 'Test project',
      }

      const mockResponse = {
        ...projectData,
        current_phase: 1,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await apiClient.createProject(projectData)
      expect(result.name).toBe(projectData.name)
    })

    it('should get project status', async () => {
      const projectName = 'test-project'
      const mockStatus = {
        project_name: projectName,
        current_phase: 1,
        phases: [],
        overall_progress: 0,
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockResolvedValue({ data: mockStatus })

      const result = await apiClient.getProjectStatus(projectName)
      expect(result.project_name).toBe(projectName)
    })
  })

  describe('Interview API', () => {
    it('should start interview', async () => {
      const request = {
        project_name: 'test-project',
      }

      const mockResponse = {
        project_name: 'test-project',
        phase_num: 1,
        phase_name: '原則定義',
        initial_message: 'Welcome!',
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.post.mockResolvedValue({ data: mockResponse })

      const result = await apiClient.startInterview(request)
      expect(result.phase_num).toBe(1)
    })
  })

  describe('Specifications API', () => {
    it('should list specifications', async () => {
      const projectName = 'test-project'
      const mockData = {
        project_name: projectName,
        specifications: [
          { phase_num: 1, exists: true },
          { phase_num: 2, exists: false },
        ],
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockResolvedValue({ data: mockData })

      const result = await apiClient.listSpecifications(projectName)
      expect(result.specifications).toHaveLength(2)
    })

    it('should get specification', async () => {
      const projectName = 'test-project'
      const phaseNum = 1

      const mockSpec = {
        project_name: projectName,
        phase_num: phaseNum,
        phase_name: '原則定義',
        content: '# Test Content',
        filename: '01-principle-definition.md',
        generated_at: '2024-01-01T00:00:00Z',
      }

      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockResolvedValue({ data: mockSpec })

      const result = await apiClient.getSpecification(projectName, phaseNum)
      expect(result.phase_num).toBe(phaseNum)
      expect(result.content).toBe('# Test Content')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      await expect(apiClient.listProjects()).rejects.toThrow('Network error')
    })

    it('should handle HTTP errors', async () => {
      mockedAxios.create.mockReturnThis()
      mockedAxios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
      })

      await expect(apiClient.getProject('nonexistent')).rejects.toBeTruthy()
    })
  })
})
