'use client';

import { createClient } from "@/utils/supabase/client";
import { Database } from "@/lib/types/supabase";
import { useEffect, useState } from "react";

type ZipList = Database['public']['Tables']['zip_code_lists']['Row'] & {
  zip_codes: Database['public']['Tables']['zip_codes']['Row'][];
};

export default function ClientList() {
  const [zipLists, setZipLists] = useState<ZipList[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchZipLists = async () => {
      try {
        const { data, error } = await supabase
          .from('zip_code_lists')
          .select(`
            id,
            name,
            description,
            created_at,
            zip_codes (
              id,
              zip_code,
              city,
              state,
              population
            )
          `);

        if (error) throw error;
        setZipLists(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Set up real-time subscription
    const channel = supabase
      .channel('zip_lists_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zip_code_lists'
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchZipLists(); // Refetch data when changes occur
        }
      )
      .subscribe();

    fetchZipLists();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Zip Code Lists (Real-time)</h2>
      {zipLists?.length === 0 ? (
        <p>No zip code lists found. Create your first one!</p>
      ) : (
        <div className="grid gap-4">
          {zipLists?.map((list) => (
            <div key={list.id} className="border p-4 rounded-lg">
              <h3 className="font-semibold text-lg">{list.name}</h3>
              {list.description && (
                <p className="text-gray-600">{list.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(list.created_at).toLocaleDateString()}
              </p>
              <div className="mt-2">
                <p className="font-medium">Zip Codes: {list.zip_codes.length}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {list.zip_codes.slice(0, 4).map((zip) => (
                    <div key={zip.id} className="text-sm">
                      {zip.zip_code} - {zip.city}, {zip.state}
                    </div>
                  ))}
                </div>
                {list.zip_codes.length > 4 && (
                  <p className="text-sm text-gray-500 mt-1">
                    And {list.zip_codes.length - 4} more...
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 