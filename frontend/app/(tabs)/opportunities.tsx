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
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { MOCK_OPPORTUNITIES, Opportunity } from '../../data/mockOpportunities';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    return `$${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Opportunities</Text>
          <Text style={styles.headerSubtitle}>Vote on monthly curated investments</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['All', 'Open', 'Closed', 'Funded'] as FilterType[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, filter === item && styles.filterChipActive]}
                onPress={() => setFilter(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Opportunities List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {filteredOpportunities.map((opportunity) => (
            <TouchableOpacity key={opportunity.id} activeOpacity={0.9} onPress={() => router.push(`/opportunity/${opportunity.id}`)}>
              <OpportunityCard opportunity={opportunity} formatAmount={formatAmount} />
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function OpportunityCard({ opportunity, formatAmount }: { opportunity: Opportunity; formatAmount: (n: number) => string }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return COLORS.success;
      case 'Closed': return COLORS.textTertiary;
      case 'Funded': return COLORS.primary;
      default: return COLORS.textTertiary;
    }
  };

  const totalVotes = opportunity.votesYes + opportunity.votesNo;
  const yesPercentage = totalVotes > 0 ? (opportunity.votesYes / totalVotes) * 100 : 0;

  return (
    <View style={styles.card}>
      <Image source={{ uri: opportunity.videoThumbnail }} style={styles.cardImage} />
      <LinearGradient colors={['transparent', COLORS.background]} style={styles.cardImageOverlay} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.companyName}>{opportunity.companyName}</Text>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText}>{opportunity.sector}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(opportunity.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(opportunity.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(opportunity.status) }]}>{opportunity.status}</Text>
          </View>
        </View>

        <Text style={styles.pitch} numberOfLines={2}>{opportunity.pitch}</Text>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Ionicons name="rocket" size={15} color={COLORS.primary} />
            <Text style={styles.metricText}>{opportunity.stage}</Text>
          </View>
          <View style={styles.metric}>
            <Ionicons name="cash" size={15} color={COLORS.warning} />
            <Text style={styles.metricText}>{formatAmount(opportunity.requestedAmount)}</Text>
          </View>
        </View>

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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, marginBottom: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  filterContainer: { marginBottom: SPACING.md },
  filterScroll: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, gap: SPACING.lg },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardImage: { width: '100%', height: 170, resizeMode: 'cover' },
  cardImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 170 },
  cardContent: { padding: SPACING.base },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  cardHeaderLeft: { flex: 1, gap: SPACING.xs },
  companyName: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  sectorBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.mediumBlue },
  sectorText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: BORDER_RADIUS.sm, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.bold },
  pitch: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  metrics: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary, fontWeight: FONT_WEIGHTS.semibold },
  votingSection: { paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  votingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  votingLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  votingPercentage: { fontSize: FONT_SIZES.xs, color: COLORS.success, fontWeight: FONT_WEIGHTS.bold },
  progressBarContainer: { height: 5, backgroundColor: COLORS.mediumGray, borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
});
