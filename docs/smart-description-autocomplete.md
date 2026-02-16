# Smart Description Autocomplete with Frequency Tracking

## Overview
The description field provides intelligent auto-suggestions based on:
1. **Frequency** - How often each description has been used
2. **Recency** - When it was last used
3. **Category match** - Descriptions used with the current category
4. **Text match** - Fuzzy matching as user types

---

## Database Schema Updates

### New Table: `description_history`
```sql
CREATE TABLE description_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 1,
    last_used_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_description_history_usage ON description_history(usage_count DESC, last_used_at DESC);
CREATE INDEX idx_description_history_text ON description_history(description);
```

### Link with Categories
```sql
CREATE TABLE description_category_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Index for category-specific suggestions
CREATE INDEX idx_desc_cat_usage ON description_category_usage(category_id, usage_count DESC);
```

---

## Backend API Endpoints

### 1. Get Description Suggestions
```javascript
// routes/descriptions.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');

/**
 * GET /api/descriptions/suggest
 * Query params:
 *   - q: search query (optional)
 *   - category_id: filter by category (optional)
 *   - limit: max results (default: 10)
 */
router.get('/suggest', (req, res) => {
  const { q = '', category_id, limit = 10 } = req.query;
  
  try {
    let suggestions = [];
    
    if (category_id) {
      // Category-specific suggestions (weighted higher)
      const categoryQuery = `
        SELECT 
          dcu.description,
          dcu.usage_count as category_usage,
          dh.usage_count as total_usage,
          dh.last_used_at,
          (dcu.usage_count * 2 + dh.usage_count) as relevance_score
        FROM description_category_usage dcu
        JOIN description_history dh ON dcu.description = dh.description
        WHERE dcu.category_id = ?
          AND dcu.description LIKE ?
        ORDER BY relevance_score DESC, dh.last_used_at DESC
        LIMIT ?
      `;
      
      suggestions = db.prepare(categoryQuery).all(
        category_id,
        `%${q}%`,
        limit
      );
    }
    
    // If not enough category-specific suggestions, add general ones
    if (suggestions.length < limit) {
      const generalQuery = `
        SELECT 
          description,
          usage_count as total_usage,
          last_used_at,
          usage_count as relevance_score
        FROM description_history
        WHERE description LIKE ?
          AND description NOT IN (${suggestions.map(() => '?').join(',')})
        ORDER BY relevance_score DESC, last_used_at DESC
        LIMIT ?
      `;
      
      const generalSuggestions = db.prepare(generalQuery).all(
        `%${q}%`,
        ...suggestions.map(s => s.description),
        limit - suggestions.length
      );
      
      suggestions = [...suggestions, ...generalSuggestions];
    }
    
    res.json({
      suggestions: suggestions.map(s => ({
        description: s.description,
        usage_count: s.total_usage,
        last_used: s.last_used_at
      }))
    });
    
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

/**
 * POST /api/descriptions/track
 * Body: { description, category_id }
 * Updates usage statistics when a description is used
 */
router.post('/track', (req, res) => {
  const { description, category_id } = req.body;
  
  if (!description || !category_id) {
    return res.status(400).json({ error: 'Description and category_id required' });
  }
  
  try {
    const now = new Date().toISOString();
    
    // Update or insert in description_history
    const historyQuery = `
      INSERT INTO description_history (description, usage_count, last_used_at, created_at)
      VALUES (?, 1, ?, ?)
      ON CONFLICT(description) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = ?
    `;
    
    db.prepare(historyQuery).run(description, now, now, now);
    
    // Update or insert in description_category_usage
    const categoryQuery = `
      INSERT INTO description_category_usage (description, category_id, usage_count, last_used_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(description, category_id) DO UPDATE SET
        usage_count = usage_count + 1,
        last_used_at = ?
    `;
    
    db.prepare(categoryQuery).run(description, category_id, now, now);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error tracking description:', error);
    res.status(500).json({ error: 'Failed to track description' });
  }
});

/**
 * GET /api/descriptions/popular
 * Get most frequently used descriptions across all categories
 */
router.get('/popular', (req, res) => {
  const { limit = 20 } = req.query;
  
  try {
    const query = `
      SELECT 
        description,
        usage_count,
        last_used_at
      FROM description_history
      ORDER BY usage_count DESC, last_used_at DESC
      LIMIT ?
    `;
    
    const popular = db.prepare(query).all(limit);
    res.json({ popular });
    
  } catch (error) {
    console.error('Error fetching popular descriptions:', error);
    res.status(500).json({ error: 'Failed to fetch popular descriptions' });
  }
});

module.exports = router;
```

---

## React Component: Smart Description Input

```jsx
// components/transactions/SmartDescriptionInput.jsx
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../services/api';

function SmartDescriptionInput({ 
  value, 
  onChange, 
  categoryId, 
  required = true,
  error 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Debounce search query to avoid too many API calls
  const debouncedValue = useDebounce(value, 300);
  
  // Fetch suggestions when value changes
  useEffect(() => {
    if (debouncedValue.length >= 2 && categoryId) {
      fetchSuggestions(debouncedValue, categoryId);
    } else if (debouncedValue.length === 0 && categoryId) {
      // Show popular suggestions for this category when field is empty
      fetchSuggestions('', categoryId);
    } else {
      setSuggestions([]);
    }
  }, [debouncedValue, categoryId]);
  
  const fetchSuggestions = async (query, catId) => {
    try {
      const response = await api.get('/descriptions/suggest', {
        params: { q: query, category_id: catId, limit: 10 }
      });
      setSuggestions(response.data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };
  
  const handleInputChange = (e) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };
  
  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };
  
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
        
      default:
        break;
    }
  };
  
  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };
  
  const handleBlur = (e) => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 200);
  };
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  return (
    <div className="smart-input-container">
      <input
        ref={inputRef}
        type="text"
        className={`form-input ${error ? 'error' : ''}`}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="z.B. Netcologne Internet, Kultura Provision..."
        required={required}
        autoComplete="off"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="suggestions-dropdown"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="suggestion-text">
                {highlightMatch(suggestion.description, value)}
              </div>
              <div className="suggestion-meta">
                <span className="usage-badge">
                  {suggestion.usage_count}× verwendet
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to highlight matching text
function highlightMatch(text, query) {
  if (!query) return text;
  
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default SmartDescriptionInput;
```

---

## Custom Hook: useDebounce

```jsx
// hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
```

---

## Updated TransactionForm Component

```jsx
// components/transactions/TransactionForm.jsx
import SmartDescriptionInput from './SmartDescriptionInput';

function TransactionForm({ transaction, onSave, onCancel }) {
  // ... existing state ...
  
  const handleSave = async (transactionData) => {
    // Save transaction
    await onSave(transactionData);
    
    // Track description usage
    await api.post('/descriptions/track', {
      description: transactionData.description,
      category_id: transactionData.category_id
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}
      
      {/* Description with Smart Autocomplete */}
      <div className="form-row full">
        <div className="form-group">
          <label className="form-label required">Beschreibung</label>
          <SmartDescriptionInput
            value={formData.description}
            onChange={(value) => handleChange('description', value)}
            categoryId={formData.category_id}
            required
            error={errors.description}
          />
          {errors.description && (
            <span className="error-text">{errors.description}</span>
          )}
        </div>
      </div>
      
      {/* ... rest of form ... */}
    </form>
  );
}
```

---

## CSS Styles

```css
/* Smart Input Container */
.smart-input-container {
  position: relative;
}

/* Suggestions Dropdown */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  border: 2px solid #e2e8f0;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  z-index: 1000;
  margin-top: -2px;
}

/* Suggestion Item */
.suggestion-item {
  padding: 12px 15px;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: #f7fafc;
}

.suggestion-item.selected {
  background: #edf2f7;
  border-left: 3px solid #667eea;
}

/* Suggestion Text */
.suggestion-text {
  flex: 1;
  color: #2d3748;
  font-size: 0.95em;
}

.suggestion-text mark {
  background: #fef3c7;
  color: #92400e;
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
}

/* Suggestion Meta */
.suggestion-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 15px;
}

/* Usage Badge */
.usage-badge {
  background: #e0e7ff;
  color: #4338ca;
  font-size: 0.75em;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

/* Input with open dropdown */
.smart-input-container input:focus {
  border-radius: 8px 8px 0 0;
}

/* Scrollbar for suggestions */
.suggestions-dropdown::-webkit-scrollbar {
  width: 8px;
}

.suggestions-dropdown::-webkit-scrollbar-track {
  background: #f7fafc;
}

.suggestions-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.suggestions-dropdown::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
```

---

## Database Migration Script

```javascript
// database/migrations/002_add_description_history.js
const db = require('../config/database');

function migrate() {
  try {
    // Create description_history table
    db.exec(`
      CREATE TABLE IF NOT EXISTS description_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL UNIQUE,
        usage_count INTEGER DEFAULT 1,
        last_used_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_description_history_usage 
        ON description_history(usage_count DESC, last_used_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_description_history_text 
        ON description_history(description);
    `);
    
    // Create description_category_usage table
    db.exec(`
      CREATE TABLE IF NOT EXISTS description_category_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        UNIQUE(description, category_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_desc_cat_usage 
        ON description_category_usage(category_id, usage_count DESC);
    `);
    
    // Populate from existing transactions
    db.exec(`
      INSERT OR IGNORE INTO description_history (description, usage_count, last_used_at, created_at)
      SELECT 
        description,
        COUNT(*) as usage_count,
        MAX(date) as last_used_at,
        MIN(date) as created_at
      FROM transactions
      GROUP BY description;
      
      INSERT OR IGNORE INTO description_category_usage (description, category_id, usage_count, last_used_at)
      SELECT 
        description,
        category_id,
        COUNT(*) as usage_count,
        MAX(date) as last_used_at
      FROM transactions
      GROUP BY description, category_id;
    `);
    
    console.log('✅ Description history tables created and populated');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

module.exports = { migrate };
```

---

## Algorithm: Relevance Scoring

### Scoring Formula
```
relevance_score = 
  (category_usage_count × 2.0) +  // Category-specific weight
  (total_usage_count × 1.0) +      // Overall usage weight
  (recency_boost × 0.5)            // Recent usage boost

recency_boost = 
  if last_used < 7 days ago: +10
  if last_used < 30 days ago: +5
  if last_used < 90 days ago: +2
  else: 0
```

### Enhanced Backend Query
```javascript
const enhancedQuery = `
  SELECT 
    dcu.description,
    dcu.usage_count as category_usage,
    dh.usage_count as total_usage,
    dh.last_used_at,
    (
      (dcu.usage_count * 2.0) + 
      (dh.usage_count * 1.0) +
      (CASE 
        WHEN julianday('now') - julianday(dh.last_used_at) < 7 THEN 10
        WHEN julianday('now') - julianday(dh.last_used_at) < 30 THEN 5
        WHEN julianday('now') - julianday(dh.last_used_at) < 90 THEN 2
        ELSE 0
      END * 0.5)
    ) as relevance_score
  FROM description_category_usage dcu
  JOIN description_history dh ON dcu.description = dh.description
  WHERE dcu.category_id = ?
    AND dcu.description LIKE ?
  ORDER BY relevance_score DESC, dh.last_used_at DESC
  LIMIT ?
`;
```

---

## User Experience Flow

### Scenario 1: Empty Field, Focus
```
User clicks description field
↓
System shows top 10 suggestions for selected category:
  1. Netcologne Internet (45× verwendet)
  2. Kultura SW Paket (12× verwendet)
  3. Freenet Mobilfunk (12× verwendet)
  ...
```

### Scenario 2: Start Typing "net"
```
User types: "net"
↓
System filters and shows:
  1. Netcologne Internet (45× verwendet)  ← "net" highlighted
  2. Internet Flatrate (3× verwendet)     ← "net" highlighted
```

### Scenario 3: Keyboard Navigation
```
User types: "kaf"
↓
Shows:
  1. Kaffee für Büro (18× verwendet)     ← Selected
  2. Kaffeemaschine Wartung (2× verwendet)
↓
User presses ↓ arrow
↓
Selection moves to item 2
↓
User presses Enter
↓
"Kaffeemaschine Wartung" fills the field
```

### Scenario 4: New Description
```
User types: "Zoom Pro Abo"
↓
No exact matches found
↓
Shows similar:
  1. Microsoft 365 Abo (5× verwendet)
  2. Strato Hosting Abo (3× verwendet)
↓
User continues typing and submits form
↓
"Zoom Pro Abo" saved as new description
↓
Next time user selects same category, "Zoom Pro Abo" appears in suggestions
```

---

## Performance Optimizations

### 1. Debouncing
```javascript
// Wait 300ms after user stops typing before searching
const debouncedValue = useDebounce(value, 300);
```

### 2. Caching
```javascript
// Cache suggestions for same category + query
const cache = new Map();

function getCachedSuggestions(categoryId, query) {
  const key = `${categoryId}:${query}`;
  return cache.get(key);
}

function setCachedSuggestions(categoryId, query, suggestions) {
  const key = `${categoryId}:${query}`;
  cache.set(key, suggestions);
  
  // Limit cache size
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
```

### 3. Database Indexes
Already created in migration:
- Index on `usage_count DESC, last_used_at DESC`
- Index on `description` for text search
- Index on `category_id, usage_count DESC`

---

## Testing Checklist

- [ ] Suggestions appear when focusing empty field
- [ ] Suggestions filter as user types
- [ ] Keyboard navigation works (↑↓ arrows, Enter, Escape)
- [ ] Click on suggestion fills field
- [ ] New descriptions are saved to history
- [ ] Usage count increments correctly
- [ ] Category-specific suggestions prioritized
- [ ] Debouncing prevents excessive API calls
- [ ] Dropdown closes on blur/escape
- [ ] Matching text is highlighted
- [ ] Works with special characters in descriptions
- [ ] Performance with 1000+ descriptions

---

## Summary

This implementation provides:

✅ **Smart suggestions** based on frequency and category  
✅ **Real-time filtering** as user types  
✅ **Keyboard navigation** for power users  
✅ **Automatic learning** - new descriptions saved  
✅ **Context-aware** - prioritizes category-specific suggestions  
✅ **Performance optimized** - debouncing, caching, indexes  
✅ **Visual feedback** - usage count, highlighting  

The system learns from usage and gets smarter over time!
