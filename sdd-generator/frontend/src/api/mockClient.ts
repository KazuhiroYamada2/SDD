/**
 * Mock API Client for Development/Demo
 * 
 * Provides mock data when API keys are not configured
 */

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

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockAPIClient {
  private mockProjects: Project[] = [
    {
      name: 'demo-project',
      description: 'デモプロジェクト',
      current_phase: 3,
      phase_status: {
        1: 'completed',
        2: 'completed',
        3: 'in_progress',
        4: 'not_started',
        5: 'not_started',
        6: 'not_started',
        7: 'not_started',
      },
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      total_qa_pairs: 15,
    },
    {
      name: 'sample-webapp',
      description: 'サンプルWebアプリケーション',
      current_phase: 7,
      phase_status: {
        1: 'completed',
        2: 'completed',
        3: 'completed',
        4: 'completed',
        5: 'completed',
        6: 'completed',
        7: 'completed',
      },
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      total_qa_pairs: 42,
    },
  ];

  async healthCheck() {
    await delay(300);
    return {
      status: 'healthy',
      llm_provider: 'mock',
      mode: 'mock',
    };
  }

  async listProjects(): Promise<ProjectListResponse> {
    await delay(500);
    return {
      projects: [...this.mockProjects],
      total: this.mockProjects.length,
    };
  }

  async getProject(projectName: string): Promise<Project> {
    await delay(300);
    const project = this.mockProjects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }
    return { ...project };
  }

  async getProjectStatus(projectName: string): Promise<ProjectStatusResponse> {
    await delay(300);
    const project = this.mockProjects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const phases = [
      { phase_num: 1, phase_name: '原則定義', description: 'プロジェクトの基本原則を定義', status: project.phase_status[1] as any, qa_count: 3, required_fields: [], filename: '01-principle-definition.md' },
      { phase_num: 2, phase_name: '企画・要件定義', description: '要件を明確化', status: project.phase_status[2] as any, qa_count: 5, required_fields: [], filename: '02-planning-requirement.md' },
      { phase_num: 3, phase_name: '設計計画', description: '設計方針を決定', status: project.phase_status[3] as any, qa_count: 4, required_fields: [], filename: '03-design-planning.md' },
      { phase_num: 4, phase_name: 'タスク分割', description: '作業を細分化', status: project.phase_status[4] as any, qa_count: 0, required_fields: [], filename: '04-task-breakdown.md' },
      { phase_num: 5, phase_name: '実装', description: '実装を進める', status: project.phase_status[5] as any, qa_count: 0, required_fields: [], filename: '05-implementation.md' },
      { phase_num: 6, phase_name: '検証・受入', description: 'テストと検証', status: project.phase_status[6] as any, qa_count: 0, required_fields: [], filename: '06-verification-acceptance.md' },
      { phase_num: 7, phase_name: '移行・運用', description: '本番環境への移行', status: project.phase_status[7] as any, qa_count: 0, required_fields: [], filename: '07-migration-operation.md' },
    ];

    const completedCount = phases.filter(p => p.status === 'completed').length;
    return {
      project_name: projectName,
      current_phase: project.current_phase,
      phases,
      overall_progress: Math.round((completedCount / 7) * 100),
    };
  }

  async createProject(data: ProjectCreate): Promise<Project> {
    await delay(500);
    const newProject: Project = {
      name: data.name,
      description: data.description,
      current_phase: 1,
      phase_status: {
        1: 'not_started',
        2: 'not_started',
        3: 'not_started',
        4: 'not_started',
        5: 'not_started',
        6: 'not_started',
        7: 'not_started',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_qa_pairs: 0,
    };
    this.mockProjects.push(newProject);
    return { ...newProject };
  }

  async deleteProject(projectName: string): Promise<void> {
    await delay(300);
    this.mockProjects = this.mockProjects.filter(p => p.name !== projectName);
  }

  async startInterview(data: InterviewStartRequest): Promise<InterviewStartResponse> {
    await delay(800);
    const phaseNum = data.phase_num || 1;
    const phaseNames = [
      '原則定義',
      '企画・要件定義',
      '設計計画',
      'タスク分割',
      '実装',
      '検証・受入',
      '移行・運用',
    ];
    return {
      project_name: data.project_name,
      phase_num: phaseNum,
      phase_name: phaseNames[phaseNum - 1],
      initial_message: `こんにちは！フェーズ${phaseNum}「${phaseNames[phaseNum - 1]}」のインタビューを開始します。\n\nまず、プロジェクトの概要について教えてください。`,
    };
  }

  async submitAnswer(data: UserAnswerRequest): Promise<AssistantQuestionResponse> {
    await delay(1000);
    // Simulate interview progression
    const mockQuestions = [
      'ありがとうございます。次に、プロジェクトの主要な目的について詳しく教えてください。',
      '理解しました。では、このプロジェクトで最も重要な成功基準は何でしょうか？',
      '素晴らしいですね。最後に、プロジェクトの制約事項があれば教えてください。',
    ];
    const randomQuestion = mockQuestions[Math.floor(Math.random() * mockQuestions.length)];
    
    return {
      question: randomQuestion,
      phase_complete: Math.random() > 0.7, // 30% chance of phase completion
      phase_num: 1,
      qa_count: Math.floor(Math.random() * 10) + 1,
    };
  }

  async listSpecifications(projectName: string): Promise<SpecificationListResponse> {
    await delay(400);
    const project = this.mockProjects.find(p => p.name === projectName);
    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    const phaseNames = [
      '原則定義',
      '企画・要件定義',
      '設計計画',
      'タスク分割',
      '実装',
      '検証・受入',
      '移行・運用',
    ];

    const filenames = [
      '01-principle-definition.md',
      '02-planning-requirement.md',
      '03-design-planning.md',
      '04-task-breakdown.md',
      '05-implementation.md',
      '06-verification-acceptance.md',
      '07-migration-operation.md',
    ];

    const specifications = filenames.map((filename, index) => ({
      phase_num: index + 1,
      phase_name: phaseNames[index],
      filename,
      file_size: project.phase_status[index + 1] === 'completed' ? 15000 + Math.random() * 10000 : undefined,
      generated_at: project.phase_status[index + 1] === 'completed' 
        ? new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      exists: project.phase_status[index + 1] === 'completed',
    }));

    return {
      project_name: projectName,
      specifications,
    };
  }

  async getSpecification(projectName: string, phaseNum: number): Promise<SpecificationResponse> {
    await delay(400);
    const phaseNames = [
      '原則定義',
      '企画・要件定義',
      '設計計画',
      'タスク分割',
      '実装',
      '検証・受入',
      '移行・運用',
    ];
    const filenames = [
      '01-principle-definition.md',
      '02-planning-requirement.md',
      '03-design-planning.md',
      '04-task-breakdown.md',
      '05-implementation.md',
      '06-verification-acceptance.md',
      '07-migration-operation.md',
    ];

    return {
      project_name: projectName,
      phase_num: phaseNum,
      phase_name: phaseNames[phaseNum - 1],
      filename: filenames[phaseNum - 1],
      content: `# ${phaseNames[phaseNum - 1]}\n\n## 概要\n\nこれはモックモードで表示されているサンプル仕様書です。\n\n実際の仕様書を生成するには、LLM APIキーを設定してバックエンドサーバーを起動してください。\n\n## プロジェクト情報\n\n- プロジェクト名: ${projectName}\n- フェーズ: ${phaseNum}\n\n## 内容\n\nこの仕様書は、実際のインタビューを通じて生成されます。\n\nモックモードでは、実際のLLM APIを呼び出さないため、このサンプルコンテンツが表示されています。`,
      generated_at: new Date().toISOString(),
    };
  }

  async downloadSpecification(projectName: string, phaseNum: number): Promise<Blob> {
    await delay(500);
    const spec = await this.getSpecification(projectName, phaseNum);
    return new Blob([spec.content], { type: 'text/markdown' });
  }

  async downloadAllSpecifications(projectName: string): Promise<Blob> {
    await delay(800);
    const list = await this.listSpecifications(projectName);
    const completedSpecs = list.specifications.filter(s => s.exists);
    const content = completedSpecs.map(s => `# ${s.phase_name}\n\n[仕様書内容]\n\n`).join('\n\n---\n\n');
    return new Blob([content], { type: 'text/markdown' });
  }
}

export const mockApiClient = new MockAPIClient();
export default mockApiClient;
