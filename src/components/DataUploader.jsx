import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Database } from 'lucide-react';

const DataUploader = ({ onDataLoaded, onModelTrained }) => {
  const [uploading, setUploading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',');
      const row = {};
      headers.forEach((header, i) => {
        const value = values[i]?.trim();
        // Convert numeric values
        row[header] = isNaN(value) ? value : parseFloat(value);
      });
      return row;
    });

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
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6" />
          Real Data Upload
        </h2>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Upload Fraud Detection Dataset (CSV)
        </label>
        <div className="flex items-center gap-4">
          <label className="flex-1 flex flex-col items-center px-4 py-6 bg-white text-blue rounded-lg shadow-lg tracking-wide border border-blue-500 cursor-pointer hover:bg-blue-50">
            <Upload className="w-8 h-8 text-blue-500" />
            <span className="mt-2 text-base leading-normal">
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
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Dataset Info */}
      {datasetInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Dataset Loaded Successfully</p>
              <p className="text-sm text-green-600">{datasetInfo.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-500">Total Transactions</p>
              <p className="text-xl font-bold text-gray-900">{datasetInfo.totalTransactions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-500">Fraudulent</p>
              <p className="text-xl font-bold text-red-600">{datasetInfo.fraudulent.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-500">Legitimate</p>
              <p className="text-xl font-bold text-green-600">{datasetInfo.legitimate.toLocaleString()}</p>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <p className="text-xs text-gray-500">Fraud Rate</p>
              <p className="text-xl font-bold text-orange-600">{datasetInfo.fraudPercentage}%</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Available Columns ({datasetInfo.columns.length}):</p>
            <div className="flex flex-wrap gap-2">
              {datasetInfo.columns.map((col, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Train Model Button */}
          <button
            onClick={handleTrainModel}
            disabled={training}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {training ? 'Training Model...' : 'Train Model on This Dataset'}
          </button>
        </div>
      )}

      {/* Sample Dataset Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-900 mb-2">Need sample data?</p>
        <p className="text-sm text-blue-700 mb-2">
          Download the Credit Card Fraud Detection dataset from Kaggle:
        </p>
        <a
          href="https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
        </a>
      </div>
    </div>
  );
};

export default DataUploader;
