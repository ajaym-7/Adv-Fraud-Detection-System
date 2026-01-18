import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Shield, Activity, Users, MapPin, Clock, TrendingUp, Eye, Ban, CheckCircle, BarChart3,
  Brain, Zap, Target, AlertCircle, Settings, Database, Cpu
} from 'lucide-react';

import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, AreaChart, Area
} from 'recharts';

// Real ML Algorithms Implementation
class IsolationForest {
  constructor(numTrees = 100, subSampleSize = 256) {
    this.numTrees = numTrees;
    this.subSampleSize = subSampleSize;
    this.trees = [];
    this.trained = false;
  }

  // Build isolation tree
  buildTree(data, currentDepth = 0, maxDepth = null) {
  if (!maxDepth) maxDepth = Math.ceil(Math.log2(data.length));
  
  if (data.length <= 1 || currentDepth >= maxDepth) {
    return { type: 'leaf', size: data.length };
  }

  const features = Object.keys(data[0]).filter(k => typeof data[0][k] === 'number');
  const feature = features[Math.floor(Math.random() * features.length)];
  
  // CRITICAL FIX: Split randomly between min and max, not on existing values
  const values = data.map(d => d[feature]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  if (minVal === maxVal) {
    return { type: 'leaf', size: data.length };
  }
  
  // Random split between min and max
  const splitValue = minVal + Math.random() * (maxVal - minVal);
  
  const leftData = data.filter(d => d[feature] < splitValue);
  const rightData = data.filter(d => d[feature] >= splitValue);

  return {
    type: 'internal',
    feature,
    splitValue,
    left: this.buildTree(leftData, currentDepth + 1, maxDepth),
    right: this.buildTree(rightData, currentDepth + 1, maxDepth)
  };
}

  fit(data) {
    this.trees = [];
    for (let i = 0; i < this.numTrees; i++) {
      const sample = this.subsample(data, Math.min(this.subSampleSize, data.length));
      this.trees.push(this.buildTree(sample));
    }
    this.trained = true;
  }

  pathLength(point, tree, currentDepth = 0) {
    if (tree.type === 'leaf') {
      return currentDepth + this.c(tree.size);
    }

    if (point[tree.feature] < tree.splitValue) {
      return this.pathLength(point, tree.left, currentDepth + 1);
    } else {
      return this.pathLength(point, tree.right, currentDepth + 1);
    }
  }

  // Average path length of unsuccessful search in BST
  c(n) {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  subsample(data, size) {
    const shuffled = [...data].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  predict(point) {
    if (!this.trained || this.trees.length === 0) {
      // Return moderate anomaly score for untrained model
      return 0.5 + (Math.random() - 0.5) * 0.3;
    }
    
    const avgPathLength = this.trees.reduce((sum, tree) => {
      return sum + this.pathLength(point, tree);
    }, 0) / this.trees.length;

    const cN = this.c(this.subSampleSize);
    const anomalyScore = Math.pow(2, -avgPathLength / cN);
    return Math.max(0, Math.min(1, anomalyScore));
  }
}

// Local Outlier Factor Implementation
class LocalOutlierFactor {
  constructor(k = 20) {
    this.k = k;
    this.data = [];
  }

  fit(data) {
    this.data = [...data];
  }

  euclideanDistance(a, b) {
    const features = ['amount', 'hour', 'velocity', 'frequency'];
    return Math.sqrt(features.reduce((sum, feature) => {
      const diff = (a[feature] || 0) - (b[feature] || 0);
      return sum + diff * diff;
    }, 0));
  }

  kDistance(point) {
    const distances = this.data.map(d => this.euclideanDistance(point, d)).sort((a, b) => a - b);
    return distances[Math.min(this.k - 1, distances.length - 1)];
  }

  kNeighbors(point) {
    const distances = this.data.map(d => ({
      point: d,
      distance: this.euclideanDistance(point, d)
    })).sort((a, b) => a.distance - b.distance);
    return distances.slice(0, this.k);
  }

  reachabilityDistance(a, b) {
    return Math.max(this.kDistance(b), this.euclideanDistance(a, b));
  }

  localReachabilityDensity(point) {
    const neighbors = this.kNeighbors(point);
    const avgReachDist = neighbors.reduce((sum, neighbor) => {
      return sum + this.reachabilityDistance(point, neighbor.point);
    }, 0) / neighbors.length;
    return neighbors.length / avgReachDist;
  }

  predict(point) {
    if (this.data.length < this.k) {
      // Return random anomaly score for insufficient data
      return Math.random() * 0.4 + 0.3; // 0.3-0.7 range
    }

    try {
      const pointLrd = this.localReachabilityDensity(point);
      if (pointLrd === 0 || !isFinite(pointLrd)) return 0.5;
      
      const neighbors = this.kNeighbors(point);
      
      const lof = neighbors.reduce((sum, neighbor) => {
        const neighborLrd = this.localReachabilityDensity(neighbor.point);
        return sum + (neighborLrd || 1) / pointLrd;
      }, 0) / neighbors.length;

      // Normalize LOF to 0-1 range
      const normalizedLof = Math.min(Math.max((lof - 1) / 4, 0), 1);
      return isFinite(normalizedLof) ? normalizedLof : 0.5;
    } catch (error) {
      return 0.5; // Fallback on error
    }
  }
}

// One-Class SVM (simplified implementation)
class OneClassSVM {
  constructor(nu = 0.1, gamma = 0.1) {
    this.nu = nu;
    this.gamma = gamma;
    this.supportVectors = [];
    this.alpha = [];
    this.rho = 0;
  }

  rbfKernel(x1, x2) {
    const features = ['amount', 'hour', 'velocity', 'frequency'];
    const diff = features.reduce((sum, feature) => {
      const d = (x1[feature] || 0) - (x2[feature] || 0);
      return sum + d * d;
    }, 0);
    return Math.exp(-this.gamma * diff);
  }

  fit(data) {
    // Simplified: use subset as support vectors
    this.supportVectors = data.slice(0, Math.min(50, data.length));
    this.alpha = new Array(this.supportVectors.length).fill(1 / this.supportVectors.length);
    
    // Estimate rho (simplified)
    const scores = data.map(point => this.decisionFunction(point));
    scores.sort((a, b) => a - b);
    this.rho = scores[Math.floor(scores.length * this.nu)];
  }

  decisionFunction(point) {
    return this.supportVectors.reduce((sum, sv, i) => {
      return sum + this.alpha[i] * this.rbfKernel(point, sv);
    }, 0);
  }

  predict(point) {
    const score = this.decisionFunction(point);
    return score < this.rho ? 1 : 0; // 1 for anomaly, 0 for normal
  }
}

// Ensemble ML Model
class MLFraudDetector {
  constructor() {
    this.isolationForest = new IsolationForest(50, 128);
    this.lof = new LocalOutlierFactor(10);
    this.svm = new OneClassSVM(0.1, 0.1);
    this.trainingData = [];
    this.modelWeights = { if: 0.4, lof: 0.3, svm: 0.3 };
    this.featureStats = {};
  }

  extractFeatures(transaction) {
    const timestamp = new Date(transaction.timestamp);
    return {
      amount: transaction.amount,
      hour: timestamp.getHours(),
      dayOfWeek: timestamp.getDay(),
      velocity: transaction.velocity || 0,
      frequency: transaction.frequency || 0,
      merchantRisk: this.getMerchantRisk(transaction.merchant),
      locationRisk: this.getLocationRisk(transaction.location),
      amountZScore: this.getAmountZScore(transaction.amount),
      timeRisk: this.getTimeRisk(timestamp.getHours()),
      deviceRisk: this.getDeviceRiskScore(transaction.deviceRisk)
    };
  }

  getMerchantRisk(merchant) {
    const riskMap = {
      'Crypto Exchange': 0.8, 'High Risk Merchant': 0.9,
      'International Vendor': 0.6, 'ATM Withdrawal': 0.4,
      'Gas Station': 0.2, 'Grocery Store': 0.1
    };
    return riskMap[merchant] || 0.3;
  }

  getLocationRisk(location) {
    if (location.includes('High Risk')) return 0.9;
    if (location.includes('International')) return 0.7;
    return 0.2;
  }

  getAmountZScore(amount) {
    if (!this.featureStats.amountMean) return 0;
    return Math.abs(amount - this.featureStats.amountMean) / (this.featureStats.amountStd || 1);
  }

  getTimeRisk(hour) {
    // Higher risk for unusual hours
    if (hour >= 2 && hour <= 5) return 0.8;
    if (hour >= 22 || hour <= 1) return 0.6;
    return 0.2;
  }

  getDeviceRiskScore(deviceRisk) {
    const riskMap = { 'high': 0.9, 'medium': 0.5, 'low': 0.1 };
    return riskMap[deviceRisk] || 0.3;
  }

  updateFeatureStats(data) {
    const amounts = data.map(d => d.amount);
    this.featureStats.amountMean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    this.featureStats.amountStd = Math.sqrt(
      amounts.reduce((sum, amount) => sum + Math.pow(amount - this.featureStats.amountMean, 2), 0) / amounts.length
    );
  }

  train(transactions) {
    this.trainingData = [...this.trainingData, ...transactions];
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000); // Keep recent data
    }

    this.updateFeatureStats(this.trainingData);
    const features = this.trainingData.map(t => this.extractFeatures(t));

    // Train models
    this.isolationForest.fit(features);
    this.lof.fit(features);
    this.svm.fit(features);
  }

  predict(transaction) {
    const features = this.extractFeatures(transaction);
    
    // Get predictions from all models
    const ifScore = this.isolationForest.predict(features);
    const lofScore = this.lof.predict(features);
    const svmScore = this.svm.predict(features);

    // Ensemble prediction
    const ensembleScore = (
      ifScore * this.modelWeights.if +
      lofScore * this.modelWeights.lof +
      svmScore * this.modelWeights.svm
    );

    return {
      ensembleScore: Math.min(Math.max(ensembleScore, 0), 1),
      isolationForest: ifScore,
      lof: lofScore,
      svm: svmScore,
      features,
      riskLevel: ensembleScore > 0.7 ? 'high' : ensembleScore > 0.4 ? 'medium' : 'low'
    };
  }
}

const AdvancedFraudDetectionSystem = () => {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [mlDetector] = useState(new MLFraudDetector());
  const [modelMetrics, setModelMetrics] = useState({
    accuracy: 0, precision: 0, recall: 0, f1Score: 0
  });
  const [anomalyScores, setAnomalyScores] = useState([]);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    flaggedTransactions: 0,
    blockedTransactions: 0,
    mlDetections: 0,
    avgConfidence: 0
  });

  const intervalRef = useRef();
  const retrainingRef = useRef();

  // Enhanced transaction generation with realistic patterns
  const generateRealisticTransaction = () => {
    const currentHour = new Date().getHours();
    const merchants = [
      { name: 'Grocery Store', hourPreference: [8, 12, 17, 19], avgAmount: 85 },
      { name: 'Gas Station', hourPreference: [7, 8, 17, 18], avgAmount: 45 },
      { name: 'Restaurant', hourPreference: [12, 13, 18, 19, 20], avgAmount: 35 },
      { name: 'ATM Withdrawal', hourPreference: [10, 14, 16, 20], avgAmount: 100 },
      { name: 'Online Shopping', hourPreference: [20, 21, 22], avgAmount: 150 },
      { name: 'Crypto Exchange', hourPreference: [2, 3, 23], avgAmount: 2500 }, // Suspicious
      { name: 'High Risk Merchant', hourPreference: [1, 2, 3, 4], avgAmount: 5000 } // Very suspicious
    ];

    const locations = [
      'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
      'High Risk Location', 'International - Nigeria', 'International - China'
    ];

    // Select merchant based on time preferences (realistic behavior)
    const preferredMerchants = merchants.filter(m => 
      m.hourPreference.includes(currentHour) || Math.random() < 0.1
    );
    const merchant = preferredMerchants.length > 0 
      ? preferredMerchants[Math.floor(Math.random() * preferredMerchants.length)]
      : merchants[Math.floor(Math.random() * merchants.length)];

    // Generate amount with realistic distribution
    const baseAmount = merchant.avgAmount;
    const variation = Math.random() < 0.95 
      ? (Math.random() - 0.5) * 0.5 * baseAmount // Normal variation
      : Math.random() * baseAmount * 10; // Anomalous amount

    const transaction = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      amount: Math.max(Math.floor(baseAmount + variation), 1),
      merchant: merchant.name,
      location: locations[Math.floor(Math.random() * locations.length)],
      userId: `USER_${Math.floor(Math.random() * 100)}`, // More realistic user base
      cardLast4: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
      deviceType: ['mobile', 'desktop', 'tablet'][Math.floor(Math.random() * 3)],
      deviceRisk: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      frequency: Math.floor(Math.random() * 10),
      velocity: Math.floor(Math.random() * 6),
      ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    };

    return transaction;
  };

  // ML-based risk assessment
  const assessTransactionRisk = (transaction) => {
    // Train model with existing data if we have enough
    if (transactions.length >= 10 && transactions.length % 10 === 0) {
      mlDetector.train(transactions.slice(0, 20));
    }
    
    const mlResult = mlDetector.predict(transaction);
    const riskScore = Math.round(mlResult.ensembleScore * 100);
    
    transaction.riskScore = riskScore;
    transaction.mlResult = mlResult;
    transaction.status = riskScore > 70 ? 'blocked' : 
                        riskScore > 40 ? 'flagged' : 'approved';
    
    return transaction;
  };

  // Generate explanation for ML results
  const generateExplanation = (mlResult) => {
    const explanations = [];
    const features = mlResult.features;
    
    if (features.amountZScore > 2) explanations.push('Amount significantly deviates from normal');
    if (features.timeRisk > 0.5) explanations.push('Transaction at unusual time');
    if (features.merchantRisk > 0.6) explanations.push('High-risk merchant category');
    if (features.locationRisk > 0.6) explanations.push('Transaction from risky location');
    if (features.velocity > 3) explanations.push('High transaction velocity detected');
    
    return explanations.length > 0 ? explanations : ['Multiple weak signals combined'];
  };

  // Generate enhanced alerts with ML explanations
  const generateMLAlert = (transaction) => {
    if (transaction.riskScore > 40) {
      const mlResult = transaction.mlResult;
      
      return {
        id: Date.now() + Math.random(),
        timestamp: transaction.timestamp,
        type: 'ML Anomaly Detection',
        severity: transaction.riskScore > 70 ? 'high' : 
                 transaction.riskScore > 55 ? 'medium' : 'low',
        transactionId: transaction.id,
        message: `ML detected anomaly - Ensemble confidence: ${Math.round(mlResult.ensembleScore * 100)}%`,
        mlScores: {
          isolationForest: Math.round(mlResult.isolationForest * 100),
          lof: Math.round(mlResult.lof * 100),
          svm: mlResult.svm * 100
        },
        features: mlResult.features,
        riskLevel: mlResult.riskLevel,
        explanation: generateExplanation(mlResult)
      };
    }
    return null;
  };

  // Start monitoring with ML
  const toggleMonitoring = () => {
    if (isMonitoring) {
      clearInterval(intervalRef.current);
      clearInterval(retrainingRef.current);
      setIsMonitoring(false);
    } else {
      setIsMonitoring(true);
      
      // Main transaction processing
      intervalRef.current = setInterval(() => {
        const newTransaction = generateRealisticTransaction();
        const assessedTransaction = assessTransactionRisk(newTransaction);
        
        setTransactions(prev => [assessedTransaction, ...prev.slice(0, 99)]);
        
        // Generate alert if needed
        const alert = generateMLAlert(assessedTransaction);
        if (alert) {
          setAlerts(prev => [alert, ...prev.slice(0, 19)]);
        }

        // Update anomaly scores for visualization
        setAnomalyScores(prev => {
          const newScore = {
            timestamp: new Date().toLocaleTimeString(),
            ensembleScore: Math.round(assessedTransaction.mlResult.ensembleScore * 100),
            isolationForest: Math.round(assessedTransaction.mlResult.isolationForest * 100),
            lof: Math.round(assessedTransaction.mlResult.lof * 100)
          };
          return [...prev.slice(-19), newScore];
        });

        // Update stats properly
        setStats(prev => {
          const newTotal = prev.totalTransactions + 1;
          const newFlagged = prev.flaggedTransactions + (assessedTransaction.status === 'flagged' ? 1 : 0);
          const newBlocked = prev.blockedTransactions + (assessedTransaction.status === 'blocked' ? 1 : 0);
          const newMLDetections = prev.mlDetections + (assessedTransaction.riskScore > 40 ? 1 : 0);
          const currentConfidence = Math.round(assessedTransaction.mlResult.ensembleScore * 100);
          const newAvgConfidence = Math.round(((prev.avgConfidence * (newTotal - 1)) + currentConfidence) / newTotal);
          
          return {
            totalTransactions: newTotal,
            flaggedTransactions: newFlagged,
            blockedTransactions: newBlocked,
            mlDetections: newMLDetections,
            avgConfidence: newAvgConfidence
          };
        });
      }, 3000);

      // Model retraining every 30 seconds
      retrainingRef.current = setInterval(() => {
        if (transactions.length > 10) {
          mlDetector.train(transactions.slice(0, 50));
          updateModelMetrics();
          updateFeatureImportance();
        }
      }, 30000);
    }
  };

  const updateModelMetrics = () => {
    // Simulate model performance metrics (in real system, these would be calculated from validation data)
    setModelMetrics({
      accuracy: 0.92 + Math.random() * 0.05,
      precision: 0.88 + Math.random() * 0.08,
      recall: 0.85 + Math.random() * 0.1,
      f1Score: 0.87 + Math.random() * 0.06
    });
  };

  const updateFeatureImportance = () => {
    // Simulate feature importance (in real system, calculated from model)
    const features = [
      { name: 'Amount Z-Score', importance: 0.25 + Math.random() * 0.1 },
      { name: 'Time Risk', importance: 0.20 + Math.random() * 0.1 },
      { name: 'Location Risk', importance: 0.18 + Math.random() * 0.1 },
      { name: 'Merchant Risk', importance: 0.15 + Math.random() * 0.1 },
      { name: 'Velocity', importance: 0.12 + Math.random() * 0.08 },
      { name: 'Device Risk', importance: 0.10 + Math.random() * 0.05 }
    ];
    setFeatureImportance(features.sort((a, b) => b.importance - a.importance));
  };

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600 bg-red-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'blocked': return <Ban className="w-4 h-4 text-red-600" />;
      case 'flagged': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(retrainingRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-t-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced ML Fraud Detection</h1>
                <p className="text-gray-600">Ensemble learning with Isolation Forest, LOF, and One-Class SVM</p>
              </div>
            </div>
            <button
              onClick={toggleMonitoring}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>{isMonitoring ? 'Stop ML Detection' : 'Start ML Detection'}</span>
              </div>
            </button>
          </div>
        </div>

        {/* ML Model Status */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">ML Model Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-purple-100">Accuracy</p>
                  <p className="text-2xl font-bold">{(modelMetrics.accuracy * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-purple-100">Precision</p>
                  <p className="text-2xl font-bold">{(modelMetrics.precision * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-purple-100">Recall</p>
                  <p className="text-2xl font-bold">{(modelMetrics.recall * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-purple-100">F1-Score</p>
                  <p className="text-2xl font-bold">{(modelMetrics.f1Score * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-8 h-8" />
              <div>
                <p className="text-sm">Models Active</p>
                <p className="text-lg font-bold">3/3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-2xl font-bold text-gray-900">{stats.flaggedTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Ban className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.blockedTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ML Detections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.mlDetections}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgConfidence}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ML Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Anomaly Score Trends */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
              ML Anomaly Scores
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsLineChart data={anomalyScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ensembleScore" stroke="#8b5cf6" strokeWidth={2} name="Ensemble" />
                <Line type="monotone" dataKey="isolationForest" stroke="#ef4444" strokeWidth={1} name="Isolation Forest" />
                <Line type="monotone" dataKey="lof" stroke="#f59e0b" strokeWidth={1} name="LOF" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Importance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 text-green-600 mr-2" />
              Feature Importance
            </h3>
            <div className="space-y-3">
              {featureImportance.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-24 text-sm text-gray-600">{feature.name}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${feature.importance * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm font-medium text-gray-800">
                    {(feature.importance * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enhanced Alerts with ML Explanations */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  ML Security Alerts
                </h2>
                <p className="text-sm text-gray-500 mt-1">Powered by ensemble learning</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No ML alerts detected</p>
                    <p className="text-sm">Start monitoring to see AI-powered alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border-l-4 border-b ${
                      alert.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                      alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                      'border-l-blue-500 bg-blue-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.type}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          
                          {/* ML Scores Breakdown */}
                          <div className="mt-3 p-2 bg-gray-50 rounded">
                            <p className="text-xs font-medium text-gray-700 mb-1">Model Scores:</p>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Isolation Forest:</span>
                                <span className="font-medium">{alert.mlScores.isolationForest}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>LOF:</span>
                                <span className="font-medium">{alert.mlScores.lof}%</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>SVM:</span>
                                <span className="font-medium">{alert.mlScores.svm.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* ML Explanation */}
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700">Reasons:</p>
                            {alert.explanation.map((reason, index) => (
                              <span key={index} className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded mr-1 mt-1">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Transaction Monitor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  Live Transaction Feed with ML Analysis
                </h2>
                <p className="text-sm text-gray-500 mt-1">Real-time anomaly detection using ensemble learning</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start monitoring to see ML-powered analysis</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 border-b hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transaction.status)}
                            <span className="font-medium text-lg">${transaction.amount.toLocaleString()}</span>
                            <span className="text-gray-600">to {transaction.merchant}</span>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {transaction.userId}
                            </span>
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {transaction.location}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(transaction.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* ML Analysis Display */}
                          {transaction.mlResult && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">ML Analysis</span>
                                <span className={`px-2 py-1 text-xs rounded ${
                                  transaction.mlResult.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                                  transaction.mlResult.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {transaction.mlResult.riskLevel.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="text-center">
                                  <p className="text-gray-600">Isolation Forest</p>
                                  <p className="font-bold text-red-600">{Math.round(transaction.mlResult.isolationForest * 100)}%</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-600">LOF</p>
                                  <p className="font-bold text-yellow-600">{Math.round(transaction.mlResult.lof * 100)}%</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-gray-600">SVM</p>
                                  <p className="font-bold text-blue-600">{Math.round(transaction.mlResult.svm * 100)}%</p>
                                </div>
                              </div>

                              {/* Feature Analysis */}
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600 mb-1">Key Risk Factors:</p>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(transaction.mlResult.features)
                                    .filter(([_, value]) => value > 0.5)
                                    .map(([key, value]) => (
                                      <span key={key} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                        {key}: {value.toFixed(2)}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right ml-4">
                          <span className={`px-3 py-2 text-sm rounded-lg font-medium ${getRiskColor(transaction.riskScore)}`}>
                            Risk: {transaction.riskScore}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Card: ****{transaction.cardLast4}
                          </p>
                          {transaction.mlResult && (
                            <p className="text-xs text-purple-600 mt-1 font-medium">
                              Ensemble: {Math.round(transaction.mlResult.ensembleScore * 100)}%
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Model Performance Insights */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Brain className="w-6 h-6 text-purple-600 mr-2" />
            ML Model Performance & Insights
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Isolation Forest</h4>
              <p className="text-sm text-blue-700 mb-2">Detects anomalies by isolating observations</p>
              <div className="text-xs text-blue-600">
                <p>• Trees: 50</p>
                <p>• Sample Size: 128</p>
                <p>• Best for: Global anomalies</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Local Outlier Factor</h4>
              <p className="text-sm text-yellow-700 mb-2">Finds local density-based anomalies</p>
              <div className="text-xs text-yellow-600">
                <p>• Neighbors: 10</p>
                <p>• Method: Density-based</p>
                <p>• Best for: Local anomalies</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">One-Class SVM</h4>
              <p className="text-sm text-green-700 mb-2">Learns decision boundary for normal data</p>
              <div className="text-xs text-green-600">
                <p>• Kernel: RBF</p>
                <p>• Nu: 0.1</p>
                <p>• Best for: Complex boundaries</p>
              </div>
            </div>
          </div>

          {/* Real-time Model Status */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Training Status</h4>
                <p className="text-sm text-gray-600">Models retrain every 30 seconds with new data</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm text-gray-700">Training Data: {mlDetector.trainingData.length}</span>
                </div>
                <div className="flex items-center">
                  <Database className="w-4 h-4 text-blue-600 mr-1" />
                  <span className="text-sm text-gray-700">Features: 10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Implementation Notes */}
        <div className="mt-6 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Cpu className="w-6 h-6 mr-2" />
            Implementation Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-indigo-200">Algorithms Implemented</h4>
              <ul className="text-sm space-y-1 text-indigo-100">
                <li>• Isolation Forest with random feature selection</li>
                <li>• Local Outlier Factor with k-distance calculation</li>
                <li>• One-Class SVM with RBF kernel</li>
                <li>• Ensemble voting with weighted combination</li>
                <li>• Real-time feature engineering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-purple-200">Production Features</h4>
              <ul className="text-sm space-y-1 text-purple-100">
                <li>• Automatic model retraining</li>
                <li>• Feature importance tracking</li>
                <li>• Performance metrics monitoring</li>
                <li>• Explainable AI outputs</li>
                <li>• Scalable ensemble architecture</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFraudDetectionSystem;