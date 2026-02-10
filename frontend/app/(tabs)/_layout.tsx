import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView intensity={100} style={StyleSheet.absoluteFill} tint="dark" />
          ) : null
        ),
      }}
    >
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="presale"
        options={{
          title: 'Pre-Sale',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="affiliation"
        options={{
          title: 'Referral',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="share-social-outline" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
