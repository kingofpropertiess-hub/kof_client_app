import { BASE, request, setTokenProvider, setUnauthorizedHandler } from "./client";
import { AUTH_TIMEOUT_MS } from "./config";
import type {
  ApiUser,
  Booking,
  Inquiry,
  NotificationItem,
  Property,
  SlotsResponse,
  Stay,
  StyleExpert,
  RoomTypeLike,
} from "./types";

// Re-export for consumers
export { setTokenProvider, setUnauthorizedHandler };

// ---------- Auth ----------
export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: ApiUser;
}

export const AuthApi = {
  registerUser: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    request<AuthResponse>(`${BASE}/auth/register/user`, {
      method: "POST",
      body,
      timeoutMs: AUTH_TIMEOUT_MS,
      skipGuard: true, // registration errors should surface here, not as a global 401 logout
    }),

  loginUser: (body: { email: string; password: string; expectedRole?: "user" }) =>
    request<AuthResponse>(`${BASE}/auth/login/user`, {
      method: "POST",
      body,
      timeoutMs: AUTH_TIMEOUT_MS,
      skipGuard: true,
    }),

  googleAuth: (body: Record<string, unknown>) =>
    request<AuthResponse>(`${BASE}/auth/google`, { method: "POST", body, timeoutMs: AUTH_TIMEOUT_MS }),

  me: () => request<{ success: boolean; user: ApiUser }>(`${BASE}/auth/me`, { timeoutMs: AUTH_TIMEOUT_MS }),

  logout: () => request<{ success: boolean }>(`${BASE}/auth/logout`, { method: "POST" }),

  getCurrentUser: () => request<{ success: boolean; user: ApiUser }>(`${BASE}/users/me`),

  updateUser: (id: string, body: Record<string, unknown>) =>
    request<{ success: boolean; user?: ApiUser }>(`${BASE}/users/${id}`, { method: "PUT", body }),

  /** Multipart avatar upload (backend uploads to Cloudinary and returns the updated user). */
  uploadAvatar: (id: string, uri: string) => {
    const form = new FormData();
    const name = uri.split("/").pop() || "avatar.jpg";
    form.append("profileImage", { uri, name, type: "image/jpeg" } as unknown as Blob);
    return request<{ success: boolean; user?: ApiUser }>(`${BASE}/users/${id}`, {
      method: "PUT",
      body: form,
      timeoutMs: AUTH_TIMEOUT_MS * 2,
    });
  },
};

// ---------- Properties ----------
export interface PropertyQuery {
  search?: string;
  city?: string;
  category?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  minRent?: number;
  maxRent?: number;
  types?: string;
  bhk?: string;
  purpose?: string;
  furnishing?: string;
  brokerage?: string;
  onlyVerified?: boolean;
  page?: number;
  limit?: number;
}

function toParams(q: PropertyQuery = {}) {
  const p = new URLSearchParams();
  const add = (k: string, v: unknown) => {
    if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
  };
  Object.entries(q).forEach(([k, v]) => add(k, v));
  add("format", "json");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export interface PropertyListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  totalPages: number;
  properties: Property[];
}

// ---------- Mock Data Fallback (जब backend slow/down हो) ----------
const MOCK_PROPERTIES: Property[] = [
  {
    _id: "mock-1",
    id: 1,
    title: "Luxury Villa Udaipur",
    description: "Beautiful 4 BHK villa with lake view",
    type: "Villa",
    category: "Villa",
    price: 8500000,
    priceLabel: "₹85 Lakhs",
    location: "Fateh Sagar, Udaipur",
    city: "Udaipur",
    state: "Rajasthan",
    locality: "Fateh Sagar",
    bedrooms: 4,
    bhk: 4,
    bathrooms: 4,
    area: "3,500 sq.ft",
    areaSize: 3500,
    amenities: ["Swimming Pool", "Garden", "Parking", "Security"],
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80"],
    status: "Ready to Move",
    isVerified: true,
    isFeatured: true,
    postedBy: "Owner",
    dealer: "Royal Properties",
  },
  {
    _id: "mock-2",
    id: 2,
    title: "Goa Beachfront Villa",
    description: "Direct beach access luxury villa in Goa",
    type: "Villa",
    category: "Villa",
    price: 14500000,
    priceLabel: "₹1.45 Cr",
    location: "Calangute Beach, Goa",
    city: "Goa",
    state: "Goa",
    locality: "Calangute",
    bedrooms: 4,
    bhk: 4,
    bathrooms: 4,
    area: "4,200 sq.ft",
    areaSize: 4200,
    amenities: ["Beach Access", "Private Pool", "Garden", "BBQ Grill"],
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"],
    status: "Ready to Move",
    isVerified: true,
    isFeatured: true,
    postedBy: "Builder",
    dealer: "Goa Coastal Realty",
  },
  {
    _id: "mock-3",
    id: 3,
    title: "Jaipur Royal Palace Villa",
    description: "Palatial villa in C-Scheme Jaipur",
    type: "Villa",
    category: "Villa",
    price: 11000000,
    priceLabel: "₹1.10 Cr",
    location: "C-Scheme, Jaipur",
    city: "Jaipur",
    state: "Rajasthan",
    locality: "C-Scheme",
    bedrooms: 5,
    bhk: 5,
    bathrooms: 6,
    area: "6,500 sq.ft",
    areaSize: 6500,
    amenities: ["Private Pool", "Marble Courtyard", "Guard House", "Rooftop Lounge"],
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"],
    status: "Ready to Move",
    isVerified: true,
    isFeatured: true,
    postedBy: "Owner",
    dealer: "Jaipur Heritage Builders",
  },
];

export const PropertyApi = {
  list: async (query?: PropertyQuery): Promise<PropertyListResponse> => {
    try {
      const res = await request<PropertyListResponse>(
        `${BASE}/properties${toParams(query)}`
      );
      return res;
    } catch (err: any) {
      // Backend unreachable या timeout होने पर mock data लौटाएं
      console.warn("Backend API fallback to mock data:", err?.message);
      const mockList = MOCK_PROPERTIES.filter((p) => {
        if (query?.city && query.city !== "All") {
          return p.city.toLowerCase().includes(query.city.toLowerCase());
        }
        if (query?.search) {
          const q = query.search.toLowerCase();
          return p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
        }
        return true;
      });
      return {
        success: true,
        count: mockList.length,
        total: mockList.length,
        page: 1,
        totalPages: 1,
        properties: mockList,
      };
    }
  },
  rawList: (query?: Omit<PropertyQuery, "format">) =>
    request<Property[]>(`${BASE}/properties${toParams(query)}`),
  get: (id: string | number) => request<Property>(`${BASE}/properties/${id}`),
  slots: (id: string | number, date: string) =>
    request<SlotsResponse>(`${BASE}/bookings/properties/${id}/slots?date=${date}`),
};

// ---------- Stays (hotels / villas) ----------
/** Some stay endpoints wrap the payload as { success, stay } — normalize to plain Stay. */
function unwrapStay<T>(res: unknown): T {
  if (res && typeof res === "object" && "stay" in (res as Record<string, unknown>)) {
    const stay = (res as { stay?: unknown }).stay;
    if (stay && typeof stay === "object") return stay as T;
  }
  return res as T;
}

export const StayApi = {
  list: (query?: Record<string, string | number>) => {
    const p = new URLSearchParams();
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) p.set(k, String(v));
    });
    const s = p.toString();
    return request<Stay[]>(`${BASE}/stays${s ? `?${s}` : ""}`);
  },
  get: async (id: string | number) =>
    unwrapStay<Stay>(await request<Stay>(`${BASE}/stays/${id}`)),
  roomTypes: (stayId: string | number) =>
    request<RoomTypeLike[] | { roomTypes?: RoomTypeLike[]; reservation?: RoomTypeLike[] }>(`${BASE}/rooms/stays/${stayId}/room-types`),
  getAvailability: (
    stayId: string | number,
    params: { date: string; roomTypeId?: string; duration?: number; startTime?: string }
  ) => {
    const p = new URLSearchParams({ date: params.date });
    if (params.roomTypeId) p.set("roomTypeId", params.roomTypeId);
    if (params.duration) p.set("duration", String(params.duration));
    if (params.startTime) p.set("startTime", params.startTime);
    return request<Record<string, unknown>>(`${BASE}/bookings/stays/${stayId}/availability?${p.toString()}`);
  },
};

// ---------- Bookings ----------
export const BookingApi = {
  create: (body: Record<string, unknown>) =>
    request<{ success: boolean; message: string; booking: Booking; bookingId: string }>(
      `${BASE}/bookings/bookings`,
      { method: "POST", body }
    ),
  createHotelBooking: (body: Record<string, unknown>) =>
    request<{ success: boolean; message: string; booking: Booking; assignedRoomNumber: string }>(
      `${BASE}/bookings/hotel-bookings`,
      { method: "POST", body }
    ),
  list: () => request<{ success: boolean; count: number; bookings: Booking[] }>(`${BASE}/bookings/bookings`),
  get: (id: string) => request<{ success: boolean; booking: Booking }>(`${BASE}/bookings/bookings/${id}`),
  updateStatus: (id: string, status: string) =>
    request<{ success: boolean; booking: Booking }>(`${BASE}/bookings/bookings/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),
};

// ---------- Wishlist ----------
export const WishlistApi = {
  ids: () => request<{ success: boolean; savedPropertyIds?: number[] | string[]; ids?: (number | string)[] | { propertyId: number | string }[]; savedProperties?: { propertyId: number | string }[] }>(`${BASE}/wishlist/saved-properties`),
  items: () => request<{ success: boolean; properties?: Property[]; savedProperties?: Property[]; count?: number }>(`${BASE}/wishlist/saved-properties/items`),
  add: (propertyId: string | number) =>
    request<{ success: boolean }>(`${BASE}/wishlist/saved-properties`, { method: "POST", body: { propertyId } }),
  remove: (propertyId: string | number) =>
    request<{ success: boolean }>(`${BASE}/wishlist/saved-properties/${propertyId}`, { method: "DELETE" }),
};

// ---------- Inquiries ----------
export const InquiryApi = {
  create: (body: Record<string, unknown>) =>
    request<{ success: boolean; inquiryId: string }>(`${BASE}/inquiries`, { method: "POST", body }),
  mine: () => request<{ success: boolean; inquiries: Inquiry[] }>(`${BASE}/inquiries/user/inquiries`),
};

// ---------- Notifications ----------
export const NotificationApi = {
  list: () =>
    request<{ success: boolean; count: number; unreadCount: number; notifications: NotificationItem[] }>(
      `${BASE}/notifications`
    ),
  readAll: () => request<{ success: boolean }>(`${BASE}/notifications/read-all`, { method: "PATCH" }),
  readOne: (id: string) => request<{ success: boolean }>(`${BASE}/notifications/${id}/read`, { method: "PATCH" }),
  remove: (id: string) => request<{ success: boolean }>(`${BASE}/notifications/${id}`, { method: "DELETE" }),
};

// ---------- AI ----------
export const AiApi = {
  chat: (message: string, history: { sender: "user" | "ai"; text: string }[] = []) =>
    request<{ success: boolean; reply: string; properties: Property[]; suggestedPrompts?: string[] }>(
      `${BASE}/ai/chat`,
      { method: "POST", body: { message, history } }
    ),
};

// ---------- Style experts & service requests ----------
export interface StyleExpertQuery {
  category?: string;
  city?: string;
  search?: string;
  sort?: string;
  minRating?: string;
  minExperience?: string;
}

export const StyleApi = {
  listExperts: (params?: StyleExpertQuery) => {
    const pairs: [string, string | undefined][] = [
      ["category", params?.category && params.category !== "all" ? params.category : undefined],
      ["city", params?.city && params.city !== "All" ? params.city : undefined],
      ["search", params?.search?.trim() || undefined],
      ["sort", params?.sort && params.sort !== "relevance" ? params.sort : undefined],
      ["minRating", params?.minRating && params.minRating !== "All" ? params.minRating : undefined],
      ["minExperience", params?.minExperience && params.minExperience !== "All" ? params.minExperience : undefined],
    ];
    const qs = pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return request<{ success: boolean; count: number; professionals: StyleExpert[]; experts?: StyleExpert[] }>(
      `${BASE}/style/professionals${qs ? `?${qs}` : ""}`
    );
  },
  getExpert: (id: string) =>
    request<{ success: boolean; professional: StyleExpert; expert?: StyleExpert }>(
      `${BASE}/style/professionals/${id}`
    ),
  createServiceRequest: (body: Record<string, unknown>) =>
    request<{ success: boolean; message?: string; request?: unknown }>(`${BASE}/style/service-requests`, {
      method: "POST",
      body,
    }),
  myServiceRequests: () =>
    request<{ success: boolean; requests?: unknown[]; serviceRequests?: unknown[] }>(
      `${BASE}/style/service-requests/user`
    ),
};
