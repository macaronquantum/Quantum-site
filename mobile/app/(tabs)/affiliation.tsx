import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert, copyToClipboard as platformCopy } from '../../utils/platform';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Types
interface LevelStats {
  level: number;
  referral_count: number;
  total_commission: number;
  pending_commission: number;
  confirmed_commission: number;
  paid_commission: number;
}

interface AffiliateStats {
  wallet_public_key: string;
  referral_code: string;
  referral_link: string;
  total_referrals: number;
  total_earnings: number;
  pending_earnings: number;
  confirmed_earnings: number;
  paid_earnings: number;
  levels: LevelStats[];
}

interface LevelTransaction {
  id: string;
  source_wallet: string;
  amount: number;
  percentage: number;
  event_type: string;
  status: string;
  created_at: string;
}

interface AffiliateConfig {
  max_levels: number;
  commission_rates: Record<string, { percentage: number; decimal: number }>;
  total_commission_percentage: number;
}

// Commission rate display helper
const LEVEL_COLORS: Record<number, string> = {
  1: '#8B5CF6',
  2: '#A78BFA',
  3: '#10B981',
  4: '#F59E0B',
  5: '#6B7280',
};

const LEVEL_ICONS: Record<number, string> = {
  1: 'person',
  2: 'people',
  3: 'git-network',
  4: 'analytics',
  5: 'globe',
};

