"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
  type ZipCodeList,
  type ZipCode,
  type InsertZipCodeList,
  type InsertZipCode
} from "@/lib/database.types";

// Authentication Actions
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = createClient(cookies());
  const origin = headers().get("origin");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return { error: error.message };
  }

  return { success: "Check your email for the confirmation link" };
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = createClient(cookies());

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return redirect("/dashboard");
};

export const signOutAction = async () => {
  const supabase = createClient(cookies());
  await supabase.auth.signOut();
  return redirect("/");
};

// ZIP Code List Actions
export const createZipCodeList = async (formData: FormData) => {
  const supabase = createClient(cookies());
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const newList: InsertZipCodeList = {
    name,
    description,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from('zip_code_lists')
    .insert(newList)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as ZipCodeList };
};

export const addZipCodesToList = async (listId: string, zipCodes: Array<{ zip_code: string; city: string; state: string; population?: number }>) => {
  const supabase = createClient(cookies());
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const zipCodeEntries: InsertZipCode[] = zipCodes.map(({ zip_code, city, state, population }) => ({
    list_id: listId,
    zip_code,
    city,
    state,
    population,
    user_id: user.id
  }));

  const { data, error } = await supabase
    .from('zip_codes')
    .insert(zipCodeEntries)
    .select();

  if (error) return { error: error.message };
  return { data: data as ZipCode[] };
};

export const getZipCodeLists = async () => {
  const supabase = createClient(cookies());
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from('zip_code_lists')
    .select(`
      *,
      zip_codes (*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data: data as (ZipCodeList & { zip_codes: ZipCode[] })[] };
};

export const compareZipCodeLists = async (listId1: string, listId2: string) => {
  const supabase = createClient(cookies());
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch both lists
  const { data: list1, error: error1 } = await supabase
    .from('zip_codes')
    .select('zip_code')
    .eq('list_id', listId1)
    .eq('user_id', user.id);

  const { data: list2, error: error2 } = await supabase
    .from('zip_codes')
    .select('zip_code')
    .eq('list_id', listId2)
    .eq('user_id', user.id);

  if (error1 || error2) return { error: "Error fetching lists" };

  const set1 = new Set(list1.map(item => item.zip_code));
  const set2 = new Set(list2.map(item => item.zip_code));

  const added = [...set2].filter(x => !set1.has(x));
  const removed = [...set1].filter(x => !set2.has(x));
  const unchanged = [...set1].filter(x => set2.has(x));

  return {
    data: {
      added,
      removed,
      unchanged,
      totalChanges: added.length + removed.length
    }
  };
}; 