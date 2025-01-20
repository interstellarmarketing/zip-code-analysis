'use client';

import { createClient } from "@/utils/supabase/client";
import { Database } from "@/lib/types/supabase";
import { useEffect, useState } from "react";
import { AddZipCode } from "./add-zip-code";

type ZipList = Database['public']['Tables']['zip_code_lists']['Row'] & {
  zip_codes: Database['public']['Tables']['zip_codes']['Row'][];
};

interface ListDetailProps {
  listId: string;
}

export function ListDetail({ listId }: ListDetailProps) {
  const [list, setList] = useState<ZipList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchList = async () => {
    try {
      const { data, error } = await supabase
        .from('zip_code_lists')
        .select(`
          *,
          zip_codes (*)
        `)
        .eq('id', listId)
        .single();

      if (error) throw error;
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zipCodeId: string) => {
    try {
      const { error } = await supabase
        .from('zip_codes')
        .delete()
        .eq('id', zipCodeId);

      if (error) throw error;
      fetchList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    }
  };

  useEffect(() => {
    fetchList();

    // Set up real-time subscription
    const channel = supabase
      .channel('list_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zip_codes',
          filter: `list_id=eq.${listId}`
        },
        () => {
          fetchList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listId, supabase]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!list) return <div>List not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">{list.name}</h2>
        {list.description && (
          <p className="text-gray-600 mb-4">{list.description}</p>
        )}
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Zip Codes</h3>
          {list.zip_codes.length === 0 ? (
            <p className="text-gray-500">No zip codes added yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.zip_codes.map((zip) => (
                <div
                  key={zip.id}
                  className="border rounded-lg p-4 relative group"
                >
                  <button
                    onClick={() => handleDelete(zip.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  <div className="font-medium">{zip.zip_code}</div>
                  <div className="text-sm text-gray-600">
                    {zip.city}, {zip.state}
                  </div>
                  {zip.population && (
                    <div className="text-sm text-gray-500">
                      Pop: {zip.population.toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddZipCode listId={listId} onSuccess={fetchList} />
    </div>
  );
} 