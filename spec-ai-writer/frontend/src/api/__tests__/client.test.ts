import { describe, it, expect, beforeEach, vi } from 'vitest'

// Create mock axios instance with interceptors
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}))

// Import after mock setup
const { apiClient } = await import('../client')

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Projects API', () => {
    it('should list projects', async () => {
      const mockData = {
        projects: [
          { project_id: 'proj_001', display_name: 'project-1', current_phase: 1 },
          { project_id: 'proj_002', display_name: 'project-2', current_phase: 2 },
        ],
        total: 2,
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockData })

      const result = await apiClient.listProjects()
      expect(result).toEqual(mockData)
    })

    it('should create project', async () => {
      const projectData = {
        display_name: 'new-project',
        description: 'Test project',
      }

      const mockResponse = {
        project_id: 'proj_003',
        display_name: projectData.display_name,
        description: projectData.description,
        current_phase: 1,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse })

      const result = await apiClient.createProject(projectData)
      expect(result.display_name).toBe(projectData.display_name)
      expect(result.project_id).toBe('proj_003')
    })

    it('should get project status', async () => {
      const projectId = 'test_project_001'
      const mockStatus = {
        project_id: projectId,
        current_phase: 1,
        phases: [],
        overall_progress: 0,
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockStatus })

      const result = await apiClient.getProjectStatus(projectId)
      expect(result.project_id).toBe(projectId)
    })
  })

  describe('Interview API', () => {
    it('should start interview', async () => {
      const request = {
        project_id: 'test_project_001',
      }

      const mockResponse = {
        project_id: 'test_project_001',
        phase_num: 1,
        phase_name: '原則決定工程',
        initial_message: 'Welcome!',
      }

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse })

      const result = await apiClient.startInterview(request)
      expect(result.phase_num).toBe(1)
    })
  })

  describe('Specifications API', () => {
    it('should list specifications', async () => {
      const projectId = 'test_project_001'
      const mockData = {
        project_id: projectId,
        specifications: [
          { phase_num: 1, exists: true },
          { phase_num: 2, exists: false },
        ],
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockData })

      const result = await apiClient.listSpecifications(projectId)
      expect(result.specifications).toHaveLength(2)
    })

    it('should get specification', async () => {
      const projectId = 'test_project_001'
      const phaseNum = 1

      const mockSpec = {
        project_id: projectId,
        phase_num: phaseNum,
        phase_name: '原則決定工程',
        content: '# Test Content',
        filename: '01-principle-definition.md',
        generated_at: '2024-01-01T00:00:00Z',
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockSpec })

      const result = await apiClient.getSpecification(projectId, phaseNum)
      expect(result.phase_num).toBe(phaseNum)
      expect(result.content).toBe('# Test Content')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'))

      await expect(apiClient.listProjects()).rejects.toThrow('Network error')
    })

    it('should handle HTTP errors', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
      })

      await expect(apiClient.getProject('nonexistent')).rejects.toBeTruthy()
    })
  })
})
