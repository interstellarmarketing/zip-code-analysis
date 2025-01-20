'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { clientApi } from '@/lib/api/client';
import type { ZipCodeList, ZipCode } from '@/lib/types/supabase';

interface UploadResponse {
  filename: string;
  list_id: string;
  total_zip_codes: number;
  invalid_zip_codes?: string[];
  validation_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  validation_progress: number;
  validation_error?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [lists, setLists] = useState<ZipCodeList[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [newList, setNewList] = useState({ name: '', description: '', zipCodes: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch lists on mount
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const { data, error } = await clientApi.zipLists.getAll();
        if (error) throw new Error(error.message);
        setLists(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      // Create a new list for the uploaded file
      const { data: list, error: listError } = await clientApi.zipLists.create({
        name: file.name.replace('.csv', ''),
        description: 'Uploaded via CSV file'
      });

      if (listError) throw new Error(listError.message);

      // Read and parse the CSV file
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      const zipCodes = lines.slice(1).map(line => {
        const [zip_code, city, state] = line.split(',').map(s => s.trim());
        return { zip_code, city, state };
      });

      // Add ZIP codes to the list
      const { error: uploadError } = await clientApi.zipLists.addZipCodes(list.id, zipCodes);
      if (uploadError) throw new Error(uploadError.message);

      // Refresh lists
      const { data: updatedLists } = await clientApi.zipLists.getAll();
      setLists(updatedLists || []);

      setUploadResult({
        filename: file.name,
        list_id: list.id,
        total_zip_codes: zipCodes.length,
        validation_status: 'completed',
        validation_progress: 100
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const zipCodes = newList.zipCodes
        .split(/[\n,]/)
        .map(code => code.trim())
        .filter(Boolean)
        .map(zip_code => ({ zip_code, city: '', state: '' }));

      const { data: list, error: listError } = await clientApi.zipLists.create({
        name: newList.name,
        description: newList.description
      });

      if (listError) throw new Error(listError.message);

      if (zipCodes.length > 0) {
        const { error: codesError } = await clientApi.zipLists.addZipCodes(list.id, zipCodes);
        if (codesError) throw new Error(codesError.message);
      }

      // Refresh lists
      const { data: updatedLists } = await clientApi.zipLists.getAll();
      setLists(updatedLists || []);
      setIsCreating(false);
      setNewList({ name: '', description: '', zipCodes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Total Lists</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{lists.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Total ZIP Codes</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {lists.reduce((acc, list) => acc + (list.zip_codes?.length || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Last Updated</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {lists[0]?.created_at ? new Date(lists[0].created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </div>

      {/* Create New List Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your ZIP Code Lists</h2>
          <div className="flex space-x-4">
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {isUploading ? 'Uploading...' : 'Upload CSV'}
              </label>
            </div>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              variant="default"
              size="default"
            >
              Create New List
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        {uploadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-600">
            <div>Successfully uploaded {uploadResult.filename} with {uploadResult.total_zip_codes} ZIP codes</div>
            {uploadResult.invalid_zip_codes && uploadResult.invalid_zip_codes.length > 0 && (
              <div className="mt-2">
                Found {uploadResult.invalid_zip_codes.length} invalid ZIP codes
              </div>
            )}
            <div className="mt-2 flex items-center">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                uploadResult.validation_status === 'pending' ? 'bg-yellow-400' :
                uploadResult.validation_status === 'in_progress' ? 'bg-blue-400 animate-pulse' :
                uploadResult.validation_status === 'completed' ? 'bg-green-400' :
                'bg-red-400'
              }`}></span>
              <span>
                {uploadResult.validation_status === 'pending' ? 'Pending Validation' :
                 uploadResult.validation_status === 'in_progress' ? `Validating (${uploadResult.validation_progress}%)` :
                 uploadResult.validation_status === 'completed' ? 'Validation Complete' :
                 'Validation Failed'}
              </span>
              {uploadResult.validation_error && (
                <span className="ml-2 text-red-600" title={uploadResult.validation_error}>(!)</span>
              )}
            </div>
          </div>
        )}

        {isCreating && (
          <form onSubmit={handleCreateList} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name
                </label>
                <input
                  type="text"
                  value={newList.name}
                  onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter list name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newList.description}
                  onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Codes
              </label>
              <textarea
                value={newList.zipCodes}
                onChange={(e) => setNewList({ ...newList, zipCodes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter ZIP codes (one per line or comma-separated)"
              />
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsCreating(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button type="submit">
                Create List
              </Button>
            </div>
          </form>
        )}

        {/* Lists Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ZIP Codes</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lists.map((list) => (
                <tr key={list.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{list.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{list.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{list.zip_codes?.length || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(list.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/lists/${list.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      View
                    </Link>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this list?')) {
                          const { error } = await clientApi.zipLists.delete(list.id);
                          if (!error) {
                            setLists(lists.filter(l => l.id !== list.id));
                          }
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 