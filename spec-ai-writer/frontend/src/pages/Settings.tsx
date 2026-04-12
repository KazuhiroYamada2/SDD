import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiClient from '@/api/client';
import type {
  LLMProvider,
  LLMSettingsResponse,
  LLMSettingsUpdateRequest,
} from '@/types';

/**
 * Presets for OpenAI-compatible endpoints. Selecting a preset pre-fills the
 * base_url field so the user does not have to remember the exact URL.
 */
type PresetKey = 'openai_official' | 'openrouter' | 'ollama' | 'lm_studio' | 'custom';

interface Preset {
  label: string;
  base_url: string;
  hint: string;
  example_model: string;
}

const OPENAI_PRESETS: Record<PresetKey, Preset> = {
  openai_official: {
    label: 'OpenAI (公式)',
    base_url: '',
    hint: 'OpenAI の公式 API を使用します。OPENAI_API_KEY が必須です。',
    example_model: 'gpt-4-turbo-preview',
  },
  openrouter: {
    label: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1',
    hint: 'OpenRouter の API を使用します。OpenRouter の API キーとモデル ID (例: anthropic/claude-3.5-sonnet) が必要です。',
    example_model: 'anthropic/claude-3.5-sonnet',
  },
  ollama: {
    label: 'Ollama (ローカル)',
    base_url: 'http://localhost:11434/v1',
    hint: 'ローカルで動作する Ollama に接続します。API キーは不要なので空欄で OK です。',
    example_model: 'llama3.1:8b',
  },
  lm_studio: {
    label: 'LM Studio (ローカル)',
    base_url: 'http://localhost:1234/v1',
    hint: 'ローカルで動作する LM Studio に接続します。API キーは不要なので空欄で OK です。',
    example_model: 'local-model',
  },
  custom: {
    label: 'カスタム (その他 OpenAI 互換)',
    base_url: '',
    hint: 'llama.cpp の OpenAI 互換モードなど、任意の互換エンドポイントを手動で指定できます。',
    example_model: '',
  },
};

