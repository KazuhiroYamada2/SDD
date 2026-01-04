/**
 * TypeScript types for SDD Generator Frontend
 *
 * Matches FastAPI backend models
 */

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed';

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: string;
}

export interface Project {
  name: string;
  description?: string;
  current_phase: number;
  phase_status: Record<number, PhaseStatus>;
  created_at: string;
  updated_at: string;
  total_qa_pairs: number;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  llm_provider?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface PhaseInfo {
  phase_num: number;
  phase_name: string;
  description: string;
  status: PhaseStatus;
  qa_count: number;
  required_fields: string[];
  filename: string;
}

export interface ProjectStatusResponse {
  project_name: string;
  current_phase: number;
  phases: PhaseInfo[];
  overall_progress: number;
}

export interface InterviewStartRequest {
  project_name: string;
  phase_num?: number;
}

export interface InterviewStartResponse {
  project_name: string;
  phase_num: number;
  phase_name: string;
  initial_message: string;
}

export interface UserAnswerRequest {
  project_name: string;
  answer: string;
}

export interface AssistantQuestionResponse {
  question: string;
  phase_complete: boolean;
  phase_num: number;
  qa_count: number;
}

export interface SpecificationResponse {
  project_name: string;
  phase_num: number;
  phase_name: string;
  filename: string;
  content: string;
  generated_at: string;
}

export interface SpecificationListItem {
  phase_num: number;
  phase_name: string;
  filename: string;
  file_size?: number;
  generated_at?: string;
  exists: boolean;
}

export interface SpecificationListResponse {
  project_name: string;
  specifications: SpecificationListItem[];
}

export interface WebSocketMessage {
  type: 'question' | 'answer' | 'phase_complete' | 'spec_generated' | 'complete' | 'error';
  content: string;
  metadata?: {
    phase_num?: number;
    phase_name?: string;
    qa_count?: number;
    filename?: string;
    project_name?: string;
  };
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  status_code: number;
}
