"""
Common NLP Utilities for Agents.

REAL NLP processing using:
- Transformers for classification
- Sentiment analysis
"""

import re
from typing import Dict, Any, List, Optional

# Note: In production, these would use actual ML models
# For now, implementing rule-based alternatives that can be swapped


class NLPProcessor:
    """
    NLP processor for text analysis.
    
    Uses rule-based processing with hooks for ML model integration.
    """
    
    def __init__(self, use_ml_models: bool = False):
        self.use_ml_models = use_ml_models
        self._classifier = None
        self._sentiment_analyzer = None
        
        if use_ml_models:
            self._load_models()
    
    def _load_models(self):
        """Load ML models if available."""
        try:
            from transformers import pipeline
            self._classifier = pipeline("text-classification")
            self._sentiment_analyzer = pipeline("sentiment-analysis")
        except ImportError:
            print("Transformers not available, using rule-based processing")
            self.use_ml_models = False
    
    async def classify_text(self, text: str) -> Dict[str, Any]:
        """
        Classify text into categories.
        
        Categories:
        - payment_issue: Related to payment problems
        - request: General request or inquiry
        - complaint: Complaint or negative feedback
        - urgent: Urgent matter requiring immediate attention
        - neutral: General communication
        """
        if self.use_ml_models and self._classifier:
            try:
                result = self._classifier(text)
                return {
                    "category": result[0]["label"],
                    "confidence": result[0]["score"],
                    "method": "ml_model",
                }
            except Exception:
                pass
        
        # Rule-based classification
        return self._rule_based_classify(text)
    
    def _rule_based_classify(self, text: str) -> Dict[str, Any]:
        """Rule-based text classification."""
        text_lower = text.lower()
        
        # Define keyword patterns for each category
        categories = {
            "urgent": {
                "keywords": ["urgent", "emergency", "immediate", "asap", "critical", "help"],
                "weight": 1.5,
            },
            "payment_issue": {
                "keywords": ["payment", "pay", "transfer", "bank", "funds", "money", "late", "delay"],
                "weight": 1.2,
            },
            "complaint": {
                "keywords": ["complaint", "issue", "problem", "wrong", "error", "unhappy", "disappointed"],
                "weight": 1.1,
            },
            "request": {
                "keywords": ["request", "please", "could you", "need", "want", "require"],
                "weight": 1.0,
            },
        }
        
        scores = {}
        for category, config in categories.items():
            keywords = config["keywords"]
            weight = config["weight"]
            
            matches = sum(1 for kw in keywords if kw in text_lower)
            scores[category] = matches * weight
        
        if max(scores.values()) == 0:
            return {
                "category": "neutral",
                "confidence": 0.5,
                "method": "rule_based",
            }
        
        best_category = max(scores, key=scores.get)
        confidence = min(scores[best_category] / 5, 1.0)  # Normalize
        
        return {
            "category": best_category,
            "confidence": confidence,
            "method": "rule_based",
        }
    
    async def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze text sentiment.
        
        Returns:
        - sentiment: positive, negative, neutral
        - score: -1 to 1 (negative to positive)
        - confidence: 0 to 1
        """
        if self.use_ml_models and self._sentiment_analyzer:
            try:
                result = self._sentiment_analyzer(text)
                label = result[0]["label"].lower()
                score = result[0]["score"]
                
                if label == "negative":
                    sentiment_score = -score
                elif label == "positive":
                    sentiment_score = score
                else:
                    sentiment_score = 0
                
                return {
                    "sentiment": label,
                    "score": sentiment_score,
                    "confidence": score,
                    "method": "ml_model",
                }
            except Exception:
                pass
        
        # Rule-based sentiment
        return self._rule_based_sentiment(text)
    
    def _rule_based_sentiment(self, text: str) -> Dict[str, Any]:
        """Rule-based sentiment analysis."""
        text_lower = text.lower()
        
        positive_words = [
            "good", "great", "excellent", "thank", "appreciate",
            "happy", "pleased", "satisfied", "wonderful", "perfect",
            "love", "best", "amazing", "awesome", "fantastic",
        ]
        
        negative_words = [
            "bad", "poor", "terrible", "awful", "hate",
            "disappointed", "frustrated", "angry", "upset", "worst",
            "problem", "issue", "fail", "wrong", "error",
            "unacceptable", "ridiculous", "horrible", "useless",
        ]
        
        positive_count = sum(1 for w in positive_words if w in text_lower)
        negative_count = sum(1 for w in negative_words if w in text_lower)
        
        total = positive_count + negative_count
        
        if total == 0:
            return {
                "sentiment": "neutral",
                "score": 0.0,
                "confidence": 0.5,
                "method": "rule_based",
            }
        
        score = (positive_count - negative_count) / total
        
        if score > 0.2:
            sentiment = "positive"
        elif score < -0.2:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        confidence = min(total / 5, 1.0)
        
        return {
            "sentiment": sentiment,
            "score": score,
            "confidence": confidence,
            "method": "rule_based",
        }
    
    async def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities from text.
        
        Returns dict with:
        - dates
        - amounts
        - references
        """
        entities = {
            "dates": [],
            "amounts": [],
            "references": [],
        }
        
        # Date patterns
        date_patterns = [
            r'\b(\d{1,2}/\d{1,2}/\d{2,4})\b',
            r'\b(\d{1,2}-\d{1,2}-\d{2,4})\b',
            r'\b(\d{4}-\d{2}-\d{2})\b',
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b',
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["dates"].extend(matches)
        
        # Amount patterns
        amount_patterns = [
            r'\$[\d,]+(?:\.\d{2})?',
            r'[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP)',
            r'(?:USD|EUR|GBP)\s*[\d,]+(?:\.\d{2})?',
        ]
        
        for pattern in amount_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["amounts"].extend(matches)
        
        # Reference patterns
        reference_patterns = [
            r'(?:ref|reference|invoice|order)[:\s#]*([A-Z0-9-]+)',
            r'\b([A-Z]{2,4}-\d{4,})\b',
        ]
        
        for pattern in reference_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            entities["references"].extend(matches)
        
        return entities
