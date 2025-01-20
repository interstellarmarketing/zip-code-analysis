'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { clientApi } from '@/lib/api/client';
import type { ZipCodeList } from '@/lib/types/supabase';

export default function ListsPage() {
  const [lists, setLists] = useState<ZipCodeList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error } = await clientApi.zipLists.getAll();
      if (error) throw new Error(error.message);
      setLists(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ZIP code lists');
      console.error('Error loading lists:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      const { error } = await clientApi.zipLists.delete(id);
      if (error) throw new Error(error.message);
      setLists(lists.filter(list => list.id !== id));
    } catch (err) {
      console.error('Error deleting list:', err);
      alert('Failed to delete list: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadLists}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Your ZIP Code Lists</h1>
        <Link href="/lists/new">
          <Button>
            Create New List
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        {lists.map((list) => (
          <div
            key={list.id}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <Link
                  href={`/lists/${list.id}`}
                  className="text-xl font-semibold text-gray-900 hover:text-blue-600"
                >
                  {list.name}
                </Link>
                {list.description && (
                  <p className="mt-1 text-gray-600">{list.description}</p>
                )}
                <div className="mt-2 flex space-x-6 text-sm text-gray-600">
                  <div>ZIP Codes: {list.zip_codes?.length || 0}</div>
                  <div>Created: {new Date(list.created_at).toLocaleDateString()}</div>
                  <div>Updated: {new Date(list.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Link href={`/lists/${list.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(list.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}

        {lists.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ZIP code lists yet</h3>
            <p className="text-gray-600 mb-4">Create your first list to get started</p>
            <Link href="/lists/new">
              <Button>
                Create New List
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 