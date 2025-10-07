import React, { useState, useEffect, useCallback } from 'react';
import { getLogs, clearLogs, exportLogs, getLogStats } from '../utils/logger';
import { LOG_LEVELS, LOG_CATEGORIES } from '../utils/logger';

/**
 * Dashboard de Logs para monitoramento e debugging
 */
const LogDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    startDate: '',
    endDate: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar logs e estatísticas
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filteredLogs = getLogs(filters);
      const logStats = getLogStats();
      setLogs(filteredLogs);
      setStats(logStats);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualizar filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      startDate: '',
      endDate: ''
    });
  };

  // Limpar logs
  const handleClearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs?')) {
      clearLogs();
      loadData();
    }
  };

  // Exportar logs
  const handleExportLogs = (format) => {
    const data = exportLogs(format);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Obter cor do nível
  const getLevelColor = (level) => {
    switch (level) {
      case LOG_LEVELS.ERROR: return 'text-red-600 bg-red-50';
      case LOG_LEVELS.WARN: return 'text-yellow-600 bg-yellow-50';
      case LOG_LEVELS.INFO: return 'text-blue-600 bg-blue-50';
      case LOG_LEVELS.DEBUG: return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Obter cor da categoria
  const getCategoryColor = (category) => {
    switch (category) {
      case LOG_CATEGORIES.AUTH: return 'bg-purple-100 text-purple-800';
      case LOG_CATEGORIES.API: return 'bg-green-100 text-green-800';
      case LOG_CATEGORIES.UI: return 'bg-blue-100 text-blue-800';
      case LOG_CATEGORIES.PERFORMANCE: return 'bg-orange-100 text-orange-800';
      case LOG_CATEGORIES.USER: return 'bg-pink-100 text-pink-800';
      case LOG_CATEGORIES.SYSTEM: return 'bg-gray-100 text-gray-800';
      case LOG_CATEGORIES.SECURITY: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Formatar timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  // Formatar dados
  const formatData = (data) => {
    if (!data) return 'N/A';
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div className="log-dashboard">
      <div className="dashboard-header">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard de Logs</h1>
        <p className="text-gray-600">Monitoramento e debugging da aplicação</p>
      </div>

      {/* Estatísticas */}
      <div className="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total de Logs</h3>
          <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
        </div>
        <div className="stat-card bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Erros</h3>
          <p className="text-2xl font-bold text-red-600">{stats.errors || 0}</p>
        </div>
        <div className="stat-card bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Avisos</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.warnings || 0}</p>
        </div>
        <div className="stat-card bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Últimas 24h</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.last24h || 0}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value={LOG_LEVELS.ERROR}>Erro</option>
              <option value={LOG_LEVELS.WARN}>Aviso</option>
              <option value={LOG_LEVELS.INFO}>Info</option>
              <option value={LOG_LEVELS.DEBUG}>Debug</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas</option>
              <option value={LOG_CATEGORIES.AUTH}>Auth</option>
              <option value={LOG_CATEGORIES.API}>API</option>
              <option value={LOG_CATEGORIES.UI}>UI</option>
              <option value={LOG_CATEGORIES.PERFORMANCE}>Performance</option>
              <option value={LOG_CATEGORIES.USER}>User</option>
              <option value={LOG_CATEGORIES.SYSTEM}>System</option>
              <option value={LOG_CATEGORIES.SECURITY}>Security</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Limpar Filtros
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="actions bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Ações</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportLogs('json')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Exportar JSON
          </button>
          <button
            onClick={() => handleExportLogs('csv')}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Exportar CSV
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Limpar Logs
          </button>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="logs-container bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Logs ({logs.length})</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Carregando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum log encontrado
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(log.category)}`}>
                          {log.category.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{log.message}</p>
                      {log.data && (
                        <p className="text-xs text-gray-500 mt-1">
                          Dados: {log.data.length > 100 ? `${log.data.substring(0, 100)}...` : log.data}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Detalhes do Log</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nível</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(selectedLog.level)}`}>
                    {selectedLog.level.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Categoria</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedLog.category)}`}>
                    {selectedLog.category.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                  <p className="text-sm text-gray-900">{selectedLog.message}</p>
                </div>
                {selectedLog.data && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Dados</label>
                    <pre className="text-xs text-gray-900 bg-gray-100 p-2 rounded overflow-x-auto">
                      {formatData(selectedLog.data)}
                    </pre>
                  </div>
                )}
                {selectedLog.error && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Erro</label>
                    <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-x-auto">
                      {selectedLog.error.stack}
                    </pre>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL</label>
                  <p className="text-sm text-gray-900">{selectedLog.url}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-sm text-gray-900">{selectedLog.userId || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogDashboard;
