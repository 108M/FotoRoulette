import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, LayoutAnimation, UIManager, Platform, Animated } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { socket } from '../services/socket';

export default function RoundResultScreen({ navigation, route }: any) {
  const { result, roomState: initialRoomState } = route.params;
  const [roomState, setRoomState] = useState<any>(initialRoomState || null);

  const [displayedScores, setDisplayedScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (initialRoomState?.players || []).forEach((p: any) => initial[p.id] = p.score || 0);
    return initial;
  });

  const slideAnims = useRef<Animated.Value[]>([]).current;
  const opacityAnims = useRef<Animated.Value[]>([]).current;
  
  const playersCount = initialRoomState?.players?.length || 0;
  if (playersCount > 0 && slideAnims.length === 0) {
    for (let i = 0; i < playersCount; i++) {
      slideAnims.push(new Animated.Value(50)); 
      opacityAnims.push(new Animated.Value(0)); 
    }
  }

  useEffect(() => {
    socket.on('roomState', (state: any) => {
      setRoomState(state);
      if (state.currentRound && state.state === 'PLAYING') {
        navigation.goBack();
      }
      if (state.state === 'LEADERBOARD') {
        navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Leaderboard', params: { roomState: state } }] });
      }
    });

    if (slideAnims.length > 0) {
      const animations = slideAnims.map((anim, index) => {
        return Animated.parallel([
          Animated.timing(opacityAnims[index], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(anim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true })
        ]);
      });
      Animated.stagger(150, [...animations].reverse()).start();
    }

    const steps = 40;
    let currentStep = 0;
    const starts: Record<string, number> = {};
    const targets = result.scores || {};
    (initialRoomState?.players || []).forEach((p: any) => starts[p.id] = p.score || 0);

    let intervalId: NodeJS.Timeout;
    const delayId = setTimeout(() => {
      intervalId = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easing = 1 - Math.pow(1 - progress, 3);

        setDisplayedScores(prev => {
          const next: Record<string, number> = {};
          
          const oldOrder = [...(initialRoomState?.players || [])].sort((a,b) => prev[b.id] - prev[a.id]).map(p => p.id);

          (initialRoomState?.players || []).forEach((p: any) => {
            const s = starts[p.id] || 0;
            const t = targets[p.id] || s;
            next[p.id] = Math.round(s + (t - s) * easing);
          });

          const newOrder = [...(initialRoomState?.players || [])].sort((a,b) => next[b.id] - next[a.id]).map(p => p.id);
          
          if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
          }

          return next;
        });

        if (currentStep >= steps) clearInterval(intervalId);
      }, 40);
    }, 600); // Wait 600ms so they see the entrance animation before points start counting

    return () => {
      socket.off('roomState');
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const ownerName = roomState?.players.find((p: any) => p.id === result.owner)?.name || 'ALGUIEN';
  const iGuessedRight = result.results[socket.id || ''] === true;
  
  const resultColor = iGuessedRight ? '#00E5FF' : '#FF2A5F';
  const resultText = iGuessedRight ? '¡ACERTASTE!' : 'FALLASTE';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.roundInfo}>
            RONDA {roomState?.currentRound?.current || 1} / {roomState?.currentRound?.total || '?'}
          </Text>
          <Text style={styles.label}>LA FOTO ERA DE</Text>
          <Text style={styles.title} adjustsFontSizeToFit numberOfLines={2}>{ownerName.toUpperCase()}</Text>
        </View>
        
        <View style={styles.resultContainer}>
          <Text 
            style={[styles.resultText, { color: resultColor, textShadowColor: resultColor }]}
            adjustsFontSizeToFit 
            numberOfLines={1}
          >
            {resultText}
          </Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
          {[...(roomState?.players || [])].sort((a, b) => (displayedScores[b.id] || 0) - (displayedScores[a.id] || 0)).map((item, index) => {
            const current = displayedScores[item.id] || 0;
            const target = result.scores?.[item.id] || 0;
            const remaining = target - current;

            return (
              <Animated.View key={item.id} style={[styles.scoreRow, { opacity: opacityAnims[index], transform: [{ translateY: slideAnims[index] }] }]}>
                <View style={styles.playerInfo}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                  <Text style={styles.scoreName}>{item.name}</Text>
                </View>
                <View style={styles.scoreValues}>
                  {remaining > 0 && <Text style={styles.ptsWon}>+{remaining}</Text>}
                  <Text style={styles.scoreTotal}>{current} pts</Text>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotContainer}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.subtitle}>SIGUIENTE RONDA EN BREVE</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#151828', width: '100%', padding: 40, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2D40', marginBottom: 40 },
  roundInfo: { fontSize: 14, color: '#00E5FF', fontWeight: '900', letterSpacing: 2, marginBottom: 16, backgroundColor: '#2A2D40', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
  label: { fontSize: 14, color: '#4A4D60', fontWeight: '800', letterSpacing: 3, marginBottom: 16 },
  title: { fontSize: 40, color: '#FFF', fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  resultContainer: { marginVertical: 30, alignItems: 'center', width: '100%' },
  resultText: { fontSize: 38, fontWeight: '900', letterSpacing: 2, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15, textAlign: 'center', width: '100%' },
  footer: { position: 'absolute', bottom: 50, alignItems: 'center' },
  dotContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A4D60' },
  dotActive: { backgroundColor: '#00E5FF', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5 },
  subtitle: { fontSize: 12, color: '#4A4D60', fontWeight: '800', letterSpacing: 2 },
  list: { width: '100%', maxHeight: 220, marginBottom: 80 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#151828', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2A2D40' },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankText: { color: '#4A4D60', fontSize: 16, fontWeight: '900' },
  scoreName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  scoreValues: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  ptsWon: { color: '#00E5FF', fontSize: 14, fontWeight: '900' },
  scoreTotal: { color: '#4A4D60', fontSize: 16, fontWeight: '800' }
});
