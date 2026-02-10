import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { MOCK_OPPORTUNITIES, Opportunity } from '../../data/mockOpportunities';
import { useWallet } from '../../contexts/WalletContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function OpportunityDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { connected, votingPower } = useWallet();
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);

  useEffect(() => {
    const opp = MOCK_OPPORTUNITIES.find((o) => o.id === id);
    if (opp) setOpportunity(opp);
    loadUserVote();
  }, [id]);

  const loadUserVote = async () => {
    try {
      const vote = await AsyncStorage.getItem(`vote_${id}`);
      if (vote) setUserVote(vote as 'yes' | 'no');
    } catch (error) {
      console.error('Error loading vote:', error);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!connected) {
      Alert.alert('Wallet Required', 'Please connect your wallet to vote.');
      return;
    }
    if (userVote) {
      Alert.alert('Already Voted', 'You have already voted on this opportunity.');
      return;
    }
    try {
      await AsyncStorage.setItem(`vote_${id}`, vote);
      setUserVote(vote);
      Alert.alert('Vote Recorded', `Your ${votingPower.toLocaleString()} voting power has been applied to ${vote.toUpperCase()}.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to record your vote.');
    }
  };

  if (!opportunity) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const totalVotes = opportunity.votesYes + opportunity.votesNo;
  const yesPercentage = totalVotes > 0 ? (opportunity.votesYes / totalVotes) * 100 : 0;
  const noPercentage = 100 - yesPercentage;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header Image */}
      <View style={styles.headerImageContainer}>
        <Image source={{ uri: opportunity.videoThumbnail }} style={styles.headerImage} />
        <LinearGradient colors={['transparent', COLORS.background]} style={styles.headerImageOverlay} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <Text style={styles.companyName}>{opportunity.companyName}</Text>
          <View style={styles.companyMeta}>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText}>{opportunity.sector}</Text>
            </View>
            <Text style={styles.metaSeparator}>•</Text>
            <Text style={styles.metaText}>{opportunity.stage}</Text>
          </View>
          <Text style={styles.overview}>{opportunity.overview}</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {opportunity.keyMetrics.map((metric, index) => (
              <View key={index} style={styles.metricCard}>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Financials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financials</Text>
          <View style={styles.financialGrid}>
            <FinancialItem icon="trending-up" label="Revenue" value={formatCurrency(opportunity.revenue)} />
            <FinancialItem icon="stats-chart" label="Growth" value={`${opportunity.growth}%`} />
            <FinancialItem icon="flame" label="Burn Rate" value={`${formatCurrency(opportunity.burnRate)}/mo`} />
            <FinancialItem icon="business" label="Valuation" value={formatCurrency(opportunity.valuation)} />
            <FinancialItem icon="calendar" label="Founded" value={opportunity.founded} />
            <FinancialItem icon="people" label="Team Size" value={`${opportunity.team} people`} />
          </View>
        </View>

        {/* Founder Video */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meet the Founder</Text>
          <View style={styles.founderVideoCard}>
            <Image source={{ uri: opportunity.founderVideoThumbnail }} style={styles.founderVideoImage} />
            <TouchableOpacity style={styles.founderPlayButton} activeOpacity={0.8}>
              <Ionicons name="play-circle" size={56} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Roadmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roadmap</Text>
          <View style={styles.roadmapContainer}>
            {opportunity.roadmap.map((item, index) => (
              <View key={index} style={styles.roadmapItem}>
                <View style={styles.roadmapDot} />
                {index < opportunity.roadmap.length - 1 && <View style={styles.roadmapLine} />}
                <Text style={styles.roadmapText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* DAO Voting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAO Voting</Text>

          {connected && (
            <View style={styles.votingPowerCard}>
              <Ionicons name="flash" size={22} color={COLORS.warning} />
              <View style={styles.votingPowerInfo}>
                <Text style={styles.votingPowerLabel}>Your Voting Power</Text>
                <Text style={styles.votingPowerValue}>{formatNumber(votingPower)}</Text>
              </View>
            </View>
          )}

          <View style={styles.voteProgressCard}>
            <View style={styles.voteProgressHeader}>
              <Text style={styles.voteProgressTitle}>Current Results</Text>
              <Text style={styles.voteDeadline}>Ends {format(opportunity.votingDeadline, 'MMM dd, yyyy')}</Text>
            </View>
            <View style={styles.voteStats}>
              <View style={styles.voteStat}>
                <Text style={styles.voteStatValueYes}>{yesPercentage.toFixed(1)}%</Text>
                <Text style={styles.voteStatLabel}>YES ({formatNumber(opportunity.votesYes)})</Text>
              </View>
              <View style={styles.voteStat}>
                <Text style={styles.voteStatValueNo}>{noPercentage.toFixed(1)}%</Text>
                <Text style={styles.voteStatLabel}>NO ({formatNumber(opportunity.votesNo)})</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarYes, { width: `${yesPercentage}%` }]} />
              <View style={[styles.progressBarNo, { width: `${noPercentage}%` }]} />
            </View>
          </View>

          {opportunity.status === 'Open' && (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteButton, userVote === 'yes' && styles.voteButtonActiveYes]}
                onPress={() => handleVote('yes')}
                disabled={!!userVote}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={22} color={userVote === 'yes' ? COLORS.textPrimary : COLORS.success} />
                <Text style={[styles.voteButtonText, userVote === 'yes' && { color: COLORS.textPrimary }]}>
                  {userVote === 'yes' ? 'Voted YES' : 'Vote YES'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteButton, userVote === 'no' && styles.voteButtonActiveNo]}
                onPress={() => handleVote('no')}
                disabled={!!userVote}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={22} color={userVote === 'no' ? COLORS.textPrimary : COLORS.error} />
                <Text style={[styles.voteButtonText, userVote === 'no' && { color: COLORS.textPrimary }]}>
                  {userVote === 'no' ? 'Voted NO' : 'Vote NO'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {opportunity.status !== 'Open' && (
            <View style={styles.closedBanner}>
              <Ionicons name="lock-closed" size={18} color={COLORS.textSecondary} />
              <Text style={styles.closedBannerText}>Voting is {opportunity.status.toLowerCase()}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function FinancialItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.financialItem}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <View style={styles.financialItemContent}>
        <Text style={styles.financialLabel}>{label}</Text>
        <Text style={styles.financialValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md },
  headerImageContainer: { width: '100%', height: 280, position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  headerImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  backButton: { position: 'absolute', top: 50, left: SPACING.base },
  backButtonInner: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  companyHeader: { marginBottom: SPACING.xl },
  companyName: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  companyMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectorBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.mediumBlue },
  sectorText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
  metaSeparator: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
  metaText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  overview: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 22 },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  metricCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  metricValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.primary, marginBottom: SPACING.xs },
  metricLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  financialGrid: { gap: SPACING.sm },
  financialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  financialItemContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financialLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  financialValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  founderVideoCard: { width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', position: 'relative' },
  founderVideoImage: { width: '100%', height: '100%' },
  founderPlayButton: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -28 }, { translateY: -28 }] },
  roadmapContainer: { gap: SPACING.md },
  roadmapItem: { flexDirection: 'row', alignItems: 'flex-start', position: 'relative' },
  roadmapDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginRight: SPACING.md, marginTop: 5, zIndex: 2 },
  roadmapLine: { position: 'absolute', left: 4.5, top: 15, bottom: -16, width: 1, backgroundColor: COLORS.border, zIndex: 1 },
  roadmapText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, lineHeight: 20 },
  votingPowerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  votingPowerInfo: { flex: 1 },
  votingPowerLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: 3 },
  votingPowerValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.warning },
  voteProgressCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  voteProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  voteProgressTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  voteDeadline: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  voteStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.md },
  voteStat: { alignItems: 'center' },
  voteStatValueYes: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.success, marginBottom: 3 },
  voteStatValueNo: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.error, marginBottom: 3 },
  voteStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  progressBarContainer: { flexDirection: 'row', height: 6, backgroundColor: COLORS.mediumGray, borderRadius: 3, overflow: 'hidden' },
  progressBarYes: { height: '100%', backgroundColor: COLORS.success },
  progressBarNo: { height: '100%', backgroundColor: COLORS.error },
  voteButtons: { flexDirection: 'row', gap: SPACING.md },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
  },
  voteButtonActiveYes: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  voteButtonActiveNo: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  voteButtonText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  closedBannerText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
});
