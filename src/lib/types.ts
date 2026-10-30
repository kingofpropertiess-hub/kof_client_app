export interface ApiUser {
  _id: string;
  id: string;
  email: string;
  role: string;
  accountType: string;
  status: string;
  fullName: string;
  firstName: string;
  lastName: string;
  profileImage: string;
  phone: string;
  companyName: string;
  categories?: string[];
}

export interface ListingImage {
  date?: string;
  slotLabel?: string;
  reason?: string;
}

export interface Property {
  _id: string;
  id: number | string;
  title: string;
  description: string;
  listingType?: string;
  propertyType?: string;
  type: string;
  category: string;
  price: number;
  priceLabel: string;
  location: string;
  city: string;
  state: string;
  locality: string;
  bedrooms?: number;
  bhk: number;
  bathrooms?: number;
  area: string;
  areaSize?: number;
  amenities?: string[];
  image: string;
  images?: string[];
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
  postedBy: string;
  dealer: string;
  purpose?: string;
  monthlyRent?: number;
  securityDeposit?: string;
  maintenance?: string;
  furnishing?: string;
  tenantPreference?: string;
  brokerage?: string;
  isZeroBrokerage?: boolean;
  availableFrom?: string;
  parking?: string;
  vendorId?: string;
  // Slot-based booking
  isTimeSlotEnabled?: boolean;
  bookingType?: string;
  availableDays?: string[];
  openingTime?: string;
  closingTime?: string;
  slotDuration?: number;
  bufferTime?: number;
  customBlockedSlots?: ListingImage[];
  // Stay fallbacks
  rating?: number;
  rooms?: RoomTypeLike[];
}

export interface RoomTypeLike {
  _id: string;
  name: string;
  roomType?: string;
  pricePerHour?: number;
  minDuration?: number;
  maxDuration?: number;
  capacity?: number;
  images?: string[];
}

export interface ScheduledRoomsRoom {
  _id: string;
  roomNumber: string;
  roomType?: string;
}

export interface Booking {
  _id: string;
  id: string;
  propertyId?: string | number;
  stayId?: string;
  propertyTitle: string;
  service?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  amount: number;
  paymentStatus?: "Pending" | "Paid" | "Failed" | "Refunded" | string;
  bookingStatus?: "Confirmed" | "Pending" | "Cancelled" | "Completed" | "Rejected" | string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  slotLabel?: string;
  selectedSlots?: { startTime: string; endTime: string; slotLabel: string }[];
  roomNumber?: string;
  roomType?: string;
  specialRequests?: string;
  createdAt?: string;
  image?: string;
}

export interface Inquiry {
  _id: string;
  propertyId?: string | number;
  propertyTitle?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status?: string;
  createdAt?: string;
  image?: string;
}

export interface NotificationItem {
  _id: string;
  title?: string;
  message?: string;
  body?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
}

export interface PropertySlot {
  startTime: string;
  endTime: string;
  slotLabel: string;
  startMinutes: number;
  endMinutes: number;
  status: "Available" | "Booked" | "Blocked" | "Past" | "Unavailable" | string;
  customerInfo?: unknown;
}

export interface SlotsResponse {
  success: boolean;
  propertyId: string;
  date: string;
  isTimeSlotEnabled?: boolean;
  bookingType: string;
  openingTime?: string;
  closingTime?: string;
  slotDuration?: number;
  isDayAvailable?: boolean;
  dayName?: string;
  slots: PropertySlot[];
}

export interface Stay {
  _id: string;
  id?: number;
  name: string;
  title?: string;
  description: string;
  city: string;
  location?: string;
  category?: string;
  type?: string;
  price?: number;
  pricePerHour?: number;
  startingRate?: number;
  priceLabel?: string;
  images: string[];
  amenities?: string[];
  rating?: number;
  isVerified?: boolean;
  status: string;
  vendorId?: string;
  rooms?: RoomTypeLike[];
}

export interface StyleExpert {
  /** Mongo id (detail lookup falls back to this when `id` is absent). */
  _id?: string;
  /** Business slug used by the web profile URLs (`/style/:id`). */
  id?: string;
  /** FURNITURE | INTERIOR_DESIGNER | RENOVATION (may be lowercase on older records). */
  category?: string;
  name: string;
  title?: string;
  shortIntroduction?: string;
  isVerified?: boolean;
  profileImage?: string;
  coverImage?: string;
  experienceYears?: number;
  /** Legacy/seed shape: "14 Years" or a bare number. */
  experience?: number | string;
  projectsCompleted?: number;
  location?: string;
  city?: string;
  locality?: string;
  rating?: number;
  reviewCount?: number;
  specializations?: string[];
  about?: string;
  description?: string;
  servicesOffered?: string[];
  services?: string[];
  portfolio?: string[];
  portfolioImages?: string[];
  startingPrice?: { amount?: number; label?: string };
  pricing?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  /** Legacy fields kept so older seed records still render. */
  specialization?: string;
  image?: string;
  image1?: string;
  price?: number;
}
