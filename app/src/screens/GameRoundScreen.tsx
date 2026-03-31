import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { socket, SERVER_URL } from '../services/socket';

export default function GameRoundScreen({ navigation, route }: any) {
  const [roomState, setRoomState] = useState<any>(route.params?.roomState || null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [votedFor, setVotedFor] = useState<string | null>(null);

  useEffect(() => {
    const onRoomState = (state: any) => {
      if (state.state === 'LEADERBOARD') {
        navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Leaderboard', params: { roomState: state } }] });
        return;
      }

      if (roomState?.currentRound?.photoUrl !== state.currentRound?.photoUrl) {
        setVotedFor(null);
      }

      setRoomState(state);
    };

    const onRoundResult = (result: any) => {
      navigation.navigate('RoundResult', { result, roomState });
    };

    socket.on('roomState', onRoomState);
    socket.on('roundResult', onRoundResult);

    return () => {
      socket.off('roomState', onRoomState);
      socket.off('roundResult', onRoundResult);
    };
  }, [roomState]);

  useEffect(() => {
    if (!roomState?.currentRound?.endTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const end = roomState.currentRound.endTime;
      const diff = Math.max(0, Math.floor((end - now) / 1000));

      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [roomState?.currentRound?.photoUrl]);

  const handleVote = (playerId: string) => {
    if (votedFor || timeLeft <= 0) return;

    setVotedFor(playerId);
    socket.emit('vote', { guessedSocketId: playerId });
  };

  if (!roomState || !roomState.currentRound) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#00E5FF" />
        <Text style={styles.waitingText}>PREPARANDO SIGUIENTE RONDA...</Text>
      </SafeAreaView>
    );
  }

  const photoUrl = `${SERVER_URL}${roomState.currentRound.photoUrl}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.roundInfo}>RONDA {roomState?.currentRound?.current || 1} / {roomState?.currentRound?.total || '?'}</Text>
            <Text style={styles.question}>¿DE QUIÉN ES ESTA FOTO?</Text>
          </View>
          <Text style={[styles.timer, timeLeft <= 3 && styles.timerDanger]}>{timeLeft}s</Text>
        </View>

        <View style={styles.photoContainer}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.photo}
            resizeMode="cover"
            key={photoUrl}
          />
        </View>

        <FlatList
          data={roomState.players}
          keyExtractor={p => p.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.voteButton,
                votedFor === item.id && styles.voteButtonSelected,
                votedFor && votedFor !== item.id && styles.voteButtonDisabled
              ]}
              onPress={() => handleVote(item.id)}
              disabled={!!votedFor}
            >
              <Text style={[styles.voteText, votedFor === item.id && styles.voteTextSelected]}>
                {item.name || "JUGADOR"}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center' },
  waitingText: { color: '#00E5FF', marginTop: 16, fontSize: 16, fontWeight: '800', letterSpacing: 1.5 },
  container: { flex: 1, backgroundColor: '#0B0D17', paddingHorizontal: 16, paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  headerTextContainer: { flex: 1, paddingRight: 10 },
  roundInfo: { fontSize: 14, color: '#00E5FF', fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
  question: { fontSize: 16, color: '#FFF', fontWeight: '900', letterSpacing: 1.5 },
  timer: { fontSize: 32, fontWeight: '900', color: '#00E5FF', textShadowColor: '#00E5FF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  timerDanger: { color: '#FF2A5F', textShadowColor: '#FF2A5F' },
  photoContainer: { width: '100%', height: 350, borderRadius: 24, marginBottom: 24, backgroundColor: '#151828', borderWidth: 2, borderColor: '#2A2D40', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  listContainer: { paddingBottom: 20 },
  voteButton: { flex: 1, backgroundColor: '#151828', margin: 8, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A2D40' },
  voteButtonSelected: { backgroundColor: '#FF2A5F', borderColor: '#FFF', shadowColor: '#FF2A5F', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 },
  voteButtonDisabled: { opacity: 0.4 },
  voteText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  voteTextSelected: { color: '#FFF', fontWeight: '900' }
});