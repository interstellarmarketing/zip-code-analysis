'use client';

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

interface AddZipCodeProps {
  listId: string;
  onSuccess?: () => void;
}

export function AddZipCode({ listId, onSuccess }: AddZipCodeProps) {
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [population, setPopulation] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if zip code already exists in this list
      const { data: existing } = await supabase
        .from('zip_codes')
        .select('id')
        .eq('list_id', listId)
        .eq('zip_code', zipCode)
        .single();

      if (existing) {
        throw new Error("This zip code is already in the list");
      }

      const { error } = await supabase
        .from('zip_codes')
        .insert([
          {
            zip_code: zipCode,
            city,
            state,
            population: population ? parseInt(population) : null,
            list_id: listId,
            user_id: user.id
          }
        ]);

      if (error) throw error;
      
      setZipCode("");
      setCity("");
      setState("");
      setPopulation("");
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Add Zip Code</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              Zip Code
            </label>
            <input
              type="text"
              id="zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              pattern="[0-9]{5}"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="population" className="block text-sm font-medium text-gray-700">
              Population
            </label>
            <input
              type="number"
              id="population"
              value={population}
              onChange={(e) => setPopulation(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              pattern="[A-Z]{2}"
              placeholder="CA"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Adding..." : "Add Zip Code"}
        </button>
      </form>
    </div>
  );
} 