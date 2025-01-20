import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/lib/types/supabase';

// Client-side API wrapper
const supabase = createClient();

export const clientApi = {
  auth: {
    signUp: async (email: string, password: string) => {
      return await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    },

    signIn: async (email: string, password: string) => {
      return await supabase.auth.signInWithPassword({
        email,
        password,
      });
    },

    signOut: async () => {
      return await supabase.auth.signOut();
    },

    getSession: async () => {
      return await supabase.auth.getSession();
    },
  },

  zipLists: {
    getAll: async () => {
      return await supabase
        .from('zip_code_lists')
        .select(`
          *,
          zip_codes (*)
        `)
        .order('created_at', { ascending: false });
    },

    create: async (data: { name: string; description?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      return await supabase
        .from('zip_code_lists')
        .insert({
          ...data,
          user_id: session.user.id
        })
        .select()
        .single();
    },

    addZipCodes: async (listId: string, zipCodes: Array<{ zip_code: string; city: string; state: string; population?: number }>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      return await supabase
        .from('zip_codes')
        .insert(
          zipCodes.map(code => ({
            ...code,
            list_id: listId,
            user_id: session.user.id
          }))
        )
        .select();
    },

    delete: async (listId: string) => {
      return await supabase
        .from('zip_code_lists')
        .delete()
        .eq('id', listId);
    },
  },

  comparison: {
    compareLists: async (listId1: string, listId2: string) => {
      const [list1Result, list2Result] = await Promise.all([
        supabase
          .from('zip_codes')
          .select('zip_code')
          .eq('list_id', listId1),
        supabase
          .from('zip_codes')
          .select('zip_code')
          .eq('list_id', listId2),
      ]);

      if (list1Result.error || list2Result.error) {
        throw new Error('Error fetching lists');
      }

      const set1 = new Set(list1Result.data.map(item => item.zip_code));
      const set2 = new Set(list2Result.data.map(item => item.zip_code));

      return {
        added: [...set2].filter(x => !set1.has(x)),
        removed: [...set1].filter(x => !set2.has(x)),
        unchanged: [...set1].filter(x => set2.has(x)),
      };
    },
  },
}; 