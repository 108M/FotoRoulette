import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';

export default function LobbyScreen({ navigation, route }: any) {
  const { isCreator } = route.params;
  const [roomState, setRoomState] = useState<any>(null);

  useEffect(() => {
    socket.on('roomState', (state: any) => {
      setRoomState(state);
      if (state.state === 'PHOTO_SELECTION') {
        navigation.replace('PhotoSelection', { roomId: state.id, gameMode: state.gameMode });
      }
    });

    socket.on('error', (err) => {
      alert(err);
      navigation.goBack();
    });

    return () => {
      socket.off('roomState');
      socket.off('error');
    };
  }, []);

  const handleStart = () => {
    socket.emit('startGame');
  };

  if (!roomState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>CARGANDO SALA...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.titleLabel}>CÓDIGO DE SALA</Text>
          <Text style={styles.title}>{roomState.id}</Text>
        </View>

        <Text style={styles.subtitle}>JUGADORES CONECTADOS ({roomState.players.length})</Text>
        <FlatList
          data={roomState.players}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => (
            <View style={styles.playerCard}>
              <View style={styles.playerAvatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{item.name}</Text>
              {index === 0 && <Text style={styles.hostBadge}>VIP</Text>}
            </View>
          )}
        />

        <View style={styles.settingsContainer}>
          <Text style={styles.subtitle}>MODO DE JUEGO</Text>
          {isCreator ? (
            <TouchableOpacity 
              style={[styles.modeButton, roomState.gameMode === 'HARD' ? styles.modeHard : styles.modeEasy]}
              onPress={() => socket.emit('updateSettings', { gameMode: roomState.gameMode === 'HARD' ? 'EASY' : 'HARD' })}
            >
              <Text style={styles.modeText}>
                {roomState.gameMode === 'HARD' ? '😈 HARD (Ruleta Rusa)' : '🥶 EASY (Manual)'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.settingsValue}>
              {roomState.gameMode === 'HARD' ? '😈 HARD' : '🥶 EASY'}
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.subtitle}>LÍMITE DE RONDAS</Text>
          {isCreator ? (
            <View style={styles.settingsRow}>
               <TouchableOpacity 
                 onPress={() => socket.emit('updateSettings', { maxRounds: Math.max(1, roomState.maxRounds - 1) })} 
                 style={styles.settingsBtn}>
                  <Text style={styles.settingsBtnText}>-</Text>
               </TouchableOpacity>
               <Text style={styles.settingsValue}>{roomState.maxRounds}</Text>
               <TouchableOpacity 
                 onPress={() => socket.emit('updateSettings', { maxRounds: roomState.maxRounds + 1 })} 
                 style={styles.settingsBtn}>
                  <Text style={styles.settingsBtnText}>+</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.settingsRow}>
              <Text style={styles.settingsValue}>{roomState.maxRounds}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {isCreator ? (
            <TouchableOpacity style={styles.buttonStart} onPress={handleStart}>
              <Text style={styles.buttonText}>EMPEZAR PARTIDA</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>ESPERANDO AL CREADOR...</Text>
              <View style={styles.dotContainer}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00E5FF', fontSize: 18, fontWeight: '800', letterSpacing: 2 },
  container: { flex: 1, backgroundColor: '#0B0D17', padding: 24, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  titleLabel: { fontSize: 14, color: '#4A4D60', fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  title: { fontSize: 48, fontWeight: '900', color: '#FFF', letterSpacing: 6, textShadowColor: '#FF2A5F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subtitle: { fontSize: 14, color: '#4A4D60', fontWeight: '800', marginBottom: 20, letterSpacing: 1.5 },
  listContainer: { paddingBottom: 20 },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#151828', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2D40' },
  playerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2D40', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#00E5FF', fontSize: 18, fontWeight: '900' },
  playerName: { fontSize: 18, color: '#FFF', fontWeight: '600', flex: 1 },
  hostBadge: { backgroundColor: '#FF2A5F', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, color: '#FFF', fontSize: 12, fontWeight: '800', overflow: 'hidden' },
  footer: { marginTop: 20, marginBottom: 20 },
  buttonStart: { backgroundColor: '#FF2A5F', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#FF2A5F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonText: { fontSize: 18, color: '#FFF', fontWeight: '900', letterSpacing: 1.5 },
  waitingContainer: { backgroundColor: '#151828', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2A2D40' },
  waitingText: { color: '#00E5FF', fontSize: 14, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  dotContainer: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A4D60' },
  dotActive: { backgroundColor: '#00E5FF', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5 },
  settingsContainer: { backgroundColor: '#151828', padding: 20, borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: '#2A2D40', alignItems: 'center' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  settingsBtn: { backgroundColor: '#2A2D40', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  settingsBtnText: { color: '#00E5FF', fontSize: 24, fontWeight: '900' },
  settingsValue: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  modeButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 2, marginBottom: 16 },
  modeHard: { backgroundColor: '#FF2A5F15', borderColor: '#FF2A5F' },
  modeEasy: { backgroundColor: '#00E5FF15', borderColor: '#00E5FF' },
  modeText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#2A2D40', width: '100%', marginVertical: 16 }
});
