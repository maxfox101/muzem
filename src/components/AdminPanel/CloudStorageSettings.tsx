import { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';

interface CloudStorageConfig {
  enabled: boolean;
  link: string;
  max_size_mb: number;
}

export default function CloudStorageSettings() {
  const [config, setConfig] = useState<CloudStorageConfig>({
    enabled: false,
    link: '',
    max_size_mb: 50,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getCloudStorageConfig().then((res) => {
      setLoading(false);
      if (res.data) setConfig({ enabled: !!res.data.enabled, link: res.data.link || '', max_size_mb: res.data.max_size_mb ?? 50 });
      if (res.error) setError(res.error);
    });
  }, []);

  const handleSave = async () => {
    setError(null);
    const res = await adminApi.updateCloudStorageConfig(config);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="base-card max-w-2xl mx-auto text-accessible">Загрузка…</div>;
  return (
    <div className="base-card modal max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-accessible">Настройки облачного хранилища</h2>
      {error && <p className="mb-4 text-red-600 font-medium">{error}</p>}
      
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="cloud_enabled"
            className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-200"
            checked={config.enabled}
            onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          <label htmlFor="cloud_enabled" className="text-lg font-medium text-accessible">
            Активно
          </label>
        </div>

        {config.enabled && (
          <>
            <div>
              <label htmlFor="cloud_link" className="block mb-2 font-medium text-accessible">
                🔗 Ссылка:
              </label>
              <input
                type="url"
                id="cloud_link"
                className="base-input"
                value={config.link}
                onChange={(e) => setConfig(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://cloud.example.com/upload"
              />
            </div>

            <div>
              <label htmlFor="max_size" className="block mb-2 font-medium text-accessible">
                📏 Макс размер (МБ):
              </label>
              <input
                type="number"
                id="max_size"
                className="base-input"
                value={config.max_size_mb}
                onChange={(e) => setConfig(prev => ({ ...prev, max_size_mb: parseInt(e.target.value) || 50 }))}
                min="1"
                max="1000"
              />
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          className="base-button bg-green-600 text-white border-green-600 hover:bg-green-700"
        >
          {saved ? '✓ Сохранено' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
