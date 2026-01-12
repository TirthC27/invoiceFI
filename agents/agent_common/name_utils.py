"""
Name Matching Utilities for Agents.

REAL name comparison using:
- Normalization
- Phonetic matching
- Fuzzy comparison
"""

import re
from typing import List, Tuple, Optional
import unicodedata


class NameMatcher:
    """
    Name matching utility for comparing names.
    
    Handles:
    - Unicode normalization
    - Title/suffix removal
    - Phonetic comparison
    - Order-independent matching
    """
    
    # Common titles and suffixes to remove
    TITLES = {
        "mr", "mrs", "ms", "miss", "dr", "prof", "sir", "lady",
        "lord", "rev", "fr", "sr", "jr", "ii", "iii", "iv",
        "esq", "phd", "md", "dds", "cpa",
    }
    
    # Common name variations
    NAME_VARIATIONS = {
        "william": ["will", "bill", "billy", "willy"],
        "robert": ["rob", "bob", "bobby", "robbie"],
        "richard": ["rick", "dick", "rich", "ricky"],
        "james": ["jim", "jimmy", "jamie"],
        "john": ["jack", "johnny", "jon"],
        "michael": ["mike", "mikey", "mick"],
        "david": ["dave", "davey"],
        "steven": ["steve", "stevie", "stephen"],
        "elizabeth": ["liz", "lizzy", "beth", "betty", "eliza"],
        "margaret": ["maggie", "marge", "peggy", "meg"],
        "jennifer": ["jen", "jenny", "jenn"],
        "catherine": ["kate", "katie", "cathy", "cat", "katherine"],
        "alexander": ["alex", "xander", "lex"],
        "christopher": ["chris", "topher"],
        "anthony": ["tony", "ant"],
        "benjamin": ["ben", "benny", "benji"],
        "nicholas": ["nick", "nicky", "nico"],
        "jonathan": ["jon", "jonny", "john"],
        "matthew": ["matt", "matty"],
        "daniel": ["dan", "danny"],
    }
    
    def __init__(self):
        # Build reverse lookup for variations
        self._variation_lookup = {}
        for base, variations in self.NAME_VARIATIONS.items():
            self._variation_lookup[base] = base
            for var in variations:
                self._variation_lookup[var] = base
    
    def normalize_name(self, name: str) -> str:
        """
        Normalize a name for comparison.
        
        Args:
            name: Raw name string
        
        Returns:
            Normalized name
        """
        if not name:
            return ""
        
        # Unicode normalization
        name = unicodedata.normalize("NFKD", name)
        
        # Remove accents
        name = "".join(
            c for c in name
            if not unicodedata.combining(c)
        )
        
        # Lowercase
        name = name.lower()
        
        # Remove punctuation except hyphens in names
        name = re.sub(r'[^\w\s-]', '', name)
        
        # Split into parts
        parts = name.split()
        
        # Remove titles and suffixes
        parts = [p for p in parts if p not in self.TITLES]
        
        # Normalize common name variations
        parts = [self._variation_lookup.get(p, p) for p in parts]
        
        # Rejoin
        return " ".join(parts)
    
    def compare_names(
        self,
        name1: str,
        name2: str,
    ) -> Tuple[float, str]:
        """
        Compare two names and return match score.
        
        Args:
            name1: First name
            name2: Second name
        
        Returns:
            Tuple of (score 0-100, match_type)
        """
        norm1 = self.normalize_name(name1)
        norm2 = self.normalize_name(name2)
        
        if not norm1 or not norm2:
            return (0.0, "empty")
        
        # Exact match after normalization
        if norm1 == norm2:
            return (100.0, "exact")
        
        # Split into parts
        parts1 = set(norm1.split())
        parts2 = set(norm2.split())
        
        # Check for subset match (all parts of one name in the other)
        if parts1.issubset(parts2) or parts2.issubset(parts1):
            return (95.0, "subset")
        
        # Calculate Jaccard similarity
        intersection = len(parts1 & parts2)
        union = len(parts1 | parts2)
        
        if union == 0:
            return (0.0, "empty")
        
        jaccard = intersection / union * 100
        
        # Check for partial match with initial matching
        if self._initials_match(parts1, parts2):
            jaccard = max(jaccard, 80.0)
            return (jaccard, "initials")
        
        # Phonetic comparison for fuzzy matching
        phonetic_score = self._phonetic_compare(parts1, parts2)
        if phonetic_score > jaccard:
            return (phonetic_score, "phonetic")
        
        return (jaccard, "partial")
    
    def _initials_match(self, parts1: set, parts2: set) -> bool:
        """Check if one set could be initials of the other."""
        # Get initials
        initials1 = {p[0] for p in parts1 if p}
        initials2 = {p[0] for p in parts2 if p}
        
        # Check if single letter parts match initials
        single1 = {p for p in parts1 if len(p) == 1}
        single2 = {p for p in parts2 if len(p) == 1}
        
        if single1 and single1.issubset(initials2):
            return True
        if single2 and single2.issubset(initials1):
            return True
        
        return False
    
    def _phonetic_compare(self, parts1: set, parts2: set) -> float:
        """Compare names using Soundex-like phonetic matching."""
        soundex1 = {self._soundex(p) for p in parts1}
        soundex2 = {self._soundex(p) for p in parts2}
        
        if not soundex1 or not soundex2:
            return 0.0
        
        intersection = len(soundex1 & soundex2)
        union = len(soundex1 | soundex2)
        
        return intersection / union * 100 if union > 0 else 0.0
    
    def _soundex(self, word: str) -> str:
        """
        Simple Soundex implementation for phonetic matching.
        """
        if not word:
            return ""
        
        word = word.upper()
        
        # Keep first letter
        soundex = word[0]
        
        # Soundex codes
        codes = {
            'B': '1', 'F': '1', 'P': '1', 'V': '1',
            'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
            'D': '3', 'T': '3',
            'L': '4',
            'M': '5', 'N': '5',
            'R': '6',
        }
        
        # Encode
        prev_code = codes.get(soundex, '')
        
        for char in word[1:]:
            code = codes.get(char, '')
            if code and code != prev_code:
                soundex += code
                prev_code = code
            elif char in 'AEIOUYHW':
                prev_code = ''
        
        # Pad or truncate to 4 characters
        soundex = (soundex + '000')[:4]
        
        return soundex
    
    def find_best_match(
        self,
        target_name: str,
        candidate_names: List[str],
        threshold: float = 70.0,
    ) -> Optional[Tuple[str, float, str]]:
        """
        Find the best matching name from candidates.
        
        Args:
            target_name: Name to match
            candidate_names: List of candidate names
            threshold: Minimum score threshold
        
        Returns:
            Tuple of (best_match, score, match_type) or None
        """
        if not candidate_names:
            return None
        
        best_match = None
        best_score = 0.0
        best_type = ""
        
        for candidate in candidate_names:
            score, match_type = self.compare_names(target_name, candidate)
            
            if score > best_score:
                best_score = score
                best_match = candidate
                best_type = match_type
        
        if best_score >= threshold:
            return (best_match, best_score, best_type)
        
        return None
