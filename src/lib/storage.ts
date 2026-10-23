import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** Shared persistence adapter for local (Stage 1) stores. */
export const persistStorage = createJSONStorage(() => AsyncStorage);

/** Bump when a persisted store's shape changes incompatibly. */
export const STORE_VERSION = 1;
