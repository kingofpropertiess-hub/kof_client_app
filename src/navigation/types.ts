import { NavigatorScreenParams } from "@react-navigation/native";

/**
 * Auth stack parameter list
 */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: { fromGuest?: boolean } | undefined;
  Register: { fromGuest?: boolean } | undefined;
  PrivacyPolicy: undefined;
};

/**
 * Tab navigator parameter list
 */
export type TabParamList = {
  Home: undefined;
  Style: { tab?: boolean } | undefined;
  ToLet: { purpose?: string; lockedPurpose?: boolean } | undefined;
  Profile: undefined;
  /** Hidden from the footer bar, still reachable from Home / cards. */
  Explore: { search?: string; purpose?: string; category?: string; lockedPurpose?: boolean } | undefined;
  Stays: undefined;
  Bookings: undefined;
};

/**
 * Main stack parameter list (after authentication)
 */
export type MainStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  PropertyDetail: { id: string | number };
  StayDetail: { id: string | number };
  BookingDetail: { id: string };
  Wishlist: undefined;
  Notifications: undefined;
  MyInquiries: undefined;
  EditProfile: undefined;
  Experts: undefined;
  /** Style expert profile (web: /style/:id). */
  ExpertDetail: { id: string };
  AiChat: { seedMessage?: string } | undefined;
  /** Also reachable from guest mode as modals, so guests can upgrade in place. */
  Login: { fromGuest?: boolean } | undefined;
  Register: { fromGuest?: boolean } | undefined;
  PrivacyPolicy: undefined;
};

/**
 * Root parameter list (includes both auth and main stacks)
 */
export type RootStackParamList = AuthStackParamList & MainStackParamList;

/**
 * Type helper for navigation props
 */
export type NavigationProp<T extends keyof RootStackParamList> = {
  navigate: (name: T, params?: RootStackParamList[T]) => void;
  goBack: () => void;
  replace: (name: T, params?: RootStackParamList[T]) => void;
  push: (name: T, params?: RootStackParamList[T]) => void;
};