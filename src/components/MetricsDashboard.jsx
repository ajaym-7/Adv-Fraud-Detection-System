import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Target, Percent } from 'lucide-react';

const MetricsDashboard = ({ metrics, confusionMatrix }) => {
  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500 text-center">No model metrics available. Train a model first.</p>
      </div>
    );
  }

  const { accuracy, precision, recall, f1Score } = metrics;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        Model Performance Metrics
      </h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Accuracy"
          value={`${(parseFloat(accuracy) * 100).toFixed(2)}%`}
          icon={<Target className="w-5 h-5" />}
          color="blue"
          description="Overall correctness"
        />
        <MetricCard
          title="Precision"
          value={`${(parseFloat(precision) * 100).toFixed(2)}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          description="Fraud predictions accuracy"
        />
        <MetricCard
          title="Recall"
          value={`${(parseFloat(recall) * 100).toFixed(2)}%`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="orange"
          description="Fraud detection rate"
        />
        <MetricCard
          title="F1 Score"
          value={`${(parseFloat(f1Score) * 100).toFixed(2)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          description="Balanced performance"
        />
      </div>

      {/* Confusion Matrix */}
      {confusionMatrix && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="text-green-700 font-medium text-sm mb-1">True Negatives</div>
              <div className="text-3xl font-bold text-green-600">
                {confusionMatrix.trueNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-green-600 mt-1">Correctly identified as legitimate</div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <div className="text-red-700 font-medium text-sm mb-1">False Positives</div>
              <div className="text-3xl font-bold text-red-600">
                {confusionMatrix.falsePositives.toLocaleString()}
              </div>
              <div className="text-xs text-red-600 mt-1">Incorrectly flagged as fraud</div>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <div className="text-orange-700 font-medium text-sm mb-1">False Negatives</div>
              <div className="text-3xl font-bold text-orange-600">
                {confusionMatrix.falseNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-orange-600 mt-1">Missed fraud cases</div>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <div className="text-blue-700 font-medium text-sm mb-1">True Positives</div>
              <div className="text-3xl font-bold text-blue-600">
                {confusionMatrix.truePositives.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600 mt-1">Correctly detected fraud</div>
            </div>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Metrics Interpretation:</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li><strong>Accuracy:</strong> {interpretAccuracy(parseFloat(accuracy))}</li>
          <li><strong>Precision:</strong> {interpretPrecision(parseFloat(precision))}</li>
          <li><strong>Recall:</strong> {interpretRecall(parseFloat(recall))}</li>
          <li><strong>F1 Score:</strong> Harmonic mean of precision and recall - higher is better</li>
        </ul>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, description }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600'
  };

  return (
    <div className={`${colorClasses[color]} border-2 rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-70">{description}</div>
    </div>
  );
};

// Helper functions for interpretation
function interpretAccuracy(acc) {
  if (acc >= 0.95) return 'Excellent - Model is highly accurate';
  if (acc >= 0.90) return 'Very Good - Model performs well';
  if (acc >= 0.85) return 'Good - Model is reliable';
  if (acc >= 0.75) return 'Fair - Model needs improvement';
  return 'Poor - Model requires retraining';
}

function interpretPrecision(prec) {
  if (prec >= 0.90) return 'Excellent - Very few false alarms';
  if (prec >= 0.80) return 'Good - Acceptable false alarm rate';
  if (prec >= 0.70) return 'Fair - Moderate false alarms';
  return 'Poor - Too many false alarms';
}

function interpretRecall(rec) {
  if (rec >= 0.90) return 'Excellent - Catches most fraud';
  if (rec >= 0.80) return 'Good - Catches many fraud cases';
  if (rec >= 0.70) return 'Fair - Misses some fraud';
  return 'Poor - Misses too much fraud';
}

export default MetricsDashboard;
