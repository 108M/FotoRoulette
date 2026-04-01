import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';
// Screens
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import PhotoSelectionScreen from './src/screens/PhotoSelectionScreen';
import GameReadyWaitScreen from './src/screens/GameReadyWaitScreen';
import GameRoundScreen from './src/screens/GameRoundScreen';
import RoundResultScreen from './src/screens/RoundResultScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // Evitar capturas de pantalla globalmente
    ScreenCapture.preventScreenCaptureAsync();
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  return (
    // <-- ENVUELVE TODO EN SafeAreaProvider
    <SafeAreaProvider>
      {/*<StatusBar style="light" />*/}
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Lobby" component={LobbyScreen} />
          <Stack.Screen name="PhotoSelection" component={PhotoSelectionScreen} />
          <Stack.Screen name="GameReadyWait" component={GameReadyWaitScreen} />
          <Stack.Screen name="GameRound" component={GameRoundScreen} />
          <Stack.Screen name="RoundResult" component={RoundResultScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}