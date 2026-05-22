import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { useTheme } from '../lib/ThemeContext';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../lib/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import DrawScreen from '../screens/DrawScreen';
import PaymentTrackingScreen from '../screens/PaymentTrackingScreen';
import CycleReceiptScreen from '../screens/CycleReceiptScreen';
import MemberDetailScreen from '../screens/MemberDetailScreen';
import MemberPublicViewScreen from '../screens/MemberPublicViewScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['chitti://', 'https://chitti-app-edfb1.web.app'],
  config: {
    screens: {
      MemberPublicView: 'member/:token',
      Home: '',
      GroupDetail: 'group/:groupId',
    },
  },
};

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
            <Stack.Screen name="AddMember" component={AddMemberScreen} />
            <Stack.Screen name="Draw" component={DrawScreen} />
            <Stack.Screen name="PaymentTracking" component={PaymentTrackingScreen} />
            <Stack.Screen name="CycleReceipt" component={CycleReceiptScreen} />
            <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
            <Stack.Screen name="MemberPublicView" component={MemberPublicViewScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={LoginScreen} />
            <Stack.Screen name="MemberPublicView" component={MemberPublicViewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
