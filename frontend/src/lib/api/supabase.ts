import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { 
  type ZipCodeList,
  type ZipCode,
  type InsertZipCodeList,
  type InsertZipCode
} from "@/lib/types/supabase";

// Authentication Actions
export const auth = {
  signUp: async (formData: FormData) => {
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
  },

  signIn: async (formData: FormData) => {
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
  },

  signOut: async () => {
    const supabase = createClient(cookies());
    await supabase.auth.signOut();
    return redirect("/");
  }
};

// ZIP Code Lists Actions
export const zipLists = {
  create: async (formData: FormData) => {
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
  },

  addZipCodes: async (listId: string, zipCodes: Array<{ zip_code: string; city: string; state: string; population?: number }>) => {
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
  },

  getAll: async () => {
    const supabase = createClient(cookies());
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // First get all lists
    const { data: lists, error: listsError } = await supabase
      .from('zip_code_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (listsError) return { error: listsError.message };

    // Then get counts for each list
    const listsWithCounts = await Promise.all(lists.map(async (list) => {
      // Get total count for this list
      const { count, error: countError } = await supabase
        .from('zip_codes')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      if (countError) throw countError;

      return {
        ...list,
        zip_codes: { length: count || 0 }
      };
    }));

    return { data: listsWithCounts as (ZipCodeList & { zip_codes: { length: number } })[] };
  },

  delete: async (listId: string) => {
    const supabase = createClient(cookies());
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from('zip_code_lists')
      .delete()
      .eq('id', listId)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { success: true };
  }
};

// ZIP Code Comparison Actions
export const comparison = {
  compareLists: async (listId1: string, listId2: string) => {
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
  }
}; 