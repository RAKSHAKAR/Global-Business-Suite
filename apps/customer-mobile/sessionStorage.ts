import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSessionStorage } from "./mobileSession";

const storageAdapter = Platform.OS === "web"
  ? { getItem: (key: string) => AsyncStorage.getItem(key), setItem: (key: string, value: string) => AsyncStorage.setItem(key, value), removeItem: (key: string) => AsyncStorage.removeItem(key) }
  : { getItem: (key: string) => SecureStore.getItemAsync(key), setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }), removeItem: (key: string) => SecureStore.deleteItemAsync(key) };

export const mobileSessionStorage = createSessionStorage(storageAdapter);
