import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { translations, Language } from "../i18n/translations";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof translations.en>;

/**
 * 🌍 Context Type Definition
 */
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

/**
 * 🌐 Create Language Context
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * 🌐 Language Provider (Expo Compatible)
 * ✅ Works on Expo Go (Android, iOS, Web)
 * ✅ Auto-detects device language
 * ✅ Saves language preference using AsyncStorage
 * 🚫 No backend/API dependency
 */
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en");

  /**
   * 🧠 Load saved language or detect device language on mount
   */
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem("language");
        if (savedLang) {
          setLanguageState(savedLang as Language);
        } else {
          // 🌏 Auto-detect device locale (Expo-safe)
          const deviceLang = Localization.getLocales()[0].languageCode; // e.g. "en", "hi", "mr"
          const supportedLangs: Language[] = ["en", "hi", "mr"];
          const detectedLang = supportedLangs.includes(deviceLang as Language)
            ? (deviceLang as Language)
            : "en";
          setLanguageState(detectedLang);
        }
      } catch (error) {
        console.warn("⚠️ Failed to load or detect language:", error);
        setLanguageState("en"); // fallback
      }
    };

    initLanguage();
  }, []);

  /**
   * 💾 Save selected language to AsyncStorage
   */
  useEffect(() => {
    const saveLanguage = async () => {
      try {
        await AsyncStorage.setItem("language", language);
      } catch (error) {
        console.warn("⚠️ Failed to save language:", error);
      }
    };
    saveLanguage();
  }, [language]);

  /**
   * 🌏 Change language manually
   */
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  /**
   * 🗣️ Translation function (safe fallback)
   */
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, any>)[k];
      } else {
        // Fallback to English if translation not found
        const enValue = translations.en as Record<string, any>;
        value = enValue?.[k];
        if (!value) return key; // Return the key if not found in either language
      }
    }
    
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * 🧩 Custom Hook: useLanguage()
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
