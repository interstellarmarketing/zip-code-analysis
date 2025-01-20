import { createClient } from "@/utils/supabase/server";

export default async function ServerList() {
  const supabase = createClient();
  
  const { data: zipLists, error } = await supabase
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

  if (error) {
    return <div>Error loading zip code lists: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Zip Code Lists</h2>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 