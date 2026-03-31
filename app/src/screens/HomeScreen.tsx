import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { socket } from '../services/socket';

export default function HomeScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    if (!name.trim()) return alert('¡Introduce tu nombre!');
    socket.emit('createRoom', { name: name.trim() });
    navigation.navigate('Lobby', { name: name.trim(), isCreator: true });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) return alert('¡Introduce tu nombre!');
    if (!roomId.trim()) return alert('¡Introduce el código de la sala!');
    socket.emit('joinRoom', { name: name.trim(), roomId: roomId.trim() });
    navigation.navigate('Lobby', { name: name.trim(), isCreator: false, roomId: roomId.trim() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.title}>FOTOROULETTE</Text>

        <TextInput
          style={[styles.input, { marginBottom: 40, backgroundColor: '#151828' }]}
          placeholder="Tu Apodo / Nombre"
          placeholderTextColor="#4A4D60"
          value={name}
          onChangeText={setName}
          autoCorrect={false}
          maxLength={15}
        />

        <View style={styles.card}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateRoom}>
            <Text style={styles.buttonText}>CREAR SALA</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.or}>— O UNIRSE A UNA —</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Código de Sala"
            placeholderTextColor="#4A4D60"
            autoCapitalize="characters"
            value={roomId}
            onChangeText={setRoomId}
            autoCorrect={false}
            maxLength={6}
          />
          <TouchableOpacity style={styles.buttonSecondary} onPress={handleJoinRoom}>
            <Text style={styles.buttonTextSecondary}>ENTRAR A SALA</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 40,
    letterSpacing: 2,
    textShadowColor: '#FF2A5F',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  card: {
    width: '100%',
    backgroundColor: '#151828',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2D40',
  },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: '#0B0D17',
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#2A2D40',
    marginBottom: 16,
    fontWeight: '600',
  },
  buttonPrimary: {
    width: '100%',
    height: 60,
    backgroundColor: '#FF2A5F',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF2A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonSecondary: {
    width: '100%',
    height: 60,
    backgroundColor: '#151828',
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E5FF',
    letterSpacing: 1.5,
  },
  or: {
    color: '#4A4D60',
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 24,
    letterSpacing: 2,
  }
});
