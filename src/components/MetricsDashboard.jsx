import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';

const MetricsDashboard = ({ metrics, confusionMatrix }) => {
  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-gray-500 text-center">No metrics available. Train a model first.</p>
      </div>
    );
  }

  const { accuracy, precision, recall, f1Score } = metrics;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-base font-semibold mb-6 text-gray-900 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-emerald-500" />
        Performance Metrics
      </h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Accuracy"
          value={`${(parseFloat(accuracy) * 100).toFixed(1)}%`}
          icon={<Target className="w-4 h-4" />}
          color="emerald"
        />
        <MetricCard
          title="Precision"
          value={`${(parseFloat(precision) * 100).toFixed(1)}%`}
          icon={<CheckCircle className="w-4 h-4" />}
          color="emerald"
        />
        <MetricCard
          title="Recall"
          value={`${(parseFloat(recall) * 100).toFixed(1)}%`}
          icon={<AlertCircle className="w-4 h-4" />}
          color="emerald"
        />
        <MetricCard
          title="F1 Score"
          value={`${(parseFloat(f1Score) * 100).toFixed(1)}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="emerald"
        />
      </div>

      {/* Confusion Matrix */}
      {confusionMatrix && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-4 text-gray-700">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-3 max-w-xl">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-emerald-700 font-medium text-xs mb-1">True Negatives</div>
              <div className="text-2xl font-bold text-emerald-600">
                {confusionMatrix.trueNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-600/70 mt-0.5">Correctly identified legitimate</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-700 font-medium text-xs mb-1">False Positives</div>
              <div className="text-2xl font-bold text-red-600">
                {confusionMatrix.falsePositives.toLocaleString()}
              </div>
              <div className="text-xs text-red-600/70 mt-0.5">Incorrectly flagged as fraud</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-amber-700 font-medium text-xs mb-1">False Negatives</div>
              <div className="text-2xl font-bold text-amber-600">
                {confusionMatrix.falseNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-amber-600/70 mt-0.5">Missed fraud cases</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-blue-700 font-medium text-xs mb-1">True Positives</div>
              <div className="text-2xl font-bold text-blue-600">
                {confusionMatrix.truePositives.toLocaleString()}
              </div>
              <div className="text-xs text-blue-600/70 mt-0.5">Correctly detected fraud</div>
            </div>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-gray-700 text-sm">Interpretation</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><span className="text-emerald-600 font-medium">Accuracy:</span> {interpretAccuracy(parseFloat(accuracy))}</li>
          <li><span className="text-emerald-600 font-medium">Precision:</span> {interpretPrecision(parseFloat(precision))}</li>
          <li><span className="text-emerald-600 font-medium">Recall:</span> {interpretRecall(parseFloat(recall))}</li>
        </ul>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color }) => {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{title}</span>
        <span className="text-emerald-500">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
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