export default function Affiliation() {
  const { address, connected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [config, setConfig] = useState<AffiliateConfig | null>(null);
  
  // Level detail modal
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [levelTransactions, setLevelTransactions] = useState<LevelTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    if (!address) return;
    
    try {
      const [statsRes, configRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/affiliate/${address}/stats`),
        axios.get(`${BACKEND_URL}/api/affiliate/config`),
      ]);
      
      setStats(statsRes.data);
      setConfig(configRes.data);
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [address, connected, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const fetchLevelTransactions = async (level: number) => {
    if (!address) return;
    setLoadingTransactions(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/affiliate/${address}/level/${level}/transactions`);
      setLevelTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching level transactions:', error);
      setLevelTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const openLevelDetail = (level: number) => {
    setSelectedLevel(level);
    setLevelModalVisible(true);
    fetchLevelTransactions(level);
  };

  const copyToClipboard = async (text: string, label: string) => {
    const success = await platformCopy(text);
    if (success) {
      showAlert('Copié !', `${label} copié dans le presse-papiers`);
    } else {
      showAlert(label, text);
    }
  };

  const shareReferralLink = async () => {
    if (!stats?.referral_link) return;
    try {
      await Share.share({
        message: `Rejoins Quantum IA avec mon code: ${stats.referral_code}\n\n${stats.referral_link}`,
        title: 'Quantum IA - Parrainage',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatWallet = (wallet: string) => {
    if (!wallet || wallet.length <= 12) return wallet || '—';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Not connected state
  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="git-network-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.disconnectedTitle}>Programme d'Affiliation</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connectez votre wallet pour accéder à votre tableau de bord d'affiliation multi-niveau
          </Text>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>5 niveaux de commission</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Jusqu'à 38.5% de commission totale</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.featureText}>Suivi en temps réel</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.connectButton} 
            onPress={connectWallet}
            activeOpacity={0.8}
            data-testid="connect-wallet-btn"
          >
            <Ionicons name="wallet-outline" size={20} color={COLORS.textPrimary} />
            <Text style={styles.connectButtonText}>Connecter Wallet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Level Detail Modal
  const renderLevelModal = () => (
    <Modal
      visible={levelModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setLevelModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[
                styles.levelIconContainerModal, 
                { backgroundColor: `${LEVEL_COLORS[selectedLevel || 1]}20` }
              ]}>
                <Ionicons 
                  name={(LEVEL_ICONS[selectedLevel || 1] || 'ellipse') as any} 
                  size={20} 
                  color={LEVEL_COLORS[selectedLevel || 1]} 
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Niveau {selectedLevel}</Text>
                <Text style={styles.modalSubtitle}>
                  {config?.commission_rates[String(selectedLevel)]?.percentage || 0}% de commission
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setLevelModalVisible(false)}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {loadingTransactions ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : levelTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>Aucune transaction</Text>
              <Text style={styles.emptySubtitle}>
                Les commissions de niveau {selectedLevel} apparaîtront ici quand vos filleuls effectueront des achats
              </Text>
            </View>
          ) : (
            <FlatList
              data={levelTransactions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIconWrap}>
                      <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.transactionInfo}>
                      <TouchableOpacity 
                        onPress={() => copyToClipboard(item.source_wallet, 'Wallet')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.transactionWallet}>{formatWallet(item.source_wallet)}</Text>
                      </TouchableOpacity>
                      <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
                      <Text style={styles.transactionType}>
                        {item.event_type === 'presale_purchase' ? 'Achat Pre-Sale' : item.event_type}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>+${item.amount.toFixed(2)}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: item.status === 'paid' ? COLORS.success : 
                        item.status === 'confirmed' ? COLORS.primary : COLORS.warning }
                    ]}>
                      <Text style={styles.statusText}>
                        {item.status === 'paid' ? 'Payé' : 
                         item.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.transactionsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      {renderLevelModal()}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Programme MLM</Text>
          <Text style={styles.headerSubtitle}>Système multi-niveau à 5 niveaux</Text>
        </View>

        {/* Referral Code Card */}
        <View style={styles.referralCard} data-testid="referral-code-card">
          <View style={styles.referralHeader}>
            <View style={styles.referralIconContainer}>
              <Ionicons name="link" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.referralTitle}>Votre Code de Parrainage</Text>
              <Text style={styles.referralSubtitle}>Partagez pour gagner des commissions</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.codeContainer} 
            onPress={() => copyToClipboard(stats?.referral_code || '', 'Code')}
            activeOpacity={0.7}
            data-testid="referral-code-display"
          >
            <Text style={styles.codeText}>{stats?.referral_code || '—'}</Text>
            <Ionicons name="copy-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => copyToClipboard(stats?.referral_link || '', 'Lien')}
              activeOpacity={0.7}
              data-testid="copy-link-btn"
            >
              <Ionicons name="link-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Copier Lien</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={shareReferralLink}
              activeOpacity={0.7}
              data-testid="share-btn"
            >
              <Ionicons name="share-social-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Global Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vue Globale</Text>
          <View style={styles.globalStatsCard} data-testid="global-stats-card">
            <View style={styles.globalStatMain}>
              <Text style={styles.globalStatLabel}>Total Gagné</Text>
              <Text style={styles.globalStatValue}>${(stats?.total_earnings || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.globalStatsDivider} />
            <View style={styles.globalStatsRow}>
              <View style={styles.globalStatItem}>
                <View style={[styles.statusIndicator, { backgroundColor: COLORS.warning }]} />
                <View>
                  <Text style={styles.globalStatItemLabel}>En attente</Text>
                  <Text style={styles.globalStatItemValue}>${(stats?.pending_earnings || 0).toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.globalStatItem}>
                <View style={[styles.statusIndicator, { backgroundColor: COLORS.primary }]} />
                <View>
                  <Text style={styles.globalStatItemLabel}>Confirmé</Text>
                  <Text style={styles.globalStatItemValue}>${(stats?.confirmed_earnings || 0).toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.globalStatItem}>
                <View style={[styles.statusIndicator, { backgroundColor: COLORS.success }]} />
                <View>
                  <Text style={styles.globalStatItemLabel}>Payé</Text>
                  <Text style={styles.globalStatItemValue}>${(stats?.paid_earnings || 0).toFixed(2)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.totalReferralsRow}>
              <Ionicons name="people" size={18} color={COLORS.textSecondary} />
              <Text style={styles.totalReferralsText}>
                {stats?.total_referrals || 0} filleuls dans votre réseau
              </Text>
            </View>
          </View>
        </View>

        {/* Levels Breakdown - Clickable */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail par Niveau</Text>
          <Text style={styles.sectionHint}>Appuyez sur un niveau pour voir les transactions</Text>
          <View style={styles.levelsContainer}>
            {stats?.levels.map((level) => {
              const rate = config?.commission_rates[String(level.level)];
              const levelColor = LEVEL_COLORS[level.level] || COLORS.textSecondary;
              const levelIcon = LEVEL_ICONS[level.level] || 'ellipse';
              
              return (
                <TouchableOpacity 
                  key={level.level} 
                  style={styles.levelCard}
                  onPress={() => openLevelDetail(level.level)}
                  activeOpacity={0.7}
                  data-testid={`level-${level.level}-card`}
                >
                  <View style={styles.levelHeader}>
                    <View style={[styles.levelIconContainer, { backgroundColor: `${levelColor}20` }]}>
                      <Ionicons name={levelIcon as any} size={18} color={levelColor} />
                    </View>
                    <View style={styles.levelInfo}>
                      <Text style={styles.levelTitle}>Niveau {level.level}</Text>
                      <Text style={[styles.levelRate, { color: levelColor }]}>
                        {rate?.percentage || 0}% de commission
                      </Text>
                    </View>
                    <View style={styles.levelStats}>
                      <Text style={styles.levelStatValue}>{level.referral_count}</Text>
                      <Text style={styles.levelStatLabel}>filleuls</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                  </View>
                  
                  <View style={styles.levelCommissions}>
                    <View style={styles.levelCommissionItem}>
                      <Text style={styles.levelCommissionLabel}>Total</Text>
                      <Text style={styles.levelCommissionValue}>
                        ${level.total_commission.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.levelCommissionItem}>
                      <Text style={styles.levelCommissionLabel}>En attente</Text>
                      <Text style={[styles.levelCommissionValue, { color: COLORS.warning }]}>
                        ${level.pending_commission.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.levelCommissionItem}>
                      <Text style={styles.levelCommissionLabel}>Payé</Text>
                      <Text style={[styles.levelCommissionValue, { color: COLORS.success }]}>
                        ${level.paid_commission.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Commission Rates Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taux de Commission</Text>
          <View style={styles.ratesCard}>
            <View style={styles.ratesHeader}>
              <Ionicons name="information-circle" size={20} color={COLORS.primary} />
              <Text style={styles.ratesHeaderText}>Structure MLM 5 niveaux</Text>
            </View>
            <View style={styles.ratesGrid}>
              {Object.entries(config?.commission_rates || {}).map(([level, rate]) => (
                <View key={level} style={styles.rateItem}>
                  <Text style={styles.rateLevel}>Niv. {level}</Text>
                  <Text style={[styles.rateValue, { color: LEVEL_COLORS[Number(level)] }]}>
                    {rate.percentage}%
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRateRow}>
              <Text style={styles.totalRateLabel}>Total distribué par achat</Text>
              <Text style={styles.totalRateValue}>
                {config?.total_commission_percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // Disconnected State
  disconnectedContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.xxl 
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  disconnectedTitle: { 
    fontSize: FONT_SIZES.xl, 
    fontWeight: FONT_WEIGHTS.bold, 
    color: COLORS.textPrimary, 
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  disconnectedSubtitle: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  featureList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  connectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  
  // Loading
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary, 
    marginTop: SPACING.md 
  },
  
  // Main Content
  scrollView: { 
    flex: 1 
  },
  scrollContent: { 
    paddingTop: SPACING.lg, 
    paddingHorizontal: SPACING.lg 
  },
  
  // Header
  header: { 
    marginBottom: SPACING.xl 
  },
  headerTitle: { 
    fontSize: FONT_SIZES.xxl, 
    fontWeight: FONT_WEIGHTS.bold, 
    color: COLORS.textPrimary, 
    marginBottom: SPACING.xs 
  },
  headerSubtitle: { 
    fontSize: FONT_SIZES.sm, 
    color: COLORS.textSecondary 
  },
  
  // Referral Card
  referralCard: { 
    backgroundColor: COLORS.surface, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: BORDER_RADIUS.lg, 
    padding: SPACING.lg, 
    marginBottom: SPACING.xl 
  },
  referralHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.md, 
    marginBottom: SPACING.lg 
  },
  referralIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTitle: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: FONT_WEIGHTS.semibold, 
    color: COLORS.textPrimary 
  },
  referralSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  codeContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceElevated, 
    borderWidth: 1, 
    borderColor: COLORS.borderLight, 
    borderRadius: BORDER_RADIUS.md, 
    padding: SPACING.lg, 
    marginBottom: SPACING.lg,
  },
  codeText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 3,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: SPACING.md 
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  actionButtonPrimary: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonText: { 
    fontSize: FONT_SIZES.sm, 
    fontWeight: FONT_WEIGHTS.medium, 
    color: COLORS.textPrimary 
  },
  
  // Sections
  section: { 
    marginBottom: SPACING.xl 
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.md, 
    fontWeight: FONT_WEIGHTS.semibold, 
    color: COLORS.textPrimary, 
    marginBottom: SPACING.xs 
  },
  sectionHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.md,
  },
  
  // Global Stats
  globalStatsCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  globalStatMain: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  globalStatLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  globalStatValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  globalStatsDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.lg,
  },
  globalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  globalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  globalStatItemLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  globalStatItemValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  totalReferralsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalReferralsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  
  // Levels
  levelsContainer: {
    gap: SPACING.md,
  },
  levelCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  levelIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  levelRate: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  levelStats: {
    alignItems: 'flex-end',
    marginRight: SPACING.sm,
  },
  levelStatValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  levelStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  levelCommissions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  levelCommissionItem: {
    alignItems: 'center',
  },
  levelCommissionLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  levelCommissionValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  
  // Rates Card
  ratesCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  ratesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  ratesHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  ratesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  rateItem: {
    alignItems: 'center',
  },
  rateLevel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  rateValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  totalRateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalRateLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  totalRateValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  levelIconContainerModal: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Transactions list
  transactionsList: {
    padding: SPACING.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  transactionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionWallet: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  transactionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionType: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
});
