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
        const value = values[i]?.trim().replace(/['"]/g, '');
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
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          Data Upload
        </h2>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-300">
          Upload Fraud Detection Dataset (CSV)
        </label>
        <div className="flex items-center gap-4">
          <label className="flex-1 flex flex-col items-center px-4 py-6 bg-white/5 rounded-xl border-2 border-dashed border-white/30 cursor-pointer hover:bg-white/10 hover:border-blue-500/50 transition-all">
            <Upload className="w-8 h-8 text-blue-400" />
            <span className="mt-2 text-base text-gray-300">
              {uploading ? 'Uploading...' : 'Select CSV File'}
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
        <p className="mt-2 text-sm text-gray-500">
          Expected format: CSV with columns including "Amount" and "Class" (0=legitimate, 1=fraud)
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Error</p>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Dataset Info */}
      {datasetInfo && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-300">Dataset Loaded Successfully</p>
              <p className="text-sm text-green-400">{datasetInfo.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-800/50 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400">Total Transactions</p>
              <p className="text-xl font-bold text-white">{datasetInfo.totalTransactions.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400">Fraudulent</p>
              <p className="text-xl font-bold text-red-400">{datasetInfo.fraudulent.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400">Legitimate</p>
              <p className="text-xl font-bold text-green-400">{datasetInfo.legitimate.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400">Fraud Rate</p>
              <p className="text-xl font-bold text-orange-400">{datasetInfo.fraudPercentage}%</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">Available Columns ({datasetInfo.columns.length}):</p>
            <div className="flex flex-wrap gap-2">
              {datasetInfo.columns.map((col, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Train Model Button */}
          <button
            onClick={handleTrainModel}
            disabled={training}
            className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <FileText className="w-4 h-4" />
            {training ? 'Training Model...' : 'Train Model on This Dataset'}
          </button>
        </div>
      )}

      {/* Sample Dataset Info */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm font-medium text-blue-300 mb-2">Need sample data?</p>
        <p className="text-sm text-gray-400 mb-2">
          Download the Credit Card Fraud Detection dataset from Kaggle:
        </p>
        <a
          href="https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
        </a>
      </div>
    </div>
  );
};

export default DataUploader;
