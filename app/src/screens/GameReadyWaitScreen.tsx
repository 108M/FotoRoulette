import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';

export default function GameReadyWaitScreen({ navigation }: any) {
  const [playersReady, setPlayersReady] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    socket.on('roomState', (state: any) => {
      if (state.state === 'PLAYING') {
        navigation.replace('GameRound', { roomState: state });
      } else {
        const readyCount = state.players.filter((p: any) => p.ready).length;
        setPlayersReady(readyCount);
        setTotalPlayers(state.players.length);
      }
    });

    return () => {
      socket.off('roomState');
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#00E5FF" />
        </View>
        <Text style={styles.title}>PREPARANDO PARTIDA</Text>
        <Text style={styles.subtitle}>{playersReady} DE {totalPlayers} JUGADORES LISTOS</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loaderContainer: { marginBottom: 30, padding: 20, borderRadius: 50, backgroundColor: '#151828', borderWidth: 1, borderColor: '#2A2D40', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 3, textShadowColor: '#FF2A5F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, textAlign: 'center' },
  subtitle: { color: '#00E5FF', fontSize: 14, fontWeight: '800', marginTop: 16, letterSpacing: 2, textAlign: 'center' }
});