function detectPreset(baseUrl: string): PresetKey {
  if (!baseUrl) return 'openai_official';
  if (baseUrl.includes('openrouter.ai')) return 'openrouter';
  if (baseUrl.includes('11434')) return 'ollama';
  if (baseUrl.includes('1234')) return 'lm_studio';
  return 'custom';
}

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: initialSettings, isLoading, error } = useQuery({
    queryKey: ['llm-settings'],
    queryFn: () => apiClient.getLLMSettings(),
  });

  // Form state
  const [provider, setProvider] = useState<LLMProvider>('claude');
  const [preset, setPreset] = useState<PresetKey>('openai_official');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [openaiModel, setOpenaiModel] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [bedrockModelId, setBedrockModelId] = useState('');
  const [awsRegion, setAwsRegion] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [temperature, setTemperature] = useState<number>(0.7);

  const [dirty, setDirty] = useState(false);
  const [saveNotice, setSaveNotice] = useState<
    | { kind: 'success'; message: string }
    | { kind: 'error'; message: string }
    | null
  >(null);

  // Populate form state from server response on load.
  useEffect(() => {
    if (!initialSettings) return;
    setProvider(initialSettings.provider);
    setOpenaiBaseUrl(initialSettings.openai_base_url);
    setOpenaiModel(initialSettings.openai_model);
    setPreset(detectPreset(initialSettings.openai_base_url));
    setBedrockModelId(initialSettings.bedrock_model_id);
    setAwsRegion(initialSettings.aws_region);
    setTemperature(initialSettings.temperature);
    // Keys stay blank — they are masked and should only be sent when the
    // user explicitly enters a new value.
    setOpenaiApiKey('');
    setAnthropicApiKey('');
    setAwsAccessKeyId('');
    setAwsSecretAccessKey('');
    setDirty(false);
  }, [initialSettings]);

  const mutation = useMutation({
    mutationFn: (data: LLMSettingsUpdateRequest) => apiClient.updateLLMSettings(data),
    onSuccess: (data: LLMSettingsResponse) => {
      queryClient.setQueryData(['llm-settings'], data);
      setDirty(false);
      setSaveNotice({
        kind: 'success',
        message: '設定を保存し、即座に反映しました。',
      });
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.detail ?? err?.message ?? '不明なエラー';
      setSaveNotice({ kind: 'error', message: `保存に失敗しました: ${detail}` });
    },
  });

  const handlePresetChange = (key: PresetKey) => {
    setPreset(key);
    const p = OPENAI_PRESETS[key];
    // Only overwrite base_url when the preset defines one (the "custom"
    // preset preserves whatever the user already typed).
    if (key !== 'custom') {
      setOpenaiBaseUrl(p.base_url);
    }
    if (!openaiModel && p.example_model) {
      setOpenaiModel(p.example_model);
    }
    setDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveNotice(null);

    const payload: LLMSettingsUpdateRequest = {
      provider,
      openai_base_url: openaiBaseUrl,
      openai_model: openaiModel,
      bedrock_model_id: bedrockModelId,
      aws_region: awsRegion,
      temperature,
    };
    // Only send API key fields when the user typed something new.
    if (openaiApiKey) payload.openai_api_key = openaiApiKey;
    if (anthropicApiKey) payload.anthropic_api_key = anthropicApiKey;
    if (awsAccessKeyId) payload.aws_access_key_id = awsAccessKeyId;
    if (awsSecretAccessKey) payload.aws_secret_access_key = awsSecretAccessKey;

    mutation.mutate(payload);
  };

  const markDirty = () => {
    setDirty(true);
    if (saveNotice?.kind === 'success') setSaveNotice(null);
  };

  const currentPresetHint = useMemo(() => OPENAI_PRESETS[preset].hint, [preset]);

  if (isLoading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400">
        設定を読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="h-5 w-5" />
          <span>設定の読み込みに失敗しました。</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          LLM 設定
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          使用する LLM プロバイダと認証情報を設定します。保存すると即座に反映されます (再起動不要)。
        </p>
      </div>

      {/* Security warning */}
      <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start gap-3 text-sm text-yellow-800 dark:text-yellow-200">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">API キーは平文で保存されます</p>
            <p className="mt-1">
              設定は <code className="px-1 bg-yellow-100 dark:bg-yellow-900 rounded">data/llm_settings.json</code> に保存されます。
              共有マシンでの使用は避けてください。
            </p>
          </div>
        </div>
      </div>

      {saveNotice && (
        <div
          className={
            saveNotice.kind === 'success'
              ? 'card bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }
        >
          <div
            className={
              saveNotice.kind === 'success'
                ? 'flex items-center gap-3 text-green-700 dark:text-green-300'
                : 'flex items-center gap-3 text-red-700 dark:text-red-300'
            }
          >
            {saveNotice.kind === 'success' ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{saveNotice.message}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider selector */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            プロバイダ
          </h3>
          <div className="space-y-2">
            {(['claude', 'openai', 'bedrock'] as const).map((p) => (
              <label key={p} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  value={p}
                  checked={provider === p}
                  onChange={() => {
                    setProvider(p);
                    markDirty();
                  }}
                  className="h-4 w-4 text-primary-600"
                />
                <span className="text-gray-900 dark:text-white">
                  {p === 'claude' && 'Claude (Anthropic API)'}
                  {p === 'openai' && 'OpenAI / OpenRouter / ローカル LLM'}
                  {p === 'bedrock' && 'AWS Bedrock'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Claude section */}
        {provider === 'claude' && (
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Claude (Anthropic API)
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API キー
              </label>
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => {
                  setAnthropicApiKey(e.target.value);
                  markDirty();
                }}
                placeholder={
                  initialSettings?.anthropic_api_key_masked
                    ? `現在: ${initialSettings.anthropic_api_key_masked} (変更する場合のみ入力)`
                    : 'sk-ant-...'
                }
                className="input w-full"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {/* OpenAI / OpenRouter / Local LLM section */}
        {provider === 'openai' && (
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              OpenAI 互換エンドポイント
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                プリセット
              </label>
              <select
                value={preset}
                onChange={(e) => handlePresetChange(e.target.value as PresetKey)}
                className="input w-full"
              >
                {Object.entries(OPENAI_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {currentPresetHint}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={openaiBaseUrl}
                onChange={(e) => {
                  setOpenaiBaseUrl(e.target.value);
                  markDirty();
                }}
                placeholder="空欄で OpenAI 公式 API"
                className="input w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                モデル ID
              </label>
              <input
                type="text"
                value={openaiModel}
                onChange={(e) => {
                  setOpenaiModel(e.target.value);
                  markDirty();
                }}
                placeholder={OPENAI_PRESETS[preset].example_model || 'gpt-4-turbo-preview'}
                className="input w-full font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API キー
                {preset === 'ollama' || preset === 'lm_studio' ? (
                  <span className="ml-2 text-xs text-gray-500">(ローカル LLM では通常不要)</span>
                ) : null}
              </label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => {
                  setOpenaiApiKey(e.target.value);
                  markDirty();
                }}
                placeholder={
                  initialSettings?.openai_api_key_masked
                    ? `現在: ${initialSettings.openai_api_key_masked} (変更する場合のみ入力)`
                    : 'sk-... / sk-or-v1-...'
                }
                className="input w-full"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {/* Bedrock section */}
        {provider === 'bedrock' && (
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AWS Bedrock
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                モデル ID
              </label>
              <input
                type="text"
                value={bedrockModelId}
                onChange={(e) => {
                  setBedrockModelId(e.target.value);
                  markDirty();
                }}
                className="input w-full font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                リージョン
              </label>
              <input
                type="text"
                value={awsRegion}
                onChange={(e) => {
                  setAwsRegion(e.target.value);
                  markDirty();
                }}
                placeholder="ap-northeast-1"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AWS Access Key ID
              </label>
              <input
                type="password"
                value={awsAccessKeyId}
                onChange={(e) => {
                  setAwsAccessKeyId(e.target.value);
                  markDirty();
                }}
                placeholder={
                  initialSettings?.aws_access_key_id_masked
                    ? `現在: ${initialSettings.aws_access_key_id_masked} (変更する場合のみ入力)`
                    : 'AKIA...'
                }
                className="input w-full"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                AWS Secret Access Key
              </label>
              <input
                type="password"
                value={awsSecretAccessKey}
                onChange={(e) => {
                  setAwsSecretAccessKey(e.target.value);
                  markDirty();
                }}
                placeholder={
                  initialSettings?.aws_secret_access_key_masked
                    ? `現在: ${initialSettings.aws_secret_access_key_masked} (変更する場合のみ入力)`
                    : ''
                }
                className="input w-full"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {/* Common: temperature */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            生成パラメータ
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temperature: <span className="font-mono">{temperature.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => {
                setTemperature(parseFloat(e.target.value));
                markDirty();
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!dirty || mutation.isPending}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
          {dirty && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              未保存の変更があります
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
