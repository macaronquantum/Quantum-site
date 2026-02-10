import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color }) => (
            <Ionicons name="trending-up" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="presale"
        options={{
          title: 'Pre-Sale',
          tabBarIcon: ({ color }) => (
            <Ionicons name="card" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="affiliation"
        options={{
          title: 'Referral',
          tabBarIcon: ({ color }) => (
            <Ionicons name="share-social" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.medium,
    marginTop: -4,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
});
