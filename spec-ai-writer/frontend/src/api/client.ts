/**
 * API Client for spec-ai-writer Backend
 *
 * Provides typed methods for interacting with FastAPI backend
 * Supports mock mode when VITE_USE_MOCK_API=true
 */

import axios, { AxiosInstance } from 'axios';
import type {
  Project,
  ProjectCreate,
  ProjectListResponse,
  ProjectStatusResponse,
  InterviewStartRequest,
  InterviewStartResponse,
  UserAnswerRequest,
  AssistantQuestionResponse,
  SpecificationResponse,
  SpecificationListResponse,
} from '@/types';
import { mockApiClient } from './mockClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  // Projects API
  async listProjects(): Promise<ProjectListResponse> {
    // Backend route is registered at "/api/projects/" (trailing slash).
    const response = await this.client.get<ProjectListResponse>('/api/projects/');
    return response.data;
  }

  async getProject(projectName: string): Promise<Project> {
    const response = await this.client.get<Project>(`/api/projects/${projectName}`);
    return response.data;
  }

  async getProjectStatus(projectName: string): Promise<ProjectStatusResponse> {
    const response = await this.client.get<ProjectStatusResponse>(
      `/api/projects/${projectName}/status`
    );
    return response.data;
  }

  async createProject(data: ProjectCreate): Promise<Project> {
    // Backend route is registered at "/api/projects/" (trailing slash).
    // Using the trailing slash avoids a 307 redirect on POST.
    const response = await this.client.post<Project>('/api/projects/', data);
    return response.data;
  }

  async deleteProject(projectName: string): Promise<void> {
    await this.client.delete(`/api/projects/${projectName}`);
  }

  // Interview API
  async startInterview(data: InterviewStartRequest): Promise<InterviewStartResponse> {
    const response = await this.client.post<InterviewStartResponse>(
      '/api/interview/start',
      data
    );
    return response.data;
  }

  async submitAnswer(data: UserAnswerRequest): Promise<AssistantQuestionResponse> {
    const response = await this.client.post<AssistantQuestionResponse>(
      '/api/interview/answer',
      data
    );
    return response.data;
  }

  // Specifications API
  async listSpecifications(projectName: string): Promise<SpecificationListResponse> {
    const response = await this.client.get<SpecificationListResponse>(
      `/api/specs/${projectName}`
    );
    return response.data;
  }

  async getSpecification(
    projectName: string,
    phaseNum: number
  ): Promise<SpecificationResponse> {
    const response = await this.client.get<SpecificationResponse>(
      `/api/specs/${projectName}/${phaseNum}`
    );
    return response.data;
  }

  async downloadSpecification(projectName: string, phaseNum: number): Promise<Blob> {
    const response = await this.client.get(
      `/api/specs/${projectName}/${phaseNum}/download`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  async downloadAllSpecifications(projectName: string): Promise<Blob> {
    const response = await this.client.get(`/api/specs/${projectName}/download-all`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

// Export appropriate client based on environment
export const apiClient = USE_MOCK_API ? mockApiClient : new APIClient();
export default apiClient;
