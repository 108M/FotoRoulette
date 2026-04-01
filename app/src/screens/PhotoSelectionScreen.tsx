import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, ActivityIndicator, Alert, Linking, SafeAreaView, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { socket, SERVER_URL } from '../services/socket';

export default function PhotoSelectionScreen({ navigation, route }: any) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guardamos las fotos que ya hemos intentado subir para no repetirlas
  const [usedPhotoIds, setUsedPhotoIds] = useState<Set<string>>(new Set());

  const gameMode = route.params?.gameMode || 'HARD';

  useEffect(() => {
    if (gameMode === 'HARD') {
      loadPhotosRandomly();
    }
  }, []);

  const loadPhotosRandomly = async () => {
    try {
      setError(null);

      if (Platform.OS === 'web') {
        setError('Estás en PC (Web). MediaLibrary no funciona aquí. Usa el botón manual o sáltate el paso para testear.');
        return;
      }

      let permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);

      if (permission.status !== 'granted') {
        permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      }

      if (permission.status !== 'granted' || permission.accessPrivileges === 'limited') {
        Alert.alert(
          "Permiso necesario",
          "Para que la ruleta sea sorpresa, el juego necesita acceso a TODAS tus fotos, no solo a unas pocas. Por favor, ve a los ajustes y marca 'Permitir siempre todo'.",
          [
            { text: "Jugar manual", style: "cancel", onPress: () => setError("Permisos insuficientes para ruleta automática.") },
            { text: "Abrir Ajustes", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const allPhotos = await MediaLibrary.getAssetsAsync({ first: 1000, mediaType: 'photo' });

      if (allPhotos.assets.length === 0) {
        setError('Tu galería física está vacía. Por favor, elige fotos manualmente.');
        return;
      }

      const shuffled = allPhotos.assets.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(10, shuffled.length));
      
      setUsedPhotoIds(new Set(selected.map(p => p.id)));
      setPhotos(selected);

    } catch (e) {
      console.error(e);
      setError('Error al leer la galería.');
    }
  };

  const pickManual = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos(result.assets);
      setError(null);
    }
  };

  const uploadBatch = async (batchPhotos: any[]) => {
    const formData = new FormData();
    formData.append('roomId', route.params?.roomId || '');
    formData.append('socketId', socket.id as string);

    for (let i = 0; i < batchPhotos.length; i++) {
        const photoAsset = batchPhotos[i];
        let fileData;
        if (Platform.OS === 'web' && photoAsset.file) fileData = photoAsset.file;
        else fileData = { uri: photoAsset.uri, name: `photo_${i}.jpg`, type: 'image/jpeg' };
        formData.append('photos', fileData as any);
    }
    
    const response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData });
    return JSON.parse(await response.text());
  };

  const handleUpload = async () => {
    if (photos.length === 0) return;
    setUploading(true);
    setUploadMessage("Analizando fotos con IA...");

    try {
      let currentBatch = [...photos];
      let rejectedTotal = 0;

      while (currentBatch.length > 0) {
        const data = await uploadBatch(currentBatch);

        if (!data.success) {
          alert('Error del servidor: ' + (data.message || 'Desconocido'));
          setUploading(false);
          return;
        }

        if (data.rejectedCount && data.rejectedCount > 0) {
          rejectedTotal += data.rejectedCount;
          setUploadMessage(`¡La IA pilló ${data.rejectedCount} apuntes!\nBuscando repuestos...`);

          if (gameMode === 'HARD') {
            // Reponer de la galería automáticamente
            const allPhotos = await MediaLibrary.getAssetsAsync({ first: 1000, mediaType: 'photo' });
            const available = allPhotos.assets.filter(p => !usedPhotoIds.has(p.id));
            const shuffled = available.sort(() => 0.5 - Math.random());
            
            const newReplacements = shuffled.slice(0, data.rejectedCount);
            
            if (newReplacements.length === 0) {
               alert("Te has quedado sin fotos en la galería para rellenar.");
               break;
            }

            const newUsed = new Set(usedPhotoIds);
            newReplacements.forEach(p => newUsed.add(p.id));
            setUsedPhotoIds(newUsed);
            
            currentBatch = newReplacements;
          } else {
            alert(`La IA detectó ${data.rejectedCount} apuntes en tus elegidas. El servidor las ha borrado y faltan para llegar a 10. Jugarás con menos.`);
            break;
          }
        } else {
          // Todo perfecto en este lote
          break;
        }
      }

      socket.emit('playerReady');
      navigation.replace('GameReadyWait');

    } catch (e) {
      console.error('Error procesando la subida:', e);
      alert('Hubo un problema al enviar o reponer las fotos.');
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B0D17' }}>
      <View style={styles.container}>
        <Text style={styles.title}>FOTOS EN JUEGO</Text>

        {error && photos.length === 0 && (
          <View style={styles.center}>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.backupButton} onPress={pickManual}>
              <Text style={styles.backupText}>ELEGIR MANUALMENTE</Text>
            </TouchableOpacity>
            
            {Platform.OS === 'web' && (
              <TouchableOpacity 
                style={[styles.uploadButton, { marginTop: 20, width: '100%' }]} 
                onPress={() => {
                  socket.emit('playerReady');
                  navigation.replace('GameReadyWait');
                }}>
                <Text style={styles.uploadText}>TEST: ENTRAR AL JUEGO</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {gameMode === 'EASY' && photos.length === 0 && !error && (
          <View style={styles.center}>
            <Text style={styles.title}>MODO MANUAL (🥶EASY)</Text>
            <Text style={styles.subtitle}>El sistema no elegirá fotos. Pulsa abajo para elegir tú mismo con cuáles participar.</Text>
            <TouchableOpacity style={[styles.backupButton, { marginTop: 40 }]} onPress={pickManual}>
              <Text style={styles.backupText}>ABRIR MI GALERÍA (MAX 10)</Text>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <TouchableOpacity 
                style={[styles.uploadButton, { marginTop: 20, width: '100%' }]} 
                onPress={() => {
                  socket.emit('playerReady');
                  navigation.replace('GameReadyWait');
                }}>
                <Text style={styles.uploadText}>PC TEST: ENTRAR</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {gameMode === 'HARD' && !error && photos.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.title}>RULETA DEVIL (😈HARD)</Text>
            <ActivityIndicator size="large" color="#FF2A5F" />
            <Text style={styles.subtitle}>Secuestrando tus fotos en secreto...</Text>
          </View>
        )}

        {photos.length > 0 && (
          <>
            <FlatList
              data={photos}
              numColumns={2}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.imageContainer}>
                  {gameMode === 'HARD' ? (
                     <View style={[styles.image, styles.mysteryBox]}>
                        <Text style={styles.mysteryText}>?</Text>
                     </View>
                   ) : (
                     <Image source={{ uri: item.uri }} style={styles.image} />
                   )}
                </View>
              )}
            />
            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
              <Text style={styles.uploadText}>{uploading ? (uploadMessage || 'ENVIANDO...') : '¡LISTO PARA JUGAR!'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D17', padding: 16, paddingTop: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 24, color: '#FFF', fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 3, textShadowColor: '#FF2A5F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  subtitle: { fontSize: 16, color: '#4A4D60', textAlign: 'center', marginTop: 24, fontWeight: '800', letterSpacing: 1 },
  errorBox: { backgroundColor: '#FF2A5F15', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FF2A5F', marginBottom: 30 },
  errorText: { color: '#FF2A5F', fontSize: 16, textAlign: 'center', fontWeight: 'bold', lineHeight: 24 },
  imageContainer: { width: '48%', aspectRatio: 1, margin: '1%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#2A2D40' },
  image: { width: '100%', height: '100%', borderRadius: 16 },
  uploadButton: { backgroundColor: '#FF2A5F', marginVertical: 20, padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#FF2A5F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  uploadText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  backupButton: { backgroundColor: '#151828', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#00E5FF', width: '100%', alignItems: 'center', shadowColor: '#00E5FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  backupText: { color: '#00E5FF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  mysteryBox: { backgroundColor: '#151828', justifyContent: 'center', alignItems: 'center' },
  mysteryText: { fontSize: 64, color: '#FF2A5F', fontWeight: '900', textShadowColor: '#FF2A5F', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 }
});