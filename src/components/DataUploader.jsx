import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';

const DataUploader = ({ onDataLoaded, onModelTrained }) => {
  const [uploading, setUploading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    console.log('CSV Headers:', headers);
    
    const data = lines.slice(1).filter(line => line.trim()).map((line, index) => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, i) => {
        const raw = values[i] ?? '';
        const value = raw.trim().replace(/['"]/g, '');
        // Convert numeric values
        row[header] = isNaN(value) || value === '' ? value : parseFloat(value);
      });
      return row;
    });

    console.log(`Parsed ${data.length} rows with columns:`, headers);
    console.log('Sample row:', data[0]);

    return { headers, data };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const { headers, data } = parseCSV(text);

      // Validate required fields for fraud detection
      const requiredFields = ['Amount', 'Class']; // Class = 0 (legit) or 1 (fraud)
      const hasRequiredFields = requiredFields.every(field => 
        headers.some(h => h.toLowerCase() === field.toLowerCase())
      );

      if (!hasRequiredFields) {
        throw new Error('Dataset must contain at least "Amount" and "Class" columns');
      }

      // Guard against empty data array
      if (data.length === 0) {
        throw new Error('No valid data rows found in the CSV file');
      }

      // Calculate dataset statistics
      const fraudCount = data.filter(row => row.Class === 1 || row.Class === '1').length;
      const legitCount = data.length - fraudCount;

      const stats = {
        totalTransactions: data.length,
        fraudulent: fraudCount,
        legitimate: legitCount,
        fraudPercentage: ((fraudCount / data.length) * 100).toFixed(2),
        columns: headers,
        filename: file.name
      };

      setDatasetInfo(stats);
      onDataLoaded(data, stats);

    } catch (err) {
      setError(err.message || 'Failed to parse CSV file');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleTrainModel = async () => {
    if (!datasetInfo) return;

    setTraining(true);
    setError(null);

    try {
      // Trigger model training in parent component
      await onModelTrained();
    } catch (err) {
      setError('Failed to train model: ' + err.message);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-500" />
          Upload Dataset
        </h2>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Fraud Detection Dataset (CSV)
        </label>
        <div className="flex items-center gap-4">
          <label className="flex-1 flex flex-col items-center px-4 py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 hover:border-emerald-300 transition-all">
            <Upload className="w-8 h-8 text-emerald-500" />
            <span className="mt-2 text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to select CSV file'}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Required columns: "Amount" and "Class" (0=legitimate, 1=fraud)
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Dataset Info */}
      {datasetInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700">Dataset Loaded</p>
              <p className="text-sm text-emerald-600">{datasetInfo.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">{datasetInfo.totalTransactions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">Fraudulent</p>
              <p className="text-lg font-semibold text-red-600">{datasetInfo.fraudulent.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">Legitimate</p>
              <p className="text-lg font-semibold text-emerald-600">{datasetInfo.legitimate.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500">Fraud Rate</p>
              <p className="text-lg font-semibold text-amber-600">{datasetInfo.fraudPercentage}%</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Columns ({datasetInfo.columns.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {datasetInfo.columns.map((col, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Train Model Button */}
          <button
            onClick={handleTrainModel}
            disabled={training}
            className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FileText className="w-4 h-4" />
            {training ? 'Training...' : 'Train Model'}
          </button>
        </div>
      )}

      {/* Sample Dataset Info */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl">
        <p className="text-sm font-medium text-gray-700 mb-1">Need sample data?</p>
        <p className="text-sm text-gray-500 mb-2">
          Download the Credit Card Fraud Detection dataset:
        </p>
        <a
          href="https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-600 hover:text-emerald-700 underline"
        >
          kaggle.com/datasets/mlg-ulb/creditcardfraud
        </a>
      </div>
    </div>
  );
};

export default DataUploader;
