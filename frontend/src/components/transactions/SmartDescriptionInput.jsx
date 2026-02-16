import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../services/api';

export default function SmartDescriptionInput({ value, onChange, categoryId, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 300);
  const wrapperRef = useRef(null);
  const isFocusedRef = useRef(false);

  const fetchSuggestions = useCallback((q, catId) => {
    // Fetch if we have text >= 2 chars, OR if we have a category (shows popular for that category)
    if ((!q || q.length < 2) && !catId) {
      setSuggestions([]);
      return;
    }
    api.getDescriptionSuggestions({ q: q || '', category_id: catId || '' })
      .then((data) => {
        setSuggestions(data);
        if (isFocusedRef.current && data.length > 0) {
          setShowSuggestions(true);
        }
      })
      .catch(() => setSuggestions([]));
  }, []);

  // Re-fetch when debounced text or category changes
  useEffect(() => {
    fetchSuggestions(debouncedValue, categoryId);
  }, [debouncedValue, categoryId, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    } else if (categoryId) {
      // Trigger fetch for category-based suggestions even with empty input
      fetchSuggestions(value, categoryId);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
  };

  const handleSelect = (suggestion) => {
    onChange(suggestion.description, suggestion.vat_rate);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const highlightMatch = (text) => {
    if (!value) return text;
    const idx = text.toLowerCase().indexOf(value.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-semibold text-blue-600">{text.slice(idx, idx + value.length)}</span>
        {text.slice(idx + value.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); setActiveIndex(-1); }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="z.B. Büromaterial Amazon"
        className={className}
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s.description}
              onMouseDown={() => handleSelect(s)}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between ${
                i === activeIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              <span>{highlightMatch(s.description)}</span>
              {s.usage_count > 1 && (
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{s.usage_count}x</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
