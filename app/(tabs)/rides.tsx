/**
 * LaMa Yatayat - Ride History Screen
 *
 * Displays a list of past rides with pull-to-refresh.
 */

import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, PRICING } from "@/constants/config";
import { useRideStore } from "@/stores/ride";
import type { Ride, RideStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: RideStatus): string {
  const map: Record<RideStatus, string> = {
    requested: "Requested",
    matching: "Finding Driver",
    matched: "Matched",
    driver_en_route: "Driver En Route",
    pickup_arrived: "Driver Arrived",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };
  return map[status] ?? status;
}

function statusColor(status: RideStatus): string {
  switch (status) {
    case "completed":
      return Colors.success;
    case "cancelled":
      return Colors.danger;
    case "in_progress":
    case "driver_en_route":
    case "pickup_arrived":
      return Colors.primary;
    case "matching":
      return Colors.warning;
    default:
      return Colors.warning;
  }
}

/* ------------------------------------------------------------------ */
/*  Ride Item                                                          */
/* ------------------------------------------------------------------ */

function RideItem({ ride }: { ride: Ride }) {
  return (
    <View style={styles.card}>
      {/* Date + status */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatDate(ride.created_at)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(ride.status) + "1A" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: statusColor(ride.status) }]}
          >
            {statusLabel(ride.status)}
          </Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
          <Text style={styles.routeAddress} numberOfLines={1}>
            {ride.pickup_addr || "Pickup"}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
          <Text style={styles.routeAddress} numberOfLines={1}>
            {ride.dropoff_addr || "Dropoff"}
          </Text>
        </View>
      </View>

      {/* Fare */}
      <View style={styles.fareRow}>
        <Text style={styles.fareLabel}>
          {ride.is_round_trip ? "Round-Trip" : "One-Way"}
        </Text>
        <Text style={styles.fareAmount}>
          {PRICING.currency}
          {ride.fare_amount?.toFixed(2) ?? "--"}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function RidesScreen() {
  const { rideHistory, fetchRideHistory, isLoading } = useRideStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchRideHistory();
    }, [fetchRideHistory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRideHistory();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Ride }) => <RideItem ride={item} />;

  const keyExtractor = (item: Ride) => item.id;

  if (isLoading && rideHistory.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rideHistory}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          rideHistory.length === 0 ? styles.emptyContainer : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptySubtext}>
              Your ride history will appear here once you complete your first
              trip.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightBg,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },

  /* Card */
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.gray,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  /* Route */
  route: {
    marginBottom: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  routeLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 4.5,
    marginVertical: 2,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.dark,
    flex: 1,
  },

  /* Fare */
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.gray,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.dark,
  },

  /* Empty state */
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: "center",
    lineHeight: 22,
  },
});
