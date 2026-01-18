# Advanced Fraud Detection System

A production-ready fraud detection system built with React that uses real machine learning algorithms to detect fraudulent transactions. The system supports both supervised (Random Forest) and unsupervised (Isolation Forest) learning approaches.

![React](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![ML](https://img.shields.io/badge/ML-Real_Algorithms-purple?style=for-the-badge)

## Live Demo

[View Live Demo](https://ajaym-7.github.io/Adv-Fraud-Detection-System/)

## Features

### Machine Learning Models

**Random Forest Classifier (Supervised)**
- Uses labeled fraud data for training
- Class weighting to handle imbalanced datasets
- Configurable tree depth and number of trees
- Achieves 73%+ precision and 74%+ recall on credit card fraud data

**Isolation Forest (Unsupervised)**
- Anomaly detection without requiring labels
- Feature weighting for improved accuracy
- Good for detecting new fraud patterns

### Core Capabilities

- CSV dataset upload (supports Kaggle Credit Card Fraud dataset)
- Real-time training progress visualization
- Configurable model parameters via UI
- Confusion matrix and performance metrics display
- Model persistence using IndexedDB
- Train/test split (80/20) for proper evaluation

### Performance Metrics

The system displays comprehensive evaluation metrics:
- Accuracy
- Precision
- Recall
- F1 Score
- Confusion Matrix (TP, FP, TN, FN)

## Installation

### Prerequisites

- Node.js v16 or higher
- npm or yarn

### Setup

1. Clone the repository

```bash
git clone https://github.com/ajaym-7/Adv-Fraud-Detection-System.git
cd Adv-Fraud-Detection-System
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm start
```

4. Open http://localhost:3000

## Usage

### Quick Start

1. Download the Credit Card Fraud Detection dataset from Kaggle:
   https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud

2. Upload the creditcard.csv file using the "Select CSV File" button

3. Configure model parameters:
   - Select model type (Random Forest recommended)
   - Adjust detection threshold
   - Set number of trees
   - Configure class weight (for Random Forest)

4. Click "Train Model on This Dataset"

5. Review performance metrics and confusion matrix

### Model Configuration

**Random Forest Settings**
- Detection Threshold: 0.5 (default) - Lower for more recall, higher for more precision
- Number of Trees: 100 (default) - More trees = better accuracy but slower training
- Fraud Class Weight: 100x (default) - Higher values prioritize catching fraud
- Max Tree Depth: 15 (default) - Deeper trees capture more complex patterns

**Isolation Forest Settings**
- Detection Threshold: 0.6 (default)
- Number of Trees: 100 (default)
- Feature Weighting: Enabled (default) - Weights important features higher

## Dataset Format

The system expects CSV files with:
- Numeric feature columns (V1-V28, Amount, Time)
- A "Class" column (0 = legitimate, 1 = fraud)
- Header row with column names

Compatible with the Kaggle Credit Card Fraud Detection dataset.

## Technical Stack

- React 19.1.0
- Tailwind CSS
- Recharts (visualization)
- Lucide React (icons)
- IndexedDB (model storage)

## Algorithm Details

### Random Forest Implementation

- Bootstrap sampling with fraud oversampling
- Gini impurity with class weighting
- Random feature subset selection (sqrt of total features)
- Configurable stopping criteria (min samples, max depth)

### Isolation Forest Implementation

- Random feature selection for splits
- Path length calculation for anomaly scoring
- Configurable contamination rate
- Optional feature weighting

## Performance Results

Tested on Kaggle Credit Card Fraud dataset (284,807 transactions, 492 frauds):

| Model | Precision | Recall | F1 Score |
|-------|-----------|--------|----------|
| Random Forest | 73.08% | 74.03% | 73.55% |
| Isolation Forest | 16.40% | 36.94% | 22.71% |

## Project Structure

```
src/
  App.js                    # Main application entry
  FraudDetectionSystem.jsx  # Core ML component
  components/
    DataUploader.jsx        # CSV upload and parsing
    MetricsDashboard.jsx    # Performance metrics display
  utils/
    modelStorage.js         # IndexedDB model persistence
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

Ajay More

## Acknowledgments

- Kaggle Credit Card Fraud Detection dataset
- Machine Learning Group - ULB (dataset creators)
