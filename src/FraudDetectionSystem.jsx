import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle, Shield, Activity, Users, MapPin, Clock, TrendingUp, Eye, Ban, CheckCircle, BarChart3
} from 'lucide-react';

import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';



const FraudDetectionSystem = () => {
  //this line is updated 07/06/2025
  const [riskScoreHistory, setRiskScoreHistory] = useState([]);

  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    flaggedTransactions: 0,
    blockedTransactions: 0,
    riskScore: 0
  });
  const [mlModel] = useState({
  userProfiles: new Map(),
  merchantProfiles: new Map(),
  timePatterns: new Map(),
  anomalyThreshold: 0.7
});

  const [mlInsights, setMlInsights] = useState([]);
  const intervalRef = useRef();

  // ML-based behavioral analysis
  const updateUserProfile = (transaction) => {
    const userId = transaction.userId;
    const profile = mlModel.userProfiles.get(userId) || {
      totalTransactions: 0,
      avgAmount: 0,
      preferredMerchants: new Map(),
      timePatterns: new Array(24).fill(0),
      locationPatterns: new Map(),
      riskHistory: []
    };

    // Update transaction count and average amount
    profile.totalTransactions += 1;
    profile.avgAmount = ((profile.avgAmount * (profile.totalTransactions - 1)) + transaction.amount) / profile.totalTransactions;

    // Update merchant preferences
    const merchantCount = profile.preferredMerchants.get(transaction.merchant) || 0;
    profile.preferredMerchants.set(transaction.merchant, merchantCount + 1);

    // Update time patterns
    const hour = new Date(transaction.timestamp).getHours();
    profile.timePatterns[hour] += 1;

    // Update location patterns
    const locationCount = profile.locationPatterns.get(transaction.location) || 0;
    profile.locationPatterns.set(transaction.location, locationCount + 1);

    // Update risk history
    profile.riskHistory.push(transaction.riskScore);
    if (profile.riskHistory.length > 10) profile.riskHistory.shift();

    mlModel.userProfiles.set(userId, profile);
  };

  // ML anomaly detection
  const detectBehavioralAnomalies = (transaction) => {
    const userId = transaction.userId;
    const profile = mlModel.userProfiles.get(userId);
    
    if (!profile || profile.totalTransactions < 3) return [];

    const anomalies = [];

    // Amount anomaly
    const amountDeviation = Math.abs(transaction.amount - profile.avgAmount) / profile.avgAmount;
    if (amountDeviation > 2) {
      anomalies.push({
        type: 'amount_anomaly',
        severity: amountDeviation > 5 ? 'high' : 'medium',
        description: `Amount ${amountDeviation > 5 ? 'significantly' : 'moderately'} deviates from user's average`,
        confidence: Math.min(amountDeviation * 0.2, 1)
      });
    }

    // Merchant anomaly
    const merchantFreq = profile.preferredMerchants.get(transaction.merchant) || 0;
    const merchantFamiliarity = merchantFreq / profile.totalTransactions;
    if (merchantFamiliarity < 0.1 && transaction.amount > profile.avgAmount * 1.5) {
      anomalies.push({
        type: 'merchant_anomaly',
        severity: 'medium',
        description: 'High-value transaction at unfamiliar merchant',
        confidence: 0.8
      });
    }

    // Time pattern anomaly
    const hour = new Date(transaction.timestamp).getHours();
    const timeFreq = profile.timePatterns[hour] / profile.totalTransactions;
    if (timeFreq < 0.05 && transaction.amount > profile.avgAmount) {
      anomalies.push({
        type: 'time_anomaly',
        severity: 'low',
        description: 'Transaction at unusual time for this user',
        confidence: 0.6
      });
    }

    // Location anomaly
    const locationFreq = (profile.locationPatterns.get(transaction.location) || 0) / profile.totalTransactions;
    if (locationFreq === 0) {
      anomalies.push({
        type: 'location_anomaly',
        severity: transaction.location.includes('International') ? 'high' : 'medium',
        description: 'Transaction from completely new location',
        confidence: 0.9
      });
    }

    return anomalies;
  };

  // Enhanced risk scoring with ML
  const calculateRiskScore = (transaction) => {
    let risk = 0;
    
    // Traditional risk factors
    if (transaction.amount > 10000) risk += 30;
    else if (transaction.amount > 5000) risk += 20;
    else if (transaction.amount > 1000) risk += 10;
    
    const hour = new Date(transaction.timestamp).getHours();
    if (hour < 6 || hour > 22) risk += 15;
    
    if (transaction.location.includes('High Risk')) risk += 25;
    if (transaction.location.includes('International')) risk += 20;
    
    if (transaction.frequency > 5) risk += 20;
    
    if (transaction.deviceRisk === 'high') risk += 30;
    else if (transaction.deviceRisk === 'medium') risk += 15;
    
    if (transaction.velocity > 3) risk += 25;

    // ML-based risk adjustment
    const anomalies = detectBehavioralAnomalies(transaction);
    anomalies.forEach(anomaly => {
      const anomalyRisk = anomaly.confidence * (anomaly.severity === 'high' ? 25 : anomaly.severity === 'medium' ? 15 : 10);
      risk += anomalyRisk;
    });

    // Store anomalies for later use
    transaction.mlAnomalies = anomalies;
    
    return Math.min(risk, 100);
  };

  // Generate realistic transaction data
  const generateTransaction = () => {
    const merchants = [
      'Amazon', 'Walmart', 'Target', 'Starbucks', 'McDonald\'s', 
      'Gas Station', 'ATM Withdrawal', 'Online Transfer', 'Crypto Exchange',
      'High Risk Merchant', 'International Vendor'
    ];
    
    const locations = [
      'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
      'High Risk Location', 'International - Nigeria', 'International - Russia'
    ];
    
    const deviceTypes = ['mobile', 'desktop', 'tablet'];
    const deviceRisks = ['low', 'medium', 'high'];
    
    const transaction = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      amount: Math.floor(Math.random() * 15000) + 10,
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      userId: `USER_${Math.floor(Math.random() * 1000)}`,
      cardLast4: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
      deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
      deviceRisk: deviceRisks[Math.floor(Math.random() * deviceRisks.length)],
      frequency: Math.floor(Math.random() * 10),
      velocity: Math.floor(Math.random() * 6),
      ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    };
    
    transaction.riskScore = calculateRiskScore(transaction);
    transaction.status = transaction.riskScore > 70 ? 'blocked' : 
                       transaction.riskScore > 40 ? 'flagged' : 'approved';
    
    return transaction;
  };

  // Generate alert based on transaction with ML insights
  const generateAlert = (transaction) => {
    if (transaction.riskScore > 40) {
      const alertTypes = {
        high: 'Critical Risk Detected',
        medium: 'Suspicious Activity',
        low: 'Anomaly Detected'
      };
      
      const severity = transaction.riskScore > 70 ? 'high' : 
                      transaction.riskScore > 55 ? 'medium' : 'low';
      
      const riskFactors = [
        transaction.amount > 5000 && 'High Amount',
        transaction.location.includes('High Risk') && 'High Risk Location',
        transaction.deviceRisk === 'high' && 'Suspicious Device',
        transaction.velocity > 3 && 'High Velocity',
        new Date(transaction.timestamp).getHours() < 6 && 'Off Hours'
      ].filter(Boolean);

      // Add ML-detected anomalies to risk factors
      if (transaction.mlAnomalies) {
        transaction.mlAnomalies.forEach(anomaly => {
          riskFactors.push(`ML: ${anomaly.description}`);
        });
      }
      
      return {
        id: Date.now() + Math.random(),
        timestamp: transaction.timestamp,
        type: alertTypes[severity],
        severity,
        transactionId: transaction.id,
        message: `${alertTypes[severity]} - ${transaction.amount} transaction to ${transaction.merchant}`,
        riskFactors,
        mlAnomalies: transaction.mlAnomalies || []
      };
    }
    return null;
  };

  // Start/stop monitoring
  const toggleMonitoring = () => {
    if (isMonitoring) {
      clearInterval(intervalRef.current);
      setIsMonitoring(false);
    } else {
      setIsMonitoring(true);
      intervalRef.current = setInterval(() => {
        const newTransaction = generateTransaction();
        
        // Update ML model with new transaction
        updateUserProfile(newTransaction);
        
        setTransactions(prev => [newTransaction, ...prev.slice(0, 49)]);
        
        const alert = generateAlert(newTransaction);
        if (alert) {
          setAlerts(prev => [alert, ...prev.slice(0, 19)]);
        }
        //this is update 07/06/2025
        //here
        setRiskScoreHistory(prev => [
          ...prev.slice(-19), // keep only the last 20 data points
          {
            timestamp: new Date().toLocaleTimeString(), // x-axis label
            riskScore: newTransaction.riskScore         // y-axis value
          }
        ]);
        // till here
        
        // Generate ML insights periodically
        if (Math.random() < 0.3) {
          const insights = generateMLInsights();
          setMlInsights(prev => [insights, ...prev.slice(0, 4)]);
        }
        
        setStats(prev => ({
          totalTransactions: prev.totalTransactions + 1,
          flaggedTransactions: prev.flaggedTransactions + (newTransaction.status === 'flagged' ? 1 : 0),
          blockedTransactions: prev.blockedTransactions + (newTransaction.status === 'blocked' ? 1 : 0),
          riskScore: Math.round((prev.riskScore + newTransaction.riskScore) / 2)
        }));
      }, 2000);
    }
  };

  // Generate ML insights
  const generateMLInsights = () => {
    const insights = [
      "Behavioral model detected unusual spending pattern for USER_245",
      "New merchant cluster identified with 85% fraud correlation",
      "Time-based anomaly: 300% increase in night transactions",
      "Location analysis reveals new high-risk geographic pattern",
      "Device fingerprinting model updated with 12 new threat signatures",
      "Velocity pattern suggests coordinated attack on payment system",
      "ML confidence increased to 94% after processing 1000+ transactions"
    ];

    return {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      insight: insights[Math.floor(Math.random() * insights.length)],
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
      type: ['behavioral', 'pattern', 'anomaly', 'prediction'][Math.floor(Math.random() * 4)]
    };
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fraud Detection System</h1>
                <p className="text-gray-600">Real-time transaction monitoring and risk assessment</p>
              </div>
            </div>
            <button
              onClick={toggleMonitoring}
              className={`px-6 py-2 rounded-lg font-medium ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Flagged</p>
                <p className="text-2xl font-bold text-gray-900">{stats.flaggedTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Ban className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-gray-900">{stats.blockedTransactions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Risk Score</p>
                <p className={`text-2xl font-bold ${getRiskColor(stats.riskScore).split(' ')[0]}`}>
                  {stats.riskScore}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">User Profiles</p>
                <p className="text-2xl font-bold text-gray-900">{mlModel.userProfiles.size}</p>
                <p className="text-xs text-gray-500 mt-1">ML Learning</p>
              </div>
            </div>
          </div>
        </div>

        {/* ML Insights Panel */}
        {mlInsights.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">AI</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Machine Learning Insights</h3>
                <p className="text-sm text-gray-600">Real-time behavioral analysis and pattern detection</p>
              </div>
            </div>
            <div className="space-y-3">
              {mlInsights.map((insight) => (
                <div key={insight.id} className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-800">{insight.insight}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        insight.type === 'behavioral' ? 'bg-blue-100 text-blue-800' :
                        insight.type === 'pattern' ? 'bg-green-100 text-green-800' :
                        insight.type === 'anomaly' ? 'bg-red-100 text-red-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {insight.type.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {insight.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(insight.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* this section is updated on 07/06/25 */}

       {/* 📊 Enhanced Analytics Dashboard */}
<div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl shadow-md p-6 sm:p-8 mb-8 transition-all hover:shadow-xl">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-2xl font-semibold text-gray-800 tracking-tight flex items-center">
      <BarChart3 className="w-6 h-6 text-blue-600 mr-2" />
      Risk Score Trends
    </h2>
    <span className="inline-block text-xs text-blue-800 bg-blue-100 px-3 py-1 rounded-full">
      Live updating every 2s
    </span>
  </div>

  <ResponsiveContainer width="100%" height={300}>
    <RechartsLineChart data={riskScoreHistory}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
      <Tooltip 
        contentStyle={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
        labelStyle={{ color: '#6b7280', fontWeight: 'bold' }}
      />
      <Legend />
      <Line
        type="monotone"
        dataKey="riskScore"
        stroke="#6366f1"
        strokeWidth={3}
        dot={{ r: 4 }}
        activeDot={{ r: 6 }}
      />
    </RechartsLineChart>
  </ResponsiveContainer>
</div>

        {/*till here */}


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Real-time Alerts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  Security Alerts
                </h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No alerts detected</p>
                    <p className="text-sm">Start monitoring to see alerts</p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border-l-4 border-b ${getSeverityColor(alert.severity)}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.type}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alert.riskFactors.map((factor, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-200 text-xs rounded">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
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

          {/* Transaction Monitor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 text-blue-600 mr-2" />
                  Live Transaction Feed
                </h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start monitoring to see live transactions</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 border-b hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transaction.status)}
                            <span className="font-medium">${transaction.amount.toLocaleString()}</span>
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
                          {transaction.mlAnomalies && transaction.mlAnomalies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {transaction.mlAnomalies.map((anomaly, index) => (
                                <span key={index} className={`px-2 py-1 text-xs rounded ${
                                  anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                                  anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  ML: {anomaly.type.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-sm rounded ${getRiskColor(transaction.riskScore)}`}>
                            Risk: {transaction.riskScore}%
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Card: ****{transaction.cardLast4}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FraudDetectionSystem;