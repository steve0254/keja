export type School = {
  id: string;
  name: string;
  neighborhood: string;
  schoolType: string;
  studentCount: number | null;
  notes: string | null;
};

export type SchoolReview = {
  id: string;
  schoolId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
};

export function formatStudentCount(n: number | null) {
  if (!n) return null;
  return `${n.toLocaleString()} students`;
}
