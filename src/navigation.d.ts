import { NavigatorScreenParams } from "@react-navigation/native";
import type { NavigationProp as RNNavigationProp } from "@react-navigation/native";

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      // Auth stack
      Welcome: undefined;
      Login: undefined;
      Register: undefined;
      
      // Main stack
      Main: NavigatorScreenParams<TabParamList>;
      PropertyDetail: { id: string | number };
      StayDetail: { id: string | number };
      BookingDetail: { id: string };
      Wishlist: undefined;
      Notifications: undefined;
      MyInquiries: undefined;
      EditProfile: undefined;
      Experts: undefined;
      AiChat: { seedMessage?: string } | undefined;
    }

    interface TabParamList {
      Home: undefined;
      Style: { tab?: boolean } | undefined;
      ToLet: { purpose?: string; lockedPurpose?: boolean } | undefined;
      Profile: undefined;
      Explore: { search?: string; purpose?: string; category?: string; lockedPurpose?: boolean } | undefined;
      Stays: undefined;
      Bookings: undefined;
    }
  }
  
  // Extend the React Navigation NavigationProp to include replace method
  // This augments the type from @react-navigation/native
  type NavigationProp = RNNavigationProp<ReactNavigation.RootParamList> & {
    replace: (name: keyof ReactNavigation.RootParamList, params?: ReactNavigation.RootParamList[keyof ReactNavigation.RootParamList]) => void;
  };
}

export {};