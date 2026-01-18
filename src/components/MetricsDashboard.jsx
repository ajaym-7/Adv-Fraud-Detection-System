import React from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Target } from 'lucide-react';

const MetricsDashboard = ({ metrics, confusionMatrix }) => {
  if (!metrics) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <p className="text-gray-400 text-center">No model metrics available. Train a model first.</p>
      </div>
    );
  }

  const { accuracy, precision, recall, f1Score } = metrics;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
      <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
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
          <h3 className="text-lg font-semibold mb-4 text-white">Confusion Matrix</h3>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
              <div className="text-green-300 font-medium text-sm mb-1">True Negatives</div>
              <div className="text-3xl font-bold text-green-400">
                {confusionMatrix.trueNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-green-400/70 mt-1">Correctly identified as legitimate</div>
            </div>
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <div className="text-red-300 font-medium text-sm mb-1">False Positives</div>
              <div className="text-3xl font-bold text-red-400">
                {confusionMatrix.falsePositives.toLocaleString()}
              </div>
              <div className="text-xs text-red-400/70 mt-1">Incorrectly flagged as fraud</div>
            </div>
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
              <div className="text-orange-300 font-medium text-sm mb-1">False Negatives</div>
              <div className="text-3xl font-bold text-orange-400">
                {confusionMatrix.falseNegatives.toLocaleString()}
              </div>
              <div className="text-xs text-orange-400/70 mt-1">Missed fraud cases</div>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
              <div className="text-blue-300 font-medium text-sm mb-1">True Positives</div>
              <div className="text-3xl font-bold text-blue-400">
                {confusionMatrix.truePositives.toLocaleString()}
              </div>
              <div className="text-xs text-blue-400/70 mt-1">Correctly detected fraud</div>
            </div>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-gray-700/30 border border-white/10 rounded-xl p-4">
        <h4 className="font-semibold mb-2 text-white">Metrics Interpretation:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li><strong className="text-blue-400">Accuracy:</strong> {interpretAccuracy(parseFloat(accuracy))}</li>
          <li><strong className="text-green-400">Precision:</strong> {interpretPrecision(parseFloat(precision))}</li>
          <li><strong className="text-orange-400">Recall:</strong> {interpretRecall(parseFloat(recall))}</li>
          <li><strong className="text-purple-400">F1 Score:</strong> Harmonic mean of precision and recall - higher is better</li>
        </ul>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, description }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-xl p-4`}>
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
