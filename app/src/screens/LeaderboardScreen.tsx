import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';

export default function LeaderboardScreen({ navigation, route }: any) {
  const [roomState, setRoomState] = useState<any>(route.params?.roomState || null);

  const sortedPlayers = roomState ? [...roomState.players].sort((a, b) => b.score - a.score) : [];

  useEffect(() => {
    socket.on('roomState', (state: any) => {
      setRoomState(state);
    });

    return () => {
      socket.off('roomState');
    };
  }, []);

  const handleCreateNew = () => {
    navigation.popToTop();
  };

  if (!roomState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>CARGANDO RESULTADOS...</Text>
      </SafeAreaView>
    );
  }



  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CLASIFICACIÓN FINAL</Text>
        </View>

        <FlatList
          data={sortedPlayers}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => {
            const isWinner = index === 0;
            return (
              <View style={[styles.playerRow, isWinner && styles.winnerRow]}>
                <View style={[styles.rankBadge, isWinner && styles.winnerBadge]}>
                  <Text style={[styles.rankText, isWinner && styles.winnerRankText]}>{index + 1}</Text>
                </View>
                <Text style={[styles.name, isWinner && styles.winnerNameText]}>{item.name}</Text>
                <Text style={[styles.score, isWinner && styles.winnerScoreText]}>{item.score} PTS</Text>
              </View>
            );
          }}
        />

        <TouchableOpacity style={styles.button} onPress={handleCreateNew}>
          <Text style={styles.buttonText}>SALIR / NUEVA PARTIDA</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00E5FF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  container: { flex: 1, backgroundColor: '#0B0D17', padding: 24, paddingTop: 40 },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 24, color: '#FFF', fontWeight: '900', textAlign: 'center', letterSpacing: 4, textShadowColor: '#FF2A5F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  playerRow: { flexDirection: 'row', backgroundColor: '#151828', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2D40' },
  winnerRow: { backgroundColor: '#FF2A5F15', borderColor: '#FF2A5F', shadowColor: '#FF2A5F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  rankBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2D40', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  winnerBadge: { backgroundColor: '#FF2A5F' },
  rankText: { fontSize: 16, color: '#FFF', fontWeight: '900' },
  winnerRankText: { color: '#FFF' },
  name: { fontSize: 18, color: '#FFF', flex: 1, fontWeight: '600' },
  winnerNameText: { color: '#FF2A5F', fontWeight: '900' },
  score: { fontSize: 16, color: '#00E5FF', fontWeight: '900', letterSpacing: 1 },
  winnerScoreText: { color: '#FF2A5F' },
  button: { backgroundColor: '#151828', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20, borderWidth: 2, borderColor: '#00E5FF', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  buttonText: { fontSize: 16, color: '#00E5FF', fontWeight: '900', letterSpacing: 1.5 }
});
