import { useState, useEffect } from 'react';
import { api } from '../services/api';

let cachedCategories = null;

export function useCategories() {
  const [categories, setCategories] = useState(cachedCategories || []);
  const [loading, setLoading] = useState(!cachedCategories);

  useEffect(() => {
    if (cachedCategories) return;
    api.getCategories().then((data) => {
      cachedCategories = data;
      setCategories(data);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to fetch categories:', err);
      setLoading(false);
    });
  }, []);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return { categories, incomeCategories, expenseCategories, loading };
}
