import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00D4FF',
        tabBarInactiveTintColor: '#6B7280',
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
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="opportunities"
        options={{
          title: 'Opportunities',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="rocket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(10, 25, 41, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
  },
});
