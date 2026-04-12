/**
 * TypeScript types for spec-ai-writer Frontend
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
  project_id: string;
  display_name: string;
  description?: string;
  current_phase: number;
  phase_status: Record<number, PhaseStatus>;
  created_at: string;
  updated_at: string;
  total_qa_pairs: number;
}

export interface ProjectCreate {
  display_name: string;
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
  project_id: string;
  current_phase: number;
  phases: PhaseInfo[];
  overall_progress: number;
}

export interface InterviewStartRequest {
  project_id: string;
  phase_num?: number;
}

export interface InterviewStartResponse {
  project_id: string;
  display_name: string;
  phase_num: number;
  phase_name: string;
  initial_message: string;
  all_complete?: boolean;
  chat_history?: ChatMessage[];
}

export interface UserAnswerRequest {
  project_id: string;
  question: string;
  answer: string;
}

export interface AssistantQuestionResponse {
  question: string;
  phase_complete: boolean;
  phase_num: number;
  qa_count: number;
}

export interface SpecificationResponse {
  project_id: string;
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
  project_id: string;
  specifications: SpecificationListItem[];
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  status_code: number;
}

// ---------- LLM Settings ----------

export type LLMProvider = 'claude' | 'openai' | 'bedrock';

export interface LLMSettingsResponse {
  provider: LLMProvider;
  openai_base_url: string;
  openai_model: string;
  openai_api_key_masked: string;
  anthropic_api_key_masked: string;
  bedrock_model_id: string;
  aws_region: string;
  aws_access_key_id_masked: string;
  aws_secret_access_key_masked: string;
  temperature: number;
}

/**
 * Payload for PUT /api/settings/llm.
 * All fields optional; empty strings on api_key fields are ignored server-side
 * so re-submitting a masked display value does NOT overwrite the real key.
 */
export interface LLMSettingsUpdateRequest {
  provider?: LLMProvider;
  openai_base_url?: string;
  openai_model?: string;
  openai_api_key?: string;
  anthropic_api_key?: string;
  bedrock_model_id?: string;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  temperature?: number;
}
