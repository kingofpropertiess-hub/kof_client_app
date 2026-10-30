import type { StyleExpert } from "../lib/types";

/** Stable key for list rendering & navigation (business slug first, like the web /style/:id URLs). */
export function styleExpertKey(e: StyleExpert): string {
  return e.id || e._id || e.name || "";
}

/** Profile photo with legacy seed fallbacks. */
export function styleExpertPhoto(e: StyleExpert): string | undefined {
  return e.profileImage || e.image || e.image1 || undefined;
}

export function styleExpertLocation(e: StyleExpert): string {
  return e.location || [e.locality, e.city].filter(Boolean).join(", ") || e.city || "Location not listed";
}

/** Compact "14y exp" label for list rows. */
export function styleExperienceShort(e: StyleExpert): string | null {
  return e.experienceYears ? `${e.experienceYears}y exp` : e.experience ? String(e.experience) : null;
}

/** Full "14 Years Exp" label for the profile page. */
export function styleExperienceLong(e: StyleExpert): string | null {
  return e.experienceYears ? `${e.experienceYears} Years Exp` : e.experience ? String(e.experience) : null;
}

export function stylePriceLabel(e: StyleExpert): string | null {
  if (e.startingPrice?.label) return e.startingPrice.label;
  if (e.price) return `Starting from ${formatPriceINR(e.price)}`;
  return null;
}

export function styleSpecs(e: StyleExpert): string[] {
  return e.specializations?.length ? e.specializations : e.specialization ? [e.specialization] : [];
}

export function styleServices(e: StyleExpert): string[] {
  return e.servicesOffered?.length ? e.servicesOffered : e.services || [];
}

export function stylePortfolio(e: StyleExpert): string[] {
  return e.portfolio?.length ? e.portfolio : e.portfolioImages || [];
}

export function styleAbout(e: StyleExpert): string {
  return e.about || e.description || e.shortIntroduction || "";
}

export function formatPriceINR(value?: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (n === undefined || n === null || isNaN(n)) return "Price on request";
  try {
    return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  } catch {
    return `₹${n}`;
  }
}

/** Prices in this project are often stored in Crores; produce a compact label when no priceLabel exists. */
export function compactPrice(price?: number, priceLabel?: string, unit?: string): string {
  if (priceLabel && priceLabel.trim().length > 0) return priceLabel;
  if (price === undefined || price === null || isNaN(price)) return "Price on request";
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2).replace(/\.00$/, "")} Cr${unit || ""}`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2).replace(/\.00$/, "")} L${unit || ""}`;
  return formatPriceINR(price);
}

export function formatAmount(amount?: number): string {
  if (!amount) return "Free visit";
  return formatPriceINR(amount);
}

export function formatSlotLabel(slot?: string): string {
  return (slot || "").replace(/–/g, " - ").trim();
}

export function formatDatePretty(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateStrip(count = 14): { date: string; dayNum: string; dayName: string }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: { date: string; dayNum: string; dayName: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      date: toISODate(d),
      dayNum: String(d.getDate()),
      dayName: i === 0 ? "Today" : days[d.getDay()],
    });
  }
  return out;
}

export function bookingStatusMeta(status?: string): {
  label: string;
  color: string;
  bg: string;
} {
  switch ((status || "").toLowerCase()) {
    case "confirmed":
      return { label: "Confirmed", color: "#0E9F6E", bg: "rgba(14,159,110,0.12)" };
    case "pending":
      return { label: "Pending", color: "#D97706", bg: "rgba(217,119,6,0.12)" };
    case "cancelled":
    case "rejected":
      return { label: status === "Rejected" ? "Rejected" : "Cancelled", color: "#DC2626", bg: "rgba(220,38,38,0.12)" };
    case "completed":
      return { label: "Completed", color: "#2563EB", bg: "rgba(37,99,235,0.12)" };
    default:
      return { label: status || "Unknown", color: "#6C757D", bg: "rgba(108,117,125,0.12)" };
  }
}

export function initialsOf(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => (p[0] || "").toUpperCase()).join("") || "U";
}

export function normalizeId(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}
