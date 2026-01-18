const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory storage (replace with database in production)
let trainedModel = null;
let modelMetadata = null;
let transactionHistory = [];

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    modelTrained: !!trainedModel 
  });
});

// Submit transaction for fraud detection
app.post('/api/transaction/analyze', (req, res) => {
  try {
    const transaction = req.body;
    
    if (!trainedModel) {
      return res.status(400).json({ 
        error: 'Model not trained yet. Please train the model first.' 
      });
    }

    // Validate required fields
    const requiredFields = ['Amount', 'Time'];
    const missingFields = requiredFields.filter(field => !(field in transaction));
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Predict using trained model
    const prediction = predictTransaction(transaction, trainedModel);
    
    // Store transaction
    transactionHistory.push({
      ...transaction,
      prediction,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      transaction: transaction,
      prediction: {
        isFraud: prediction.isFraud,
        confidence: prediction.confidence,
        riskScore: prediction.riskScore,
        anomalyScore: prediction.anomalyScore
      }
    });

  } catch (error) {
    console.error('Transaction analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Train model on dataset
app.post('/api/model/train', async (req, res) => {
  try {
    const { dataset, config } = req.body;

    if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty dataset' });
    }

    console.log(`Training model on ${dataset.length} transactions...`);

    // Split data into training and testing
    const splitRatio = config?.testSplit || 0.2;
    const { trainData, testData } = splitDataset(dataset, splitRatio);

    // Train Isolation Forest model
    const model = trainIsolationForest(trainData, config);

    // Evaluate model on test data
    const evaluation = evaluateModel(model, testData);

    // Save model and metadata
    trainedModel = model;
    modelMetadata = {
      trainedAt: new Date().toISOString(),
      datasetSize: dataset.length,
      trainSize: trainData.length,
      testSize: testData.length,
      evaluation: evaluation,
      config: config || {}
    };

    res.json({
      success: true,
      message: 'Model trained successfully',
      metadata: modelMetadata
    });

  } catch (error) {
    console.error('Model training error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get model info
app.get('/api/model/info', (req, res) => {
  if (!trainedModel || !modelMetadata) {
    return res.status(404).json({ error: 'No model trained yet' });
  }

  res.json({
    trained: true,
    metadata: modelMetadata
  });
});

// Get transaction history
app.get('/api/transactions/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const recentTransactions = transactionHistory.slice(-limit);
  
  res.json({
    total: transactionHistory.length,
    transactions: recentTransactions
  });
});

// Helper Functions

function splitDataset(data, testRatio) {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const testSize = Math.floor(data.length * testRatio);
  
  return {
    trainData: shuffled.slice(testSize),
    testData: shuffled.slice(0, testSize)
  };
}

function trainIsolationForest(data, config = {}) {
  const numTrees = config.numTrees || 100;
  const subSampleSize = Math.min(config.subSampleSize || 256, data.length);
  
  const trees = [];
  
  for (let i = 0; i < numTrees; i++) {
    const sample = subsample(data, subSampleSize);
    trees.push(buildTree(sample));
  }
  
  return {
    trees,
    numTrees,
    subSampleSize,
    features: Object.keys(data[0]).filter(k => typeof data[0][k] === 'number' && k !== 'Class')
  };
}

function buildTree(data, depth = 0, maxDepth = Math.ceil(Math.log2(256))) {
  if (data.length <= 1 || depth >= maxDepth) {
    return { type: 'leaf', size: data.length };
  }

  const features = Object.keys(data[0]).filter(k => typeof data[0][k] === 'number' && k !== 'Class');
  const feature = features[Math.floor(Math.random() * features.length)];
  
  const values = data.map(d => d[feature]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  if (minVal === maxVal) {
    return { type: 'leaf', size: data.length };
  }
  
  const splitValue = minVal + Math.random() * (maxVal - minVal);
  
  const leftData = data.filter(d => d[feature] < splitValue);
  const rightData = data.filter(d => d[feature] >= splitValue);

  return {
    type: 'internal',
    feature,
    splitValue,
    left: buildTree(leftData, depth + 1, maxDepth),
    right: buildTree(rightData, depth + 1, maxDepth)
  };
}

function subsample(data, size) {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
}

function predictTransaction(transaction, model) {
  const avgPathLength = model.trees.reduce((sum, tree) => {
    return sum + pathLength(transaction, tree);
  }, 0) / model.trees.length;

  const cN = c(model.subSampleSize);
  const anomalyScore = Math.pow(2, -avgPathLength / cN);
  
  // Calculate risk score (0-100)
  const riskScore = Math.round(anomalyScore * 100);
  
  return {
    isFraud: anomalyScore > 0.6,
    confidence: anomalyScore,
    riskScore: riskScore,
    anomalyScore: anomalyScore
  };
}

function pathLength(point, tree, depth = 0) {
  if (tree.type === 'leaf') {
    return depth + c(tree.size);
  }

  if (point[tree.feature] < tree.splitValue) {
    return pathLength(point, tree.left, depth + 1);
  } else {
    return pathLength(point, tree.right, depth + 1);
  }
}

function c(n) {
  if (n <= 1) return 0;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

function evaluateModel(model, testData) {
  let truePositives = 0, falsePositives = 0;
  let trueNegatives = 0, falseNegatives = 0;
  
  testData.forEach(transaction => {
    const prediction = predictTransaction(transaction, model);
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
  
  return {
    accuracy: accuracy.toFixed(4),
    precision: precision.toFixed(4),
    recall: recall.toFixed(4),
    f1Score: f1Score.toFixed(4),
    confusionMatrix: {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives
    }
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`Fraud Detection API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
