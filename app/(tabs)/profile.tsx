/**
 * LaMa Yatayat - Profile Screen
 *
 * Displays the user's profile info with avatar initials,
 * sections for future features, and a logout button.
 */

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { useLocationStore } from "@/stores/location";
import { Colors } from "@/constants/config";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { stopWatching } = useLocationStore();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          stopWatching();
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Avatar + info */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user ? getInitials(user.name) : "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Rider"}</Text>
        <Text style={styles.email}>{user?.email ?? ""}</Text>
        {user?.phone ? (
          <Text style={styles.phone}>{user.phone}</Text>
        ) : null}

        {user?.rating !== undefined && user.rating > 0 ? (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStar}>{"\u2605"}</Text>
            <Text style={styles.ratingValue}>{user.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {/* Sections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>{"\u2616"}</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Payment Methods</Text>
            <Text style={styles.menuMeta}>Coming soon</Text>
          </View>
          <Text style={styles.menuChevron}>{"\u203A"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>{"\u266A"}</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Text style={styles.menuMeta}>Coming soon</Text>
          </View>
          <Text style={styles.menuChevron}>{"\u203A"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>{"\u2699"}</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Preferences</Text>
            <Text style={styles.menuMeta}>Coming soon</Text>
          </View>
          <Text style={styles.menuChevron}>{"\u203A"}</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>?</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Help Center</Text>
            <Text style={styles.menuMeta}>FAQs and support</Text>
          </View>
          <Text style={styles.menuChevron}>{"\u203A"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>{"\u2709"}</Text>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Contact Us</Text>
            <Text style={styles.menuMeta}>Get in touch</Text>
          </View>
          <Text style={styles.menuChevron}>{"\u203A"}</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>LaMa Yatayat v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },
  content: {
    paddingBottom: 40,
  },

  /* Profile card */
  profileCard: {
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark,
  },
  email: {
    fontSize: 15,
    color: Colors.gray,
    marginTop: 4,
  },
  phone: {
    fontSize: 15,
    color: Colors.gray,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: Colors.lightBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingStar: {
    fontSize: 16,
    color: Colors.warning,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.dark,
  },

  /* Sections */
  section: {
    marginTop: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  menuIcon: {
    fontSize: 20,
    color: Colors.gray,
    width: 32,
    textAlign: "center",
  },
  menuContent: {
    flex: 1,
    marginLeft: 8,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark,
  },
  menuMeta: {
    fontSize: 13,
    color: Colors.grayLight,
    marginTop: 1,
  },
  menuChevron: {
    fontSize: 24,
    color: Colors.grayLight,
    marginLeft: 8,
  },

  /* Logout */
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 28,
    height: 52,
    backgroundColor: Colors.danger,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },

  /* Version */
  version: {
    textAlign: "center",
    color: Colors.grayLight,
    fontSize: 13,
    marginTop: 20,
  },
});
