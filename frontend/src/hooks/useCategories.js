import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

let cachedCategories = null;

export function clearCategoryCache() {
  cachedCategories = null;
}

export function useCategories() {
  const [categories, setCategories] = useState(cachedCategories || []);
  const [loading, setLoading] = useState(!cachedCategories);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api.getCategories().then((data) => {
      cachedCategories = data;
      setCategories(data);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to fetch categories:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (cachedCategories) return;
    fetchCategories();
  }, [fetchCategories]);

  const refetch = useCallback(() => {
    clearCategoryCache();
    fetchCategories();
  }, [fetchCategories]);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return { categories, incomeCategories, expenseCategories, loading, refetch };
}
