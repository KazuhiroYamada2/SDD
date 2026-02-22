import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Clock, Circle } from 'lucide-react';
import apiClient from '@/api/client';
import type { PhaseStatus } from '@/types';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: status, isLoading } = useQuery({
    queryKey: ['project-status', projectId],
    queryFn: () => apiClient.getProjectStatus(projectId!),
    enabled: !!projectId,
  });

  const getStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  if (!projectId) {
    return (
      <div className="card">
        <p className="text-red-600">プロジェクトIDが指定されていません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="btn btn-ghost p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {projectId}
        </h2>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
        </div>
      )}

      {status && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">進捗概要</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>全体進捗</span>
                <span className="font-bold">{(status.overall_progress * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full"
                  style={{ width: `${status.overall_progress * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {status.phases.map((phase) => (
              <div key={phase.phase_num} className="card">
                <div className="flex items-start gap-4">
                  {getStatusIcon(phase.status)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      フェーズ {phase.phase_num}: {phase.phase_name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {phase.description}
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        Q&A数: {phase.qa_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
