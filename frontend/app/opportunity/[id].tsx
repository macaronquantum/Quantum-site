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
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
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
    if (opp) {
      setOpportunity(opp);
    }
    loadUserVote();
  }, [id]);

  const loadUserVote = async () => {
    try {
      const vote = await AsyncStorage.getItem(`vote_${id}`);
      if (vote) {
        setUserVote(vote as 'yes' | 'no');
      }
    } catch (error) {
      console.error('Error loading vote:', error);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (!connected) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to vote.');
      return;
    }

    if (userVote) {
      Alert.alert('Already Voted', 'You have already cast your vote for this opportunity.');
      return;
    }

    try {
      await AsyncStorage.setItem(`vote_${id}`, vote);
      setUserVote(vote);
      Alert.alert(
        'Vote Recorded',
        `Your vote of ${votingPower.toLocaleString()} voting power has been recorded for ${vote.toUpperCase()}.`
      );
    } catch (error) {
      console.error('Error saving vote:', error);
      Alert.alert('Error', 'Failed to record your vote. Please try again.');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header with Image */}
      <View style={styles.headerImageContainer}>
        <Image
          source={{ uri: opportunity.videoThumbnail }}
          style={styles.headerImage}
        />
        <LinearGradient
          colors={['transparent', COLORS.black]}
          style={styles.headerImageOverlay}
        />
        
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* Play Button Overlay */}
        <View style={styles.playButtonContainer}>
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
            <Ionicons name="play" size={32} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.playButtonLabel}>Pitch Video</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Company Header */}
        <View style={styles.companyHeader}>
          <View style={styles.companyHeaderTop}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{opportunity.companyName}</Text>
              <View style={styles.companyMeta}>
                <View style={styles.sectorBadge}>
                  <Text style={styles.sectorText}>{opportunity.sector}</Text>
                </View>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.metaText}>{opportunity.stage}</Text>
              </View>
            </View>
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

        {/* Financial Data */}
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
            <Image
              source={{ uri: opportunity.founderVideoThumbnail }}
              style={styles.founderVideoImage}
            />
            <TouchableOpacity style={styles.founderPlayButton} activeOpacity={0.8}>
              <Ionicons name="play-circle" size={64} color={COLORS.white} />
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
                <View style={styles.roadmapLine} />
                <Text style={styles.roadmapText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Voting Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAO Voting</Text>
          
          {/* Voting Power Display */}
          {connected && (
            <View style={styles.votingPowerCard}>
              <Ionicons name="flash" size={24} color={COLORS.gold} />
              <View style={styles.votingPowerInfo}>
                <Text style={styles.votingPowerLabel}>Your Voting Power</Text>
                <Text style={styles.votingPowerValue}>{formatNumber(votingPower)}</Text>
              </View>
            </View>
          )}

          {/* Vote Progress */}
          <View style={styles.voteProgressCard}>
            <View style={styles.voteProgressHeader}>
              <Text style={styles.voteProgressTitle}>Current Results</Text>
              <Text style={styles.voteDeadline}>
                Ends {format(opportunity.votingDeadline, 'MMM dd, yyyy')}
              </Text>
            </View>
            
            <View style={styles.voteStats}>
              <View style={styles.voteStat}>
                <Text style={styles.voteStatValue}>{yesPercentage.toFixed(1)}%</Text>
                <Text style={styles.voteStatLabel}>YES ({formatNumber(opportunity.votesYes)})</Text>
              </View>
              <View style={styles.voteStat}>
                <Text style={[styles.voteStatValue, { color: COLORS.error }]}>{noPercentage.toFixed(1)}%</Text>
                <Text style={styles.voteStatLabel}>NO ({formatNumber(opportunity.votesNo)})</Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarYes, { width: `${yesPercentage}%` }]} />
              <View style={[styles.progressBarNo, { width: `${noPercentage}%` }]} />
            </View>
          </View>

          {/* Vote Buttons */}
          {opportunity.status === 'Open' && (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[
                  styles.voteButton,
                  userVote === 'yes' && styles.voteButtonActive,
                ]}
                onPress={() => handleVote('yes')}
                disabled={!!userVote}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    userVote === 'yes'
                      ? [COLORS.success, COLORS.success]
                      : [COLORS.glassLight, COLORS.glassLight]
                  }
                  style={styles.voteButtonGradient}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={userVote === 'yes' ? COLORS.white : COLORS.success}
                  />
                  <Text
                    style={[
                      styles.voteButtonText,
                      userVote === 'yes' && styles.voteButtonTextActive,
                    ]}
                  >
                    {userVote === 'yes' ? 'Voted YES' : 'Vote YES'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteButton,
                  userVote === 'no' && styles.voteButtonActive,
                ]}
                onPress={() => handleVote('no')}
                disabled={!!userVote}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    userVote === 'no'
                      ? [COLORS.error, COLORS.error]
                      : [COLORS.glassLight, COLORS.glassLight]
                  }
                  style={styles.voteButtonGradient}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={userVote === 'no' ? COLORS.white : COLORS.error}
                  />
                  <Text
                    style={[
                      styles.voteButtonText,
                      userVote === 'no' && styles.voteButtonTextActive,
                    ]}
                  >
                    {userVote === 'no' ? 'Voted NO' : 'Vote NO'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {opportunity.status !== 'Open' && (
            <View style={styles.closedBanner}>
              <Ionicons name="lock-closed" size={20} color={COLORS.lightGray} />
              <Text style={styles.closedBannerText}>Voting is {opportunity.status.toLowerCase()}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function FinancialItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.financialItem}>
      <Ionicons name={icon} size={20} color={COLORS.electricBlue} />
      <View style={styles.financialItemContent}>
        <Text style={styles.financialLabel}>{label}</Text>
        <Text style={styles.financialValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  loadingText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
  },
  headerImageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  playButtonLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  companyHeader: {
    marginBottom: SPACING.xl,
  },
  companyHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  companyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectorBadge: {
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
  metaSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  overview: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    lineHeight: 24,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  metricValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.electricBlue,
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  financialGrid: {
    gap: SPACING.sm,
  },
  financialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  financialItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  financialValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  founderVideoCard: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  founderVideoImage: {
    width: '100%',
    height: '100%',
  },
  founderPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
  },
  roadmapContainer: {
    gap: SPACING.md,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  roadmapDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.electricBlue,
    marginRight: SPACING.md,
    marginTop: 4,
    zIndex: 2,
  },
  roadmapLine: {
    position: 'absolute',
    left: 5.5,
    top: 16,
    bottom: -16,
    width: 1,
    backgroundColor: COLORS.border,
    zIndex: 1,
  },
  roadmapText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    lineHeight: 20,
  },
  votingPowerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  votingPowerInfo: {
    flex: 1,
  },
  votingPowerLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    marginBottom: 4,
  },
  votingPowerValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.gold,
  },
  voteProgressCard: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  voteProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  voteProgressTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  voteDeadline: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
  voteStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  voteStat: {
    alignItems: 'center',
  },
  voteStatValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.success,
    marginBottom: 4,
  },
  voteStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 8,
    backgroundColor: COLORS.mediumGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarYes: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  progressBarNo: {
    height: '100%',
    backgroundColor: COLORS.error,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  voteButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  voteButtonActive: {
    borderColor: 'transparent',
  },
  voteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  voteButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  voteButtonTextActive: {
    color: COLORS.white,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  closedBannerText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    fontWeight: '600',
  },
});
