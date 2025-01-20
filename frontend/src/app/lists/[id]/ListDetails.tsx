'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { ZipCodeList } from '@/lib/types/supabase';

interface ListDetailsProps {
  listId: string;
}

export function ListDetails({ listId }: ListDetailsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [newZipCode, setNewZipCode] = useState('');
  const [list, setList] = useState<ZipCodeList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadList();
  }, [listId]);

  const loadList = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First get the list details
      const { data: listData, error: listError } = await supabase
        .from('zip_code_lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (listError) throw listError;

      // Then get the total count of ZIP codes
      const { count, error: countError } = await supabase
        .from('zip_codes')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', listId);

      if (countError) throw countError;

      // Now fetch all ZIP codes with pagination
      const pageSize = 1000;
      const pages = Math.ceil(count! / pageSize);
      const zipCodePromises = [];

      for (let i = 0; i < pages; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;
        
        zipCodePromises.push(
          supabase
            .from('zip_codes')
            .select('*')
            .eq('list_id', listId)
            .range(from, to)
        );
      }

      const zipCodeResults = await Promise.all(zipCodePromises);
      const allZipCodes = zipCodeResults.flatMap(result => result.data || []);

      setList({
        ...listData,
        zip_codes: allZipCodes
      });
    } catch (err) {
      setError('Failed to load ZIP code list. Please try again later.');
      console.error('Error loading list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddZipCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list) return;

    try {
      // First, validate the ZIP code format
      if (!/^\d{5}$/.test(newZipCode)) {
        alert('Please enter a valid 5-digit ZIP code');
        return;
      }

      console.log('Validating ZIP code:', newZipCode);
      
      // Get city and state data from our USPS API endpoint
      const response = await fetch(`/api/zipcode/validate/${newZipCode}`);
      const data = await response.json();
      
      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate ZIP code');
      }
      
      if (!data.city || !data.state) {
        throw new Error('Invalid response: missing city or state data');
      }

      console.log('Inserting ZIP code into database:', {
        list_id: list.id,
        zip_code: newZipCode,
        city: data.city,
        state: data.state
      });
      
      const { error: addError } = await supabase
        .from('zip_codes')
        .insert({
          list_id: list.id,
          zip_code: newZipCode,
          user_id: list.user_id,
          city: data.city,
          state: data.state,
          population: data.population
        });

      if (addError) {
        console.error('Database error:', addError);
        throw addError;
      }
      
      await loadList();
      setNewZipCode('');
      
    } catch (err) {
      console.error('Error adding ZIP code:', err);
      alert(err instanceof Error ? err.message : 'Failed to add ZIP code. Please try again.');
    }
  };

  const handleRemoveZipCode = async (zipCode: string) => {
    if (!list) return;
    if (!confirm('Are you sure you want to remove this ZIP code?')) return;

    try {
      const { error: removeError } = await supabase
        .from('zip_codes')
        .delete()
        .eq('list_id', list.id)
        .eq('zip_code', zipCode);

      if (removeError) throw removeError;
      await loadList();
    } catch (err) {
      console.error('Error removing ZIP code:', err);
      alert('Failed to remove ZIP code. Please try again.');
    }
  };

  const handleUpdateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!list) return;

    try {
      const { error: updateError } = await supabase
        .from('zip_code_lists')
        .update({
          name: list.name,
          description: list.description
        })
        .eq('id', list.id);

      if (updateError) throw updateError;
      setIsEditing(false);
      await loadList();
    } catch (err) {
      console.error('Error updating list:', err);
      alert('Failed to update list. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
        <p className="text-red-600 mb-4">{error || 'List not found'}</p>
        <Button onClick={() => router.push('/lists')}>Back to Lists</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* List Details Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        {isEditing ? (
          <form onSubmit={handleUpdateList} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                value={list.name}
                onChange={(e) => setList({ ...list, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={list.description || ''}
                onChange={(e) => setList({ ...list, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsEditing(false)} type="button">
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
                {list.description && (
                  <p className="mt-1 text-gray-600">{list.description}</p>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Details
              </Button>
            </div>
            <div className="flex space-x-6 text-sm text-gray-600">
              <div>Created: {new Date(list.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(list.updated_at).toLocaleString()}</div>
              <div>Total ZIP Codes: {list.zip_codes?.length || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Add ZIP Code Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add ZIP Code</h2>
        <form onSubmit={handleAddZipCode} className="flex space-x-3">
          <input
            type="text"
            value={newZipCode}
            onChange={(e) => setNewZipCode(e.target.value)}
            placeholder="Enter ZIP code"
            pattern="[0-9]{5}"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <Button type="submit">
            Add
          </Button>
        </form>
      </div>

      {/* ZIP Codes List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">ZIP Codes</h2>
          <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
            Total: {list.zip_codes?.length.toLocaleString()} ZIP codes
          </div>
        </div>
        <div className="grid gap-4">
          {list.zip_codes?.map((zip) => (
            <div
              key={zip.zip_code}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <span className="font-medium">{zip.zip_code}</span>
                {zip.city && zip.state && (
                  <span className="ml-2 text-gray-600">
                    {zip.city}, {zip.state}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemoveZipCode(zip.zip_code)}
              >
                Remove
              </Button>
            </div>
          ))}

          {(!list.zip_codes || list.zip_codes.length === 0) && (
            <p className="text-center text-gray-600 py-4">
              No ZIP codes added yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 