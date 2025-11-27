// 🌐 Expo-Compatible Multilingual Dictionary
// ✅ Works in Expo Go (Android, iOS, Web)
// 🚫 No native modules or API integration

export interface CommonTranslations {
  welcome: string;
  login: string;
  logout: string;
  dashboard: string;
  profile: string;
  settings: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  filter: string;
  export: string;
  import: string;
  submit: string;
  back: string;
  next: string;
  previous: string;
  loading: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  confirm: string;
  yes: string;
  no: string;
  select: string;
  all: string;
  none: string;
  date: string;
  time: string;
  status: string;
  action: string;
  actions: string;
  view: string;
  download: string;
  upload: string;
  close: string;
  open: string;
  language: string;
}

export interface AuthTranslations {
  loginTitle: string;
  email: string;
  otp: string;
  sendOtp: string;
  resendOtp: string;
  verifyOtp: string;
  invalidEmail: string;
  invalidOtp: string;
  otpSent: string;
  loginSuccess: string;
  logoutSuccess: string;
}

export interface TranslationObject {
  common: CommonTranslations;
  auth: AuthTranslations;
  roles: Record<string, string>;
  navigation: Record<string, string>;
  attendance: Record<string, string>;
}

// ✅ Translation Data (No API required)
export const translations = {
  en: {
    common: {
      welcome: "Welcome",
      login: "Login",
      logout: "Logout",
      dashboard: "Dashboard",
      profile: "Profile",
      settings: "Settings",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      filter: "Filter",
      export: "Export",
      import: "Import",
      submit: "Submit",
      back: "Back",
      next: "Next",
      previous: "Previous",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      warning: "Warning",
      info: "Info",
      confirm: "Confirm",
      yes: "Yes",
      no: "No",
      select: "Select",
      all: "All",
      none: "None",
      date: "Date",
      time: "Time",
      status: "Status",
      action: "Action",
      actions: "Actions",
      view: "View",
      download: "Download",
      upload: "Upload",
      close: "Close",
      open: "Open",
      language: "Language",
    },
    auth: {
      loginTitle: "Login to Shekru Labs India",
      email: "Email Address",
      otp: "OTP Code",
      sendOtp: "Send OTP",
      resendOtp: "Resend OTP",
      verifyOtp: "Verify OTP",
      invalidEmail: "Invalid email address",
      invalidOtp: "Invalid OTP code",
      otpSent: "OTP sent to your email",
      loginSuccess: "Login successful",
      logoutSuccess: "Logged out successfully",
    },
    roles: {
      admin: "Admin",
      hr: "HR",
      manager: "Manager",
      team_lead: "Team Lead",
      employee: "Employee",
    },
    navigation: {
      home: "Home",
      attendance: "Attendance",
      leaves: "Leaves",
      tasks: "Tasks",
      employees: "Employees",
      departments: "Departments",
      reports: "Reports",
      notifications: "Notifications",
      help: "Help",
    },
    attendance: {
      checkIn: "Check In",
      checkOut: "Check Out",
      checkedIn: "Checked in successfully",
      checkedOut: "Checked out successfully",
      todayStatus: "Today's Status",
      history: "Attendance History",
      selfie: "Take Selfie",
      location: "Location",
      todayAttendance: "Today's Attendance",
      weeklyReport: "Weekly Report",
      monthlyReport: "Monthly Report",
      present: "Present",
      absent: "Absent",
      late: "Late",
      halfDay: "Half Day",
      holiday: "Holiday",
      weekend: "Weekend",
      workHours: "Work Hours",
      overtime: "Overtime",
      earlyCheckout: "Early Checkout",
      capturePhoto: "Capture Photo",
      retake: "Retake",
      usePhoto: "Use Photo",
      locationRequired: "Location access required",
      cameraRequired: "Camera access required",
    },
  },

  hi: {
    common: {
      welcome: "स्वागत है",
      login: "लॉगिन",
      logout: "लॉगआउट",
      dashboard: "डैशबोर्ड",
      profile: "प्रोफ़ाइल",
      settings: "सेटिंग्स",
      save: "सहेजें",
      cancel: "रद्द करें",
      delete: "हटाएं",
      edit: "संपादित करें",
      add: "जोड़ें",
      search: "खोजें",
      filter: "फ़िल्टर",
      export: "निर्यात करें",
      import: "आयात करें",
      submit: "सबमिट करें",
      back: "वापस",
      next: "आगे",
      previous: "पिछला",
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफलता",
      warning: "चेतावनी",
      info: "जानकारी",
      confirm: "पुष्टि करें",
      yes: "हाँ",
      no: "नहीं",
      select: "चुनें",
      all: "सभी",
      none: "कोई नहीं",
      date: "तारीख",
      time: "समय",
      status: "स्थिति",
      action: "क्रिया",
      actions: "क्रियाएँ",
      view: "देखें",
      download: "डाउनलोड",
      upload: "अपलोड",
      close: "बंद करें",
      open: "खोलें",
      language: "भाषा",
    },
    auth: {
      loginTitle: "शेकुरु लैब्स इंडिया में लॉगिन करें",
      email: "ईमेल पता",
      otp: "ओटीपी कोड",
      sendOtp: "ओटीपी भेजें",
      resendOtp: "ओटीपी पुनः भेजें",
      verifyOtp: "ओटीपी सत्यापित करें",
      invalidEmail: "अमान्य ईमेल पता",
      invalidOtp: "अमान्य ओटीपी कोड",
      otpSent: "आपके ईमेल पर ओटीपी भेजा गया है",
      loginSuccess: "लॉगिन सफल हुआ",
      logoutSuccess: "लॉगआउट सफल हुआ",
    },
    roles: {
      admin: "प्रशासक",
      hr: "एचआर प्रबंधक",
      manager: "प्रबंधक",
      team_lead: "टीम लीड",
      employee: "कर्मचारी",
    },
    navigation: {
      home: "होम",
      attendance: "उपस्थिति",
      leaves: "छुट्टियाँ",
      tasks: "कार्य",
      employees: "कर्मचारी",
      departments: "विभाग",
      reports: "रिपोर्ट",
      notifications: "सूचनाएँ",
      help: "सहायता",
    },
    attendance: {
      checkIn: "चेक इन करें",
      checkOut: "चेक आउट करें",
      checkedIn: "चेक-इन सफल हुआ",
      checkedOut: "चेक-आउट सफल हुआ",
      todayStatus: "आज की स्थिति",
      history: "उपस्थिति इतिहास",
      selfie: "सेल्फी लें",
      location: "स्थान",
      todayAttendance: "आज की उपस्थिति",
      weeklyReport: "साप्ताहिक रिपोर्ट",
      monthlyReport: "मासिक रिपोर्ट",
      present: "उपस्थित",
      absent: "अनुपस्थित",
      late: "देरी से",
      halfDay: "आधा दिन",
      holiday: "छुट्टी",
      weekend: "सप्ताहांत",
      workHours: "कार्य घंटे",
      overtime: "ओवरटाइम",
      earlyCheckout: "जल्दी चेक-आउट",
      capturePhoto: "फोटो कैप्चर करें",
      retake: "पुनः लें",
      usePhoto: "फोटो का उपयोग करें",
      locationRequired: "स्थान की अनुमति आवश्यक है",
      cameraRequired: "कैमरा अनुमति आवश्यक है",
    },
  },

  mr: {
    common: {
      welcome: "स्वागत आहे",
      login: "लॉगिन",
      logout: "लॉगआउट",
      dashboard: "डॅशबोर्ड",
      profile: "प्रोफाइल",
      settings: "सेटिंग्ज",
      save: "जतन करा",
      cancel: "रद्द करा",
      delete: "हटवा",
      edit: "संपादित करा",
      add: "जोडा",
      search: "शोधा",
      filter: "फिल्टर करा",
      export: "निर्यात करा",
      import: "आयात करा",
      submit: "सबमिट करा",
      back: "मागे",
      next: "पुढे",
      previous: "मागील",
      loading: "लोड होत आहे...",
      error: "त्रुटी",
      success: "यशस्वी",
      warning: "इशारा",
      info: "माहिती",
      confirm: "पुष्टी करा",
      yes: "होय",
      no: "नाही",
      select: "निवडा",
      all: "सर्व",
      none: "काहीही नाही",
      date: "तारीख",
      time: "वेळ",
      status: "स्थिती",
      action: "क्रिया",
      actions: "क्रिया",
      view: "पहा",
      download: "डाउनलोड करा",
      upload: "अपलोड करा",
      close: "बंद करा",
      open: "उघडा",
      language: "भाषा",
    },
    auth: {
      loginTitle: "शेकुरू लॅब्स इंडियामध्ये लॉगिन करा",
      email: "ईमेल पत्ता",
      otp: "ओटीपी कोड",
      sendOtp: "ओटीपी पाठवा",
      resendOtp: "ओटीपी पुन्हा पाठवा",
      verifyOtp: "ओटीपी सत्यापित करा",
      invalidEmail: "अवैध ईमेल पत्ता",
      invalidOtp: "अवैध ओटीपी कोड",
      otpSent: "तुमच्या ईमेलवर ओटीपी पाठवला गेला आहे",
      loginSuccess: "लॉगिन यशस्वी",
      logoutSuccess: "लॉगआउट यशस्वी",
    },
    roles: {
      admin: "प्रशासक",
      hr: "एचआर व्यवस्थापक",
      manager: "व्यवस्थापक",
      team_lead: "टीम लीड",
      employee: "कर्मचारी",
    },
    navigation: {
      home: "मुख्यपृष्ठ",
      attendance: "उपस्थिती",
      leaves: "रजा",
      tasks: "कार्ये",
      employees: "कर्मचारी",
      departments: "विभाग",
      reports: "अहवाल",
      notifications: "सूचना",
      help: "मदत",
    },
    attendance: {
      checkIn: "चेक इन करा",
      checkOut: "चेक आउट करा",
      checkedIn: "चेक-इन यशस्वी",
      checkedOut: "चेक-आउट यशस्वी",
      todayStatus: "आजची स्थिती",
      history: "उपस्थिती इतिहास",
      selfie: "सेल्फी घ्या",
      location: "स्थान",
      todayAttendance: "आजची उपस्थिती",
      weeklyReport: "साप्ताहिक अहवाल",
      monthlyReport: "मासिक अहवाल",
      present: "उपस्थित",
      absent: "अनुपस्थित",
      late: "उशिरा",
      halfDay: "अर्धा दिवस",
      holiday: "सुट्टी",
      weekend: "साप्ताहिक सुट्टी",
      workHours: "कामाचे तास",
      overtime: "जादा वेळ",
      earlyCheckout: "लवकर चेक-आउट",
      capturePhoto: "फोटो घ्या",
      retake: "पुन्हा घ्या",
      usePhoto: "फोटो वापरा",
      locationRequired: "स्थान परवानगी आवश्यक आहे",
      cameraRequired: "कॅमेरा परवानगी आवश्यक आहे",
    },
  },
} as const;

// ✅ Type Definitions
export type Translations = typeof translations;
export type Language = keyof Translations;
export type TranslationKey = {
  common: Record<keyof CommonTranslations, string>;
  auth: Record<keyof AuthTranslations, string>;
  roles: Record<string, string>;
  navigation: Record<string, string>;
  attendance: Record<string, string>;
};

// ✅ Expo-Safe Fallback Translator
export const t = (lang: Language, path: string): string => {
  try {
    const keys = path.split(".");
    let value: any = translations[lang];

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (typeof value === "string") return value;

    // 🔁 Fallback to English
    let fallback: any = translations.en;
    for (const key of keys) {
      fallback = fallback?.[key];
      if (fallback === undefined) break;
    }

    return typeof fallback === "string" ? fallback : path;
  } catch {
    return path;
  }
};
