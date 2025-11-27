import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Easing,
} from "react-native";
import { PanelLeft, X } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

/* -------------------- Sidebar Context -------------------- */
type SidebarContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
};

/* -------------------- Provider -------------------- */
export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(width < 768);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) =>
      setIsMobile(window.width < 768)
    );

    // ✅ Proper cleanup (Expo-safe)
    return () => subscription?.remove?.();
  }, []);

  const toggleSidebar = () => {
    if (isMobile) setMobileOpen((prev) => !prev);
    else setOpen((prev) => !prev);
  };

  return (
    <SidebarContext.Provider
      value={{ open, setOpen, mobileOpen, setMobileOpen, isMobile, toggleSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

/* -------------------- Sidebar -------------------- */
export const Sidebar = ({
  side = "left",
  width = 260,
  children,
  backgroundColor = "#111827",
  textColor = "#F9FAFB",
}: {
  side?: "left" | "right";
  width?: number;
  children: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}) => {
  const { open, mobileOpen, isMobile, setMobileOpen } = useSidebar();
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetValue = open ? 0 : side === "left" ? -width + 40 : width - 40;
    Animated.timing(translate, {
      toValue: targetValue,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [open]);

  // --- Mobile (Modal) Sidebar ---
  if (isMobile) {
    return (
      <Modal
        visible={mobileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMobileOpen(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setMobileOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalSidebar,
                  { width, backgroundColor },
                  side === "right" && { right: 0 },
                ]}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setMobileOpen(false)}
                >
                  <X color={textColor} size={24} />
                </TouchableOpacity>
                {children}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }

  // --- Desktop Sidebar ---
  return (
    <Animated.View
      style={[
        styles.sidebar,
        {
          width,
          backgroundColor,
          transform: [{ translateX: translate }],
          [side]: 0,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/* -------------------- Sub Components -------------------- */
export const SidebarHeader = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.header}>{children}</View>
);

export const SidebarContent = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.content}>{children}</View>
);

export const SidebarFooter = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.footer}>{children}</View>
);

export const SidebarTrigger = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <TouchableOpacity onPress={toggleSidebar} style={styles.trigger}>
      <PanelLeft color="#374151" size={24} />
    </TouchableOpacity>
  );
};

export const SidebarMenu = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.menu}>{children}</View>
);

export const SidebarMenuItem = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.menuItem,
      { backgroundColor: active ? "#374151" : "transparent" },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && <View style={styles.icon}>{icon}</View>}
    <Text style={[styles.menuText, { color: active ? "#F9FAFB" : "#D1D5DB" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* -------------------- Styles (Expo-Safe) -------------------- */
const styles = StyleSheet.create({
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 50,
    paddingVertical: 20,
    paddingHorizontal: 10,
    // ✅ Expo-safe shadows
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  modalSidebar: {
    height: height,
    padding: 20,
    position: "absolute",
    left: 0,
    top: 0,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 20,
  },
  header: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: "auto",
    borderTopWidth: 1,
    borderColor: "#1F2937",
    paddingTop: 12,
  },
  trigger: {
    padding: 8,
    margin: 8,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  menu: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  icon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default Sidebar;
