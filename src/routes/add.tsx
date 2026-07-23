import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, Check, X, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LandlordAiPanel } from "@/components/assistant/LandlordAiPanel";
import { toast } from "sonner";

export const Route = createFileRoute("/add")({
  head: () => ({ meta: [{ title: "Add vacancy — Keja" }] }),
  component: AddVacancy,
});

const residentialTypes = [
  "Single Room",
  "Double Room",
  "Bedsitter",
  "Studio",
  "One Bedroom",
  "Two Bedroom",
  "Three Bedroom",
  "Maisonette",
  "Townhouse",
] as const;
const commercialTypes = ["Shop", "Warehouse", "Commercial Space"] as const;
const houseTypes = [...residentialTypes, ...commercialTypes, "Other"] as const;
const amenityOptions = ["Wi-Fi", "Water", "Parking", "Furnished", "Pets", "Own compound"];
const MAX_PHOTOS = 8;

function AddVacancy() {
  const navigate = useNavigate();
  const { user, isLandlord, roles, loading, reloadRoles } = useAuth();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<(typeof houseTypes)[number]>("Bedsitter");
  const [rent, setRent] = useState("15000");
  const [deposit, setDeposit] = useState("15000");
  const [title, setTitle] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(1);
  const [description, setDescription] = useState("");
  const [amenities, setAmenities] = useState<string[]>(["Water"]);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [caretakerName, setCaretakerName] = useState("");
  const [caretakerPhone, setCaretakerPhone] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function becomeLandlord() {
    if (!user) return;
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "landlord" });
    if (error && !error.message.includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    await reloadRoles();
    toast.success("You're now a landlord on Keja");
  }

  function captureGps() {
    if (!navigator.geolocation) return toast.error("GPS not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("Location captured");
      },
      () => toast.error("Could not read GPS"),
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length;
      if (room <= 0) {
        toast.error(`You can add up to ${MAX_PHOTOS} photos`);
        return prev;
      }
      const next = incoming
        .slice(0, room)
        .map((file) => ({ file, preview: URL.createObjectURL(file) }));
      if (incoming.length > room) toast.error(`Only added ${room} more — max ${MAX_PHOTOS} photos`);
      return [...prev, ...next];
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadPhotos(): Promise<string[]> {
    if (!user || photos.length === 0) return [];
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const { file } of photos) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      return urls;
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function publish() {
    if (!user) return;
    if (!title || !neighborhood || !rent) {
      toast.error("Add a title, neighborhood, and rent");
      return;
    }
    setSubmitting(true);
    let imageUrls: string[] = [];
    try {
      imageUrls = await uploadPhotos();
    } catch (err) {
      setSubmitting(false);
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
      return;
    }
    const { data, error } = await supabase
      .from("listings")
      .insert({
        owner_id: user.id,
        title,
        neighborhood,
        address: address || null,
        type,
        rent: Number(rent),
        deposit: Number(deposit || rent),
        bedrooms,
        bathrooms,
        description: description || null,
        amenities,
        images: imageUrls,
        status: "available",
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        caretaker_name: caretakerName || null,
        caretaker_phone: caretakerPhone || null,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vacancy published — it's live now");
    navigate({ to: "/listing/$id", params: { id: data.id } });
  }

  if (loading || !user) return null;

  if (!isLandlord) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-5 pb-10 pt-8">
        <Link
          to="/"
          className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="animate-fade-up mt-10">
          <h1 className="text-2xl font-semibold tracking-tight">List your first home</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            To publish vacancies you need a landlord (or agency) role. It's free — you can switch
            back to tenant anytime.
          </p>
          <div className="mt-4 rounded-3xl bg-card p-4 text-sm shadow-soft">
            <p className="font-semibold">Currently signed in as</p>
            <p className="mt-0.5 text-muted-foreground">
              {user.email} · {roles.join(", ") || "tenant"}
            </p>
          </div>
          <button
            onClick={becomeLandlord}
            className="press mt-6 w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            Become a landlord
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { n: 1, label: "Location" },
    { n: 2, label: "Type" },
    { n: 3, label: "Details" },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background pb-32">
      <header className="glass sticky top-0 z-20 flex items-center justify-between px-4 py-4">
        <Link
          to="/"
          className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-semibold">Add vacancy</p>
        <span className="w-10" />
      </header>

      <div className="px-5 pt-4">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step >= s.n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 rounded-full ${step > s.n ? "bg-primary" : "bg-muted"}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="animate-fade-up mt-6 px-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Where is it?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                GPS gives tenants exact walking distance.
              </p>
            </div>
            <button
              onClick={captureGps}
              className="press flex w-full items-center gap-3 rounded-3xl bg-primary p-4 text-left text-primary-foreground shadow-pop"
            >
              <MapPin className="h-5 w-5" />
              <span>
                <span className="block text-sm font-semibold">
                  {coords ? "GPS captured" : "Use my current GPS"}
                </span>
                <span className="block text-xs opacity-80">
                  {coords
                    ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                    : "Accurate to 5 meters"}
                </span>
              </span>
            </button>
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Neighborhood (e.g. Kilimani)"
              className="w-full rounded-2xl border border-border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street or building (optional)"
              className="w-full rounded-2xl border border-border bg-card p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">What kind of home?</h1>
              <p className="mt-1 text-sm text-muted-foreground">You can add more units later.</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Residential
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {residentialTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`press rounded-2xl border p-4 text-left text-sm font-medium ${
                      type === t
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Commercial
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {commercialTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`press rounded-2xl border p-4 text-left text-sm font-medium ${
                      type === t
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Other
              </span>
              <div className="mt-2">
                <button
                  onClick={() => setType("Other")}
                  className={`press w-full rounded-2xl border p-4 text-left text-sm font-medium ${
                    type === "Other"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card"
                  }`}
                >
                  Other
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Bedrooms
                </span>
                <input
                  type="number"
                  min={0}
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-base font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Bathrooms
                </span>
                <input
                  type="number"
                  min={1}
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-base font-semibold"
                />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">A few details</h1>
              <p className="mt-1 text-sm text-muted-foreground">Under a minute to go live.</p>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunlit studio, Riverside"
                className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-sm"
              />
            </label>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Photos ({photos.length}/{MAX_PHOTOS})
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={p.preview}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-muted"
                  >
                    <img
                      src={p.preview}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remove photo"
                      className="press absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="press flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-card text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[11px] font-medium">Add photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPhotos(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                First photo becomes the cover image.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Rent (KSh)
                </span>
                <input
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-base font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Deposit
                </span>
                <input
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-base font-semibold"
                />
              </label>
            </div>
            <LandlordAiPanel
              context={{
                type,
                neighborhood: neighborhood || undefined,
                bedrooms,
                bathrooms,
                rent: Number(rent) || undefined,
                amenities,
                notes: title || undefined,
              }}
              onUseDescription={setDescription}
            />
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What makes this home great?"
                className="mt-2 w-full rounded-2xl border border-border bg-card p-3 text-sm"
              />
            </label>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Amenities
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenityOptions.map((a) => {
                  const on = amenities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() =>
                        setAmenities((v) => (on ? v.filter((x) => x !== a) : [...v, a]))
                      }
                      className={`press rounded-full border px-3 py-1.5 text-xs font-medium ${
                        on
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={caretakerName}
                onChange={(e) => setCaretakerName(e.target.value)}
                placeholder="Caretaker name"
                className="rounded-2xl border border-border bg-card p-3 text-sm"
              />
              <input
                value={caretakerPhone}
                onChange={(e) => setCaretakerPhone(e.target.value)}
                placeholder="Caretaker phone"
                className="rounded-2xl border border-border bg-card p-3 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="glass fixed bottom-0 left-1/2 z-40 w-full max-w-[440px] -translate-x-1/2 border-t border-border px-5 py-4">
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="press rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => Math.min(3, s + 1))}
              className="press flex-1 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-pop"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={publish}
              disabled={submitting}
              className="press flex-1 rounded-2xl bg-primary py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
            >
              {uploadingPhotos
                ? "Uploading photos…"
                : submitting
                  ? "Publishing…"
                  : "Publish vacancy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
