import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { School, SchoolReview } from "@/lib/schools";

export function useSchoolsForNeighborhood(neighborhood: string | undefined) {
  return useQuery({
    queryKey: ["schools", neighborhood],
    queryFn: async (): Promise<School[]> => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("neighborhood", neighborhood!)
        .order("name");
      if (error) throw error;
      return data.map((s) => ({
        id: s.id,
        name: s.name,
        neighborhood: s.neighborhood,
        schoolType: s.school_type,
        studentCount: s.student_count,
        notes: s.notes,
      }));
    },
    enabled: !!neighborhood,
  });
}

export function useSchoolReviews(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["school-reviews", schoolId],
    queryFn: async (): Promise<SchoolReview[]> => {
      const { data: reviews, error } = await supabase
        .from("school_reviews")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (reviews.length === 0) return [];

      const userIds = [...new Set(reviews.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return reviews.map((r) => ({
        id: r.id,
        schoolId: r.school_id,
        userId: r.user_id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        reviewerName: nameById.get(r.user_id) ?? "A parent",
      }));
    },
    enabled: !!schoolId,
  });
}

export function useSubmitSchoolReview(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      rating,
      comment,
    }: {
      userId: string;
      rating: number;
      comment: string;
    }) => {
      const { error } = await supabase
        .from("school_reviews")
        .upsert(
          { school_id: schoolId, user_id: userId, rating, comment: comment || null },
          { onConflict: "school_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-reviews", schoolId] });
    },
  });
}
