"use client"
import React, { useState } from 'react';
import { Upload, FileText, Play, Zap, Clock, CheckCircle, AlertCircle, X, Activity } from 'lucide-react';
import Image from 'next/image';
import icon from "../../public/icon.png"

const WorkerPoolTester = () => {
  const [file, setFile] = useState(null);
  const [requestCount, setRequestCount] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    success: 0,
    failed: 0,
    startTime: null,
    endTime: null
  });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const clearResults = () => {
    setResults([]);
    setStats({
      total: 0,
      completed: 0,
      success: 0,
      failed: 0,
      startTime: null,
      endTime: null
    });
  };

  const sendSingleRequest = async (requestId) => {
    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();

    try {
      const response = await fetch('http://localhost:5000/UploadInvoice', {
        method: 'POST',
        body: formData,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      let result = {
        id: requestId,
        status: 'success',
        duration,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        error: null,
        data: null
      };

      if (!response.ok) {
        const errorText = await response.text();
        result.status = 'error';
        result.error = errorText || `HTTP ${response.status}`;
      } else {
        const data = await response.json();
        result.data = data;
      }

      return result;
    } catch (err) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        id: requestId,
        status: 'error',
        duration,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        error: err.message,
        data: null
      };
    }
  };

  const startLoadTest = async () => {
    if (!file) {
      alert('Lütfen bir dosya seçin');
      return;
    }

    setIsRunning(true);
    clearResults();

    const startTime = Date.now();
    setStats({
      total: requestCount,
      completed: 0,
      success: 0,
      failed: 0,
      startTime,
      endTime: null
    });

    const promises = [];
    for (let i = 1; i <= requestCount; i++) {
      promises.push(sendSingleRequest(i));
    }

    // Request'leri paralel olarak çalıştır ve sonuçları topla
    const requests = promises.map(async (promise, index) => {
      try {
        const result = await promise;

        // Her request tamamlandığında state'i güncelle
        setResults(prev => [...prev, result]);
        setStats(prev => ({
          ...prev,
          completed: prev.completed + 1,
          success: result.status === 'success' ? prev.success + 1 : prev.success,
          failed: result.status === 'error' ? prev.failed + 1 : prev.failed,
        }));

        return result;
      } catch (err) {
        const errorResult = {
          id: index + 1,
          status: 'error',
          duration: 0,
          timestamp: new Date().toLocaleTimeString('tr-TR'),
          error: err.message,
          data: null
        };

        setResults(prev => [...prev, errorResult]);
        setStats(prev => ({
          ...prev,
          completed: prev.completed + 1,
          failed: prev.failed + 1
        }));

        return errorResult;
      }
    });

    // Tüm request'ler bitince final stats'i güncelle
    await Promise.all(requests);

    const endTime = Date.now();
    setStats(prev => ({
      ...prev,
      endTime
    }));

    setIsRunning(false);
  };

  const stopTest = () => {
    setIsRunning(false);
  };

  const getTotalDuration = () => {
    if (!stats.startTime || !stats.endTime) return 0;
    return stats.endTime - stats.startTime;
  };

  const getAverageDuration = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(total / results.length);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-black';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Image  src={icon} width={64} height={64} />
          Worker Pool Load Tester
        </h1>
        <p className="text-black">
          Aynı anda birden fazla request göndererek worker pool performansını test edin
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Test Configuration */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded-lg border">
            <h2 className="text-lg font-semibold mb-4 text-black">Test Ayarları</h2>

            {/* File Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Test Dosyası
              </label>
              <div
                style={{
                  border: `2px dashed ${dragActive ? '#3b82f6' : file ? '#10b981' : '#d1d5db'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: dragActive ? '#eff6ff' : file ? '#ecfdf5' : '#fff',
                  position: 'relative',
                  minHeight: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                  disabled={isRunning}
                />

                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText style={{ width: '20px', height: '20px', color: '#10b981' }} />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: '500', color: '#111827', margin: 0 }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {!isRunning && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <X style={{ width: '16px', height: '16px' }} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload style={{ width: '32px', height: '32px', color: '#9ca3af', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      📁 Dosya Seçin veya Sürükleyin
                    </p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                      PNG, JPG, PDF dosyaları desteklenir
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Request Count */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Eşzamanlı Request Sayısı
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={requestCount}
                  onChange={(e) => setRequestCount(parseInt(e.target.value))}
                  disabled={isRunning}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '18px', fontWeight: '600', color: '#2563eb', minWidth: '32px', textAlign: 'center' }}>
                  {requestCount}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', margin: 0 }}>
                Backend'de 3 worker var
              </p>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={startLoadTest}
                disabled={!file || isRunning}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  border: 'none',
                  cursor: !file || isRunning ? 'not-allowed' : 'pointer',
                  backgroundColor: !file || isRunning ? '#d1d5db' : '#2563eb',
                  color: !file || isRunning ? '#6b7280' : 'white',
                  fontSize: '16px'
                }}
              >
                <Play style={{ width: '16px', height: '16px' }} />
                <span>{isRunning ? 'Test Çalışıyor...' : 'Load Test Başlat'}</span>
              </button>

              {results.length > 0 && (
                <button
                  onClick={clearResults}
                  disabled={isRunning}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    opacity: isRunning ? 0.5 : 1
                  }}
                >
                  Sonuçları Temizle
                </button>
              )}
            </div>
          </div>

          {/* Live Stats */}
          {(isRunning || results.length > 0) && (
            <div className="mt-4 bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center text-black">
                <Activity className="w-4 h-4 mr-2" />
                İstatistikler
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-black">
                  <span >Toplam:</span>
                  <span className="font-medium ml-2">{stats.total}</span>
                </div>
                <div className="text-black">
                  <span >Tamamlanan:</span>
                  <span className="font-medium ml-2">{stats.completed}</span>
                </div>
                <div className="text-black">
                  <span >Başarılı:</span>
                  <span className="font-medium ml-2 text-green-600">{stats.success}</span>
                </div>
                <div className="text-black">
                  <span >Başarısız:</span>
                  <span className="font-medium ml-2 text-red-600">{stats.failed}</span>
                </div>
                <div className="col-span-2 text-black">
                  <span >Toplam Süre:</span>
                  <span className="font-medium ml-2 ">{getTotalDuration()} ms</span>
                </div>
                <div className="col-span-2 text-black" >
                  <span >Ortalama Süre:</span>
                  <span className="font-medium ml-2">{getAverageDuration()} ms</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-black mb-1">
                  <span>İlerleme</span>
                  <span>{stats.completed}/{stats.total}</span>
                </div>
                <div className="w-full bg-black rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <div className="bg-white border rounded-lg">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-black">Request Sonuçları</h2>
              <p className="text-sm text-black">
                Her request'in detaylı sonuçları (gerçek zamanlı)
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-8 text-center text-black">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-black" />
                  <p>Henüz sonuç yok. Load test başlatın!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {results
                    .sort((a, b) => a.id - b.id)
                    .map((result) => (
                      <div key={result.id} className="p-4 hover:bg-gray-300">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(result.status)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-black">Request #{result.id}</span>
                                <span className={`text-sm ${getStatusColor(result.status)}`}>
                                  {result.status}
                                </span>
                              </div>
                              <div className="text-xs text-black mt-1">
                                {result.timestamp} • {result.duration}ms
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            {result.status === 'success' ? (
                              <div className="text-xs text-black">
                                <div>Fatura: {result.data?.fatura_no || 'N/A'}</div>
                                <div>Toplam: ₺{result.data?.genel_toplam || 0}</div>
                              </div>
                            ) : (
                              <div className="text-xs text-red-600 max-w-xs ">
                                {result.error}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress bar for individual request */}
                        <div className="mt-2">
                          <div className="w-full bg-black rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${result.status === 'success'
                                ? 'bg-green-500'
                                : result.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-black'
                                }`}
                              style={{
                                width: result.status !== 'pending' ? '100%' : '0%',
                                transition: 'width 0.3s ease'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Worker Pool Test İpuçları</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Backend'de 3 worker var - 3'ten fazla request gönderirseniz queue'da bekleyecekler</li>
          <li>• Aynı anda gönderilen request'ler worker pool tarafından paralel işlenecek</li>
          <li>• Response sürelerini karşılaştırarak worker pool performansını görebilirsiniz</li>
          <li>• Network gecikmesi gerçek performansı etkileyebilir</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkerPoolTester;