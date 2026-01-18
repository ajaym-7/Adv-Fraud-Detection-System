import React, { useState, useCallback, useMemo } from 'react';
import DataUploader from './components/DataUploader';
import MetricsDashboard from './components/MetricsDashboard';
import ModelStorage from './utils/modelStorage';
import { Sliders, Cpu, Target, Layers, TrendingUp, RefreshCw, Zap, TreeDeciduous } from 'lucide-react';

const FraudDetectionSystem = () => {
  const [realDataset, setRealDataset] = useState(null);
  const [datasetStats, setDatasetStats] = useState(null);
  const [trainedModel, setTrainedModel] = useState(null);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [confusionMatrix, setConfusionMatrix] = useState(null);
  const [training, setTraining] = useState(false);
  const [testData, setTestData] = useState(null);
  const [trainingProgress, setTrainingProgress] = useState({ stage: '', percent: 0 });
  
  // Model type selection
  const [modelType, setModelType] = useState('randomForest');
  
  // Common parameters
  const [threshold, setThreshold] = useState(0.5);
  const [numTrees, setNumTrees] = useState(100);
  
  // Random Forest specific
  const [maxDepth, setMaxDepth] = useState(15);
  const [classWeight, setClassWeight] = useState(100);
  const [minSamplesLeaf] = useState(5);
  
  // Isolation Forest specific  
  const [useFeatureWeighting, setUseFeatureWeighting] = useState(true);

  const modelStorage = useMemo(() => new ModelStorage(), []);

  const handleDataLoaded = (data, stats) => {
    setRealDataset(data);
    setDatasetStats(stats);
    setModelMetrics(null);
    setTrainedModel(null);
    setTrainingProgress({ stage: '', percent: 0 });
  };

  const getFeatureNames = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    return Object.keys(data[0]).filter(k => 
      typeof data[0][k] === 'number' && k !== 'Class'
    );
  };

  // ============== RANDOM FOREST CLASSIFIER ==============
  
  // Build a single decision tree for classification
  const buildDecisionTree = (data, depth = 0, featureNames) => {
    const labels = data.map(d => d.Class === 1 || d.Class === '1' ? 1 : 0);
    const fraudCount = labels.filter(l => l === 1).length;
    const legitCount = labels.length - fraudCount;
    
    // Stopping conditions
    if (depth >= maxDepth || data.length < minSamplesLeaf * 2 || fraudCount === 0 || legitCount === 0) {
      // Leaf node - return probability of fraud
      const fraudProb = fraudCount / data.length;
      return { type: 'leaf', probability: fraudProb, samples: data.length, frauds: fraudCount };
    }

    // Find best split using Gini impurity with class weighting
    let bestGini = Infinity;
    let bestFeature = null;
    let bestSplitValue = null;
    let bestLeft = null;
    let bestRight = null;

    // Sample features (sqrt of total features for randomness)
    const numFeaturesToTry = Math.ceil(Math.sqrt(featureNames.length));
    const shuffledFeatures = shuffleArray(featureNames);
    const featuresToTry = shuffledFeatures.slice(0, numFeaturesToTry);

    for (const feature of featuresToTry) {
      const values = data.map(d => d[feature]).filter(v => !isNaN(v));
      if (values.length === 0) continue;

      // Try multiple split points
      const sortedValues = [...new Set(values)].sort((a, b) => a - b);
      const numSplits = Math.min(10, sortedValues.length - 1);
      
      for (let i = 0; i < numSplits; i++) {
        const idx = Math.floor((i + 1) * sortedValues.length / (numSplits + 1));
        const splitValue = sortedValues[idx];

        const leftData = data.filter(d => d[feature] < splitValue);
        const rightData = data.filter(d => d[feature] >= splitValue);

        if (leftData.length < minSamplesLeaf || rightData.length < minSamplesLeaf) continue;

        // Calculate weighted Gini impurity
        const gini = calculateWeightedGini(leftData, rightData);

        if (gini < bestGini) {
          bestGini = gini;
          bestFeature = feature;
          bestSplitValue = splitValue;
          bestLeft = leftData;
          bestRight = rightData;
        }
      }
    }

    if (bestFeature === null) {
      const fraudProb = fraudCount / data.length;
      return { type: 'leaf', probability: fraudProb, samples: data.length, frauds: fraudCount };
    }

    return {
      type: 'internal',
      feature: bestFeature,
      splitValue: bestSplitValue,
      left: buildDecisionTree(bestLeft, depth + 1, featureNames),
      right: buildDecisionTree(bestRight, depth + 1, featureNames)
    };
  };

  // Weighted Gini impurity (weights fraud class higher)
  const calculateWeightedGini = (leftData, rightData) => {
    const calcGini = (data) => {
      const total = data.length;
      if (total === 0) return 0;
      
      const frauds = data.filter(d => d.Class === 1 || d.Class === '1').length;
      const legits = total - frauds;
      
      // Apply class weights
      const weightedFrauds = frauds * classWeight;
      const weightedLegits = legits * 1;
      const weightedTotal = weightedFrauds + weightedLegits;
      
      if (weightedTotal === 0) return 0;
      
      const pFraud = weightedFrauds / weightedTotal;
      const pLegit = weightedLegits / weightedTotal;
      
      return 1 - (pFraud * pFraud) - (pLegit * pLegit);
    };

    const totalSamples = leftData.length + rightData.length;
    const leftGini = calcGini(leftData) * (leftData.length / totalSamples);
    const rightGini = calcGini(rightData) * (rightData.length / totalSamples);
    
    return leftGini + rightGini;
  };

  // Train Random Forest
  const trainRandomForest = (data, setProgress) => {
    console.log(`Training Random Forest with ${numTrees} trees, maxDepth=${maxDepth}, classWeight=${classWeight}...`);
    
    const featureNames = getFeatureNames(data);
    const trees = [];
    
    // Oversample fraud cases for training
    const fraudCases = data.filter(d => d.Class === 1 || d.Class === '1');
    const legitCases = data.filter(d => d.Class === 0 || d.Class === '0');
    
    console.log(`Training data: ${fraudCases.length} frauds, ${legitCases.length} legitimate`);
    
    for (let i = 0; i < numTrees; i++) {
      // Bootstrap sample with oversampling of fraud
      const sampleSize = Math.min(5000, data.length);
      const fraudSampleSize = Math.min(fraudCases.length * 3, Math.floor(sampleSize * 0.3)); // Up to 30% fraud
      const legitSampleSize = sampleSize - fraudSampleSize;
      
      const bootstrapSample = shuffleArray([
        ...subsample(fraudCases, fraudSampleSize),
        ...subsample(legitCases, legitSampleSize)
      ]);
      
      trees.push(buildDecisionTree(bootstrapSample, 0, featureNames));
      
      if (i % 10 === 0) {
        const percent = Math.round(10 + (i / numTrees) * 50);
        setProgress({ stage: `Building Random Forest... ${i}/${numTrees} trees`, percent });
      }
    }

    console.log('Random Forest training complete!');
    
    return {
      type: 'randomForest',
      trees,
      numTrees,
      featureNames,
      maxDepth,
      classWeight
    };
  };

  // Predict with Random Forest
  const predictRandomForest = useCallback((transaction, model) => {
    // Inline predictWithTree to satisfy exhaustive-deps
    const predictWithTreeInline = (trans, tree) => {
      if (tree.type === 'leaf') {
        return tree.probability;
      }
      const value = trans[tree.feature];
      if (value === undefined || isNaN(value)) {
        return 0.5;
      }
      if (value < tree.splitValue) {
        return predictWithTreeInline(trans, tree.left);
      } else {
        return predictWithTreeInline(trans, tree.right);
      }
    };

    const probabilities = model.trees.map(tree => predictWithTreeInline(transaction, tree));
    const avgProb = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
    
    return {
      isFraud: avgProb > threshold,
      confidence: avgProb,
      riskScore: Math.round(avgProb * 100),
      anomalyScore: avgProb
    };
  }, [threshold]);

  // ============== ISOLATION FOREST ==============
  
  const featureWeights = {
    V1: 1.0, V2: 1.0, V3: 1.2, V4: 1.3, V5: 1.0,
    V6: 1.0, V7: 1.1, V8: 1.0, V9: 1.1, V10: 1.2,
    V11: 1.1, V12: 1.3, V13: 1.0, V14: 1.4, V15: 1.0,
    V16: 1.2, V17: 1.3, V18: 1.0, V19: 1.1, V20: 1.0,
    V21: 1.0, V22: 1.0, V23: 1.0, V24: 1.0, V25: 1.0,
    V26: 1.1, V27: 1.2, V28: 1.1, Amount: 1.2, Time: 0.8
  };

  const applyFeatureWeighting = (transaction) => {
    if (!useFeatureWeighting) return transaction;
    const weighted = { ...transaction };
    Object.keys(featureWeights).forEach(feature => {
      if (weighted[feature] !== undefined && typeof weighted[feature] === 'number') {
        weighted[feature] = weighted[feature] * featureWeights[feature];
      }
    });
    return weighted;
  };

  const buildIsolationTree = (data, depth = 0, maxDepth = 8) => {
    if (data.length <= 1 || depth >= maxDepth) {
      return { type: 'leaf', size: data.length };
    }

    const features = Object.keys(data[0]).filter(k => typeof data[0][k] === 'number' && k !== 'Class');
    const feature = features[Math.floor(Math.random() * features.length)];
    
    const values = data.map(d => d[feature]).filter(v => !isNaN(v));
    if (values.length === 0) return { type: 'leaf', size: data.length };
    
    const minVal = values.reduce((min, v) => v < min ? v : min, values[0]);
    const maxVal = values.reduce((max, v) => v > max ? v : max, values[0]);
    
    if (minVal === maxVal) return { type: 'leaf', size: data.length };
    
    const splitValue = minVal + Math.random() * (maxVal - minVal);
    
    const leftData = data.filter(d => d[feature] < splitValue);
    const rightData = data.filter(d => d[feature] >= splitValue);

    if (leftData.length === 0 || rightData.length === 0) {
      return { type: 'leaf', size: data.length };
    }

    return {
      type: 'internal',
      feature,
      splitValue,
      left: buildIsolationTree(leftData, depth + 1, maxDepth),
      right: buildIsolationTree(rightData, depth + 1, maxDepth)
    };
  };

  const trainIsolationForest = (data, setProgress) => {
    const subSampleSize = Math.min(256, data.length);
    const trees = [];

    for (let i = 0; i < numTrees; i++) {
      const sample = subsample(data, subSampleSize);
      const weightedSample = useFeatureWeighting ? sample.map(applyFeatureWeighting) : sample;
      trees.push(buildIsolationTree(weightedSample));
      
      if (i % 15 === 0) {
        const percent = Math.round(10 + (i / numTrees) * 50);
        setProgress({ stage: `Building Isolation Forest... ${i}/${numTrees}`, percent });
      }
    }

    return {
      type: 'isolationForest',
      trees,
      numTrees,
      subSampleSize,
      features: Object.keys(data[0]).filter(k => typeof data[0][k] === 'number' && k !== 'Class')
    };
  };

  const predictIsolationForest = useCallback((transaction, model) => {
    // Apply feature weighting inline
    const weightedTransaction = { ...transaction };
    if (useFeatureWeighting) {
      const importantFeatures = ['V14', 'V10', 'V12', 'V17', 'V4', 'V3', 'Amount'];
      importantFeatures.forEach(feature => {
        if (weightedTransaction[feature] !== undefined) {
          weightedTransaction[feature] *= 1.5;
        }
      });
    }

    // Path length calculation helpers
    const c = (n) => {
      if (n <= 1) return 0;
      return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    };

    // Helper to get the leaf count of a subtree
    const getNodeSize = (node) => {
      if (node.type === 'leaf') return node.size;
      return getNodeSize(node.left) + getNodeSize(node.right);
    };

    const pathLength = (point, tree, depth = 0) => {
      if (tree.type === 'leaf') return depth + c(tree.size);
      const value = point[tree.feature];
      if (value === undefined || isNaN(value)) {
        // For internal nodes, compute size from subtree
        const nodeSize = getNodeSize(tree);
        return depth + c(nodeSize);
      }
      return value < tree.splitValue 
        ? pathLength(point, tree.left, depth + 1)
        : pathLength(point, tree.right, depth + 1);
    };

    const avgPathLength = model.trees.reduce((sum, tree) => 
      sum + pathLength(weightedTransaction, tree), 0) / model.trees.length;
    const cN = c(model.subSampleSize);
    const anomalyScore = Math.pow(2, -avgPathLength / cN);
    
    return {
      isFraud: anomalyScore > threshold,
      confidence: anomalyScore,
      riskScore: Math.round(anomalyScore * 100),
      anomalyScore
    };
  }, [threshold, useFeatureWeighting]);

  // ============== COMMON FUNCTIONS ==============

  // Fisher-Yates shuffle for unbiased randomness
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const subsample = (data, size) => {
    const shuffled = shuffleArray(data);
    return shuffled.slice(0, Math.min(size, data.length));
  };

  const evaluateModel = (model, testDataSet, setProgress) => {
    console.log(`Evaluating ${model.type} on ${testDataSet.length} samples...`);
    setProgress({ stage: 'Evaluating model...', percent: 75 });

    let truePositives = 0, falsePositives = 0;
    let trueNegatives = 0, falseNegatives = 0;
    
    const predictFn = model.type === 'randomForest' ? predictRandomForest : predictIsolationForest;
    
    testDataSet.forEach((transaction, idx) => {
      const prediction = predictFn(transaction, model);
      const actualFraud = transaction.Class === 1 || transaction.Class === '1';
      
      if (prediction.isFraud && actualFraud) truePositives++;
      else if (prediction.isFraud && !actualFraud) falsePositives++;
      else if (!prediction.isFraud && !actualFraud) trueNegatives++;
      else if (!prediction.isFraud && actualFraud) falseNegatives++;

      if (idx < 5) {
        console.log(`Sample ${idx}: Score=${prediction.anomalyScore.toFixed(3)}, Pred=${prediction.isFraud}, Actual=${actualFraud}`);
      }
    });
    
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const accuracy = (truePositives + trueNegatives) / testDataSet.length || 0;

    console.log(`Results: TP=${truePositives}, FP=${falsePositives}, TN=${trueNegatives}, FN=${falseNegatives}`);
    setProgress({ stage: 'Complete!', percent: 100 });

    return {
      accuracy: accuracy.toFixed(4),
      precision: precision.toFixed(4),
      recall: recall.toFixed(4),
      f1Score: f1Score.toFixed(4),
      confusionMatrix: { truePositives, falsePositives, trueNegatives, falseNegatives }
    };
  };

  const handleModelTrained = async () => {
    if (!realDataset) {
      alert('Please upload a dataset first');
      return;
    }

    setTraining(true);
    setTrainingProgress({ stage: 'Preparing data...', percent: 5 });

    setTimeout(async () => {
      try {
        setTrainingProgress({ stage: 'Splitting train/test data...', percent: 8 });
        const shuffled = shuffleArray(realDataset);
        const testSize = Math.floor(realDataset.length * 0.2);
        const trainData = shuffled.slice(testSize);
        const currentTestData = shuffled.slice(0, testSize);
        setTestData(currentTestData);

        console.log('Train:', trainData.length, 'Test:', currentTestData.length);

        let model;
        if (modelType === 'randomForest') {
          setTrainingProgress({ stage: 'Training Random Forest (Supervised)...', percent: 10 });
          model = trainRandomForest(trainData, setTrainingProgress);
        } else {
          setTrainingProgress({ stage: 'Training Isolation Forest (Unsupervised)...', percent: 10 });
          model = trainIsolationForest(trainData, setTrainingProgress);
        }
        
        setTrainedModel(model);
        setTrainingProgress({ stage: 'Running evaluation...', percent: 70 });

        const metrics = evaluateModel(model, currentTestData, setTrainingProgress);
        setModelMetrics(metrics);
        setConfusionMatrix(metrics.confusionMatrix);

        console.log('Training complete!', metrics);

        await modelStorage.init();
        await modelStorage.saveModel(model, { datasetSize: realDataset.length, metrics });

      } catch (error) {
        console.error('Training error:', error);
        alert('Training failed: ' + error.message);
      } finally {
        setTraining(false);
      }
    }, 100);
  };

  const handleReEvaluate = useCallback(() => {
    if (!trainedModel || !testData) {
      alert('Please train a model first');
      return;
    }

    setTraining(true);
    setTrainingProgress({ stage: 'Re-evaluating...', percent: 50 });

    setTimeout(() => {
      try {
        // Inline evaluation for re-evaluate
        let truePositives = 0, falsePositives = 0;
        let trueNegatives = 0, falseNegatives = 0;
        
        const predictFn = trainedModel.type === 'randomForest' ? predictRandomForest : predictIsolationForest;
        
        testData.forEach((transaction) => {
          const prediction = predictFn(transaction, trainedModel);
          const actualFraud = transaction.Class === 1 || transaction.Class === '1';
          
          if (prediction.isFraud && actualFraud) truePositives++;
          else if (prediction.isFraud && !actualFraud) falsePositives++;
          else if (!prediction.isFraud && !actualFraud) trueNegatives++;
          else if (!prediction.isFraud && actualFraud) falseNegatives++;
        });
        
        const precision = truePositives / (truePositives + falsePositives) || 0;
        const recall = truePositives / (truePositives + falseNegatives) || 0;
        const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
        const accuracy = (truePositives + trueNegatives) / testData.length || 0;

        const metrics = {
          accuracy: accuracy.toFixed(4),
          precision: precision.toFixed(4),
          recall: recall.toFixed(4),
          f1Score: f1Score.toFixed(4),
          confusionMatrix: { truePositives, falsePositives, trueNegatives, falseNegatives }
        };

        setModelMetrics(metrics);
        setConfusionMatrix(metrics.confusionMatrix);
        setTrainingProgress({ stage: 'Complete!', percent: 100 });
      } catch (error) {
        console.error('Re-evaluation error:', error);
      } finally {
        setTraining(false);
      }
    }, 100);
  }, [trainedModel, testData, predictRandomForest, predictIsolationForest]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Fraud Detection</h1>
              <p className="text-xs text-gray-500">ML-Powered Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {trainedModel && (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-full">
                Model Ready
              </span>
            )}
            {datasetStats && (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                {datasetStats.totalTransactions.toLocaleString()} records
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <DataUploader onDataLoaded={handleDataLoaded} onModelTrained={handleModelTrained} />

        {/* Training Progress */}
        {training && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="animate-pulse w-2.5 h-2.5 bg-emerald-500 rounded-full" />
              Training in Progress
            </h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{trainingProgress.stage}</span>
                <span className="font-mono text-emerald-600">{trainingProgress.percent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${trainingProgress.percent}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full mr-2" />
              <span className="text-gray-500 text-sm">Processing dataset...</span>
            </div>
          </div>
        )}

        {/* Model Selection & Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            Configuration
          </h2>

          {/* Model Type Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Model Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => { setModelType('randomForest'); setThreshold(0.5); }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  modelType === 'randomForest' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TreeDeciduous className={`w-5 h-5 ${modelType === 'randomForest' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${modelType === 'randomForest' ? 'text-emerald-700' : 'text-gray-700'}`}>Random Forest</span>
                  <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Recommended</span>
                </div>
                <p className="text-xs text-gray-500">
                  Supervised learning - uses fraud labels for training. Better accuracy for labeled datasets.
                </p>
              </button>
              
              <button
                onClick={() => { setModelType('isolationForest'); setThreshold(0.6); }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  modelType === 'isolationForest' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-5 h-5 ${modelType === 'isolationForest' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${modelType === 'isolationForest' ? 'text-emerald-700' : 'text-gray-700'}`}>Isolation Forest</span>
                </div>
                <p className="text-xs text-gray-500">
                  Unsupervised anomaly detection - finds outliers without labels. Good for new fraud patterns.
                </p>
              </button>
            </div>
          </div>

          {/* Common Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Target className="w-4 h-4 text-emerald-500" />
                Threshold: <span className="text-emerald-600 font-mono">{threshold.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>More Recall</span>
                <span>More Precision</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Layers className="w-4 h-4 text-emerald-500" />
                Trees: <span className="text-emerald-600 font-mono">{numTrees}</span>
              </label>
              <input
                type="range"
                min="50"
                max="200"
                step="10"
                value={numTrees}
                onChange={(e) => setNumTrees(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Random Forest specific */}
            {modelType === 'randomForest' && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Class Weight: <span className="text-emerald-600 font-mono">{classWeight}x</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={classWeight}
                    onChange={(e) => setClassWeight(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-emerald-500"
                  />
                  <p className="text-xs text-gray-400">Higher = prioritize catching fraud</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    Max Depth: <span className="text-emerald-600 font-mono">{maxDepth}</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    step="1"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-emerald-500"
                  />
                </div>
              </>
            )}

            {/* Isolation Forest specific */}
            {modelType === 'isolationForest' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useFeatureWeighting}
                  onChange={(e) => setUseFeatureWeighting(e.target.checked)}
                  className="w-4 h-4 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">Feature Weighting</span>
              </div>
            )}
          </div>

          {trainedModel && !training && (
            <button
              onClick={handleReEvaluate}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Re-evaluate
            </button>
          )}
        </div>

        {/* Metrics */}
        {modelMetrics && !training && (
          <MetricsDashboard metrics={modelMetrics} confusionMatrix={confusionMatrix} />
        )}

        {/* Algorithm Info */}
        {datasetStats && !training && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              {modelType === 'randomForest' ? 'Random Forest' : 'Isolation Forest'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelType === 'randomForest' ? (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-emerald-600 font-medium text-sm">How it works</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Uses labeled data to learn fraud patterns. Best accuracy when labels are available.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-emerald-600 font-medium text-sm">Class Weighting</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Fraud cases weighted {classWeight}x more than legitimate transactions.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-emerald-600 font-medium text-sm">How it works</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Finds anomalies by isolation. Good for detecting new fraud patterns.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="text-amber-600 font-medium text-sm">Limitation</h4>
                    <p className="text-gray-600 text-sm mt-1">
                      Detects all anomalies, not just fraud. May flag unusual but legitimate transactions.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FraudDetectionSystem;
