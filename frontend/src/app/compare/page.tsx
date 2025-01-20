'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/utils/supabase/client';
import type { ZipCodeList } from '@/lib/types/supabase';

interface ComparisonResult {
  added: string[];
  removed: string[];
  unchanged: string[];
  totalChanges: number;
}

export default function ComparePage() {
  const [list1Id, setList1Id] = useState<string | null>(null);
  const [list2Id, setList2Id] = useState<string | null>(null);
  const [lists, setLists] = useState<ZipCodeList[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setIsLoadingLists(true);
      const { data, error } = await supabase
        .from('zip_code_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLists(data || []);
    } catch (err) {
      console.error('Error loading lists:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ZIP code lists');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const handleCompare = async () => {
    if (!list1Id || !list2Id) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // First get the total counts
      const [count1Response, count2Response] = await Promise.all([
        supabase
          .from('zip_codes')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list1Id),
        supabase
          .from('zip_codes')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list2Id)
      ]);

      if (count1Response.error) throw count1Response.error;
      if (count2Response.error) throw count2Response.error;

      // Fetch all ZIP codes with pagination
      const pageSize = 1000;
      const pages1 = Math.ceil(count1Response.count! / pageSize);
      const pages2 = Math.ceil(count2Response.count! / pageSize);
      
      const zipCodePromises1 = [];
      const zipCodePromises2 = [];

      for (let i = 0; i < pages1; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;
        
        zipCodePromises1.push(
          supabase
            .from('zip_codes')
            .select('zip_code')
            .eq('list_id', list1Id)
            .range(from, to)
        );
      }

      for (let i = 0; i < pages2; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;
        
        zipCodePromises2.push(
          supabase
            .from('zip_codes')
            .select('zip_code')
            .eq('list_id', list2Id)
            .range(from, to)
        );
      }

      const [list1Results, list2Results] = await Promise.all([
        Promise.all(zipCodePromises1),
        Promise.all(zipCodePromises2)
      ]);

      const list1ZipCodes = new Set(list1Results.flatMap(result => result.data?.map(z => z.zip_code) || []));
      const list2ZipCodes = new Set(list2Results.flatMap(result => result.data?.map(z => z.zip_code) || []));

      const added = [...list2ZipCodes].filter(x => !list1ZipCodes.has(x));
      const removed = [...list1ZipCodes].filter(x => !list2ZipCodes.has(x));
      const unchanged = [...list1ZipCodes].filter(x => list2ZipCodes.has(x));

      setComparisonResult({
        added,
        removed,
        unchanged,
        totalChanges: added.length + removed.length
      });
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err instanceof Error ? err.message : 'Failed to compare lists');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingLists) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* List Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Compare ZIP Code Lists</h2>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First List (Original)
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={list1Id || ''}
              onChange={(e) => setList1Id(e.target.value || null)}
            >
              <option value="">Select a list...</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({new Date(list.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Second List (New)
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={list2Id || ''}
              onChange={(e) => setList2Id(e.target.value || null)}
            >
              <option value="">Select a list...</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({new Date(list.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleCompare}
            disabled={!list1Id || !list2Id || isLoading}
          >
            {isLoading ? 'Comparing...' : 'Compare Lists'}
          </Button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison Results</h3>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Added ZIP Codes</h4>
              <p className="text-2xl font-bold text-green-600">{comparisonResult.added.length}</p>
              <div className="mt-2 text-sm text-green-800">
                {comparisonResult.added.join(', ')}
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Removed ZIP Codes</h4>
              <p className="text-2xl font-bold text-red-600">{comparisonResult.removed.length}</p>
              <div className="mt-2 text-sm text-red-800">
                {comparisonResult.removed.join(', ')}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Unchanged ZIP Codes</h4>
              <p className="text-2xl font-bold text-blue-600">{comparisonResult.unchanged.length}</p>
              <div className="mt-2 text-sm text-blue-800">
                {comparisonResult.unchanged.join(', ')}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
            <p className="text-gray-700">
              Total changes: <span className="font-semibold">{comparisonResult.totalChanges}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 