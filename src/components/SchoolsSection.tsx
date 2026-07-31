import { useState } from "react";
import { GraduationCap, Star, ChevronDown, Users } from "lucide-react";
import {
  useSchoolsForNeighborhood,
  useSchoolReviews,
  useSubmitSchoolReview,
} from "@/hooks/use-schools";
import { formatStudentCount } from "@/lib/schools";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "press" : ""}
        >
          <Star
            className={`h-4 w-4 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

function SchoolCard({
  schoolId,
  name,
  schoolType,
  studentCount,
  notes,
}: {
  schoolId: string;
  name: string;
  schoolType: string;
  studentCount: number | null;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useSchoolReviews(open ? schoolId : undefined);
  const submitReview = useSubmitSchoolReview(schoolId);

  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  async function handleSubmit() {
    if (!user) {
      toast.error("Sign in to leave a review");
      return;
    }
    if (myRating === 0) {
      toast.error("Pick a star rating first");
      return;
    }
    try {
      await submitReview.mutateAsync({ userId: user.id, rating: myRating, comment: myComment });
      toast.success("Review saved");
      setMyRating(0);
      setMyComment("");
    } catch {
      toast.error("Couldn't save your review — try again");
    }
  }

  return (
    <div className="rounded-2xl bg-card p-3 shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>{schoolType}</span>
            {studentCount && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatStudentCount(studentCount)}
              </span>
            )}
            {avg && (
              <span className="flex items-center gap-1 text-foreground">
                <Star className="h-3 w-3 fill-primary text-primary" />
                {avg.toFixed(1)} ({reviews.length})
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {notes && <p className="text-xs text-muted-foreground">{notes}</p>}

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground">No parent reviews yet — be the first.</p>
          ) : (
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-muted/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{r.reviewerName}</span>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="mt-1 text-xs text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-muted/30 p-2.5">
            <p className="mb-1.5 text-xs font-semibold">Leave a review</p>
            <Stars value={myRating} onChange={setMyRating} />
            <textarea
              value={myComment}
              onChange={(e) => setMyComment(e.target.value)}
              placeholder="What's it like for your kids?"
              rows={2}
              className="mt-2 w-full rounded-xl border border-border bg-card p-2 text-xs"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitReview.isPending}
              className="press mt-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitReview.isPending ? "Saving…" : "Submit review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SchoolsSection({ neighborhood }: { neighborhood: string }) {
  const { data: schools = [], isLoading } = useSchoolsForNeighborhood(neighborhood);

  if (isLoading) return null;
  if (schools.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold tracking-tight">Nearby schools</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Ratings come from parent reviews — Keja doesn't have verified performance data.
      </p>
      <div className="mt-3 space-y-2">
        {schools.map((s) => (
          <SchoolCard
            key={s.id}
            schoolId={s.id}
            name={s.name}
            schoolType={s.schoolType}
            studentCount={s.studentCount}
            notes={s.notes}
          />
        ))}
      </div>
    </section>
  );
}
