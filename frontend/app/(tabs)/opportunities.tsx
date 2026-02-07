import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { MOCK_OPPORTUNITIES, Opportunity } from '../../data/mockOpportunities';
import { StatusBar } from 'expo-status-bar';

type FilterType = 'All' | 'Open' | 'Closed' | 'Funded';

export default function Opportunities() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('All');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const filteredOpportunities = MOCK_OPPORTUNITIES.filter((opp) => {
    if (filter === 'All') return true;
    return opp.status === filter;
  });

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <LinearGradient
      colors={[COLORS.black, COLORS.darkBlue]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Opportunities</Text>
        <Text style={styles.headerSubtitle}>Vote on monthly curated investments</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(['All', 'Open', 'Closed', 'Funded'] as FilterType[]).map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterChip,
                filter === item && styles.filterChipActive,
              ]}
              onPress={() => setFilter(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Opportunities List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.electricBlue}
          />
        }
      >
        {filteredOpportunities.map((opportunity) => (
          <TouchableOpacity
            key={opportunity.id}
            activeOpacity={0.9}
            onPress={() => router.push(`/opportunity/${opportunity.id}`)}
          >
            <OpportunityCard opportunity={opportunity} formatAmount={formatAmount} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

function OpportunityCard({
  opportunity,
  formatAmount,
}: {
  opportunity: Opportunity;
  formatAmount: (n: number) => string;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return COLORS.success;
      case 'Closed':
        return COLORS.lightGray;
      case 'Funded':
        return COLORS.electricBlue;
      default:
        return COLORS.lightGray;
    }
  };

  const totalVotes = opportunity.votesYes + opportunity.votesNo;
  const yesPercentage = totalVotes > 0 ? (opportunity.votesYes / totalVotes) * 100 : 0;

  return (
    <View style={styles.card}>
      {/* Image */}
      <Image
        source={{ uri: opportunity.videoThumbnail }}
        style={styles.cardImage}
      />
      <LinearGradient
        colors={['transparent', COLORS.darkBlue]}
        style={styles.cardImageOverlay}
      />

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.companyName}>{opportunity.companyName}</Text>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText}>{opportunity.sector}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(opportunity.status) + '20' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(opportunity.status) },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(opportunity.status) },
              ]}
            >
              {opportunity.status}
            </Text>
          </View>
        </View>

        {/* Pitch */}
        <Text style={styles.pitch} numberOfLines={2}>
          {opportunity.pitch}
        </Text>

        {/* Metrics */}
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Ionicons name="rocket" size={16} color={COLORS.electricBlue} />
            <Text style={styles.metricText}>{opportunity.stage}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="cash" size={16} color={COLORS.gold} />
            <Text style={styles.metricText}>{formatAmount(opportunity.requestedAmount)}</Text>
          </View>
        </View>

        {/* Voting Progress */}
        {opportunity.status === 'Open' && (
          <View style={styles.votingSection}>
            <View style={styles.votingHeader}>
              <Text style={styles.votingLabel}>Community Vote</Text>
              <Text style={styles.votingPercentage}>{yesPercentage.toFixed(1)}% YES</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${yesPercentage}%` }]} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  filterContainer: {
    marginBottom: SPACING.md,
  },
  filterScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.electricBlue,
    borderColor: COLORS.electricBlue,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.lightGray,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: SPACING.xs,
  },
  companyName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  sectorBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.mediumBlue,
  },
  sectorText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.electricBlue,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
  pitch: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  votingSection: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  votingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  votingLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
  votingPercentage: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
});
