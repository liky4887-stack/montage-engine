import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';

export default function PairScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePair = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await api.pair(code);
      Alert.alert('Success', 'Paired successfully!');
      router.replace('/(tabs)'); // Go to the main app
    } catch (err: any) {
      console.error(err);
      Alert.alert('Pairing Failed', err.response?.data?.error || err.message || 'Check the engine connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to Engine</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code from your Termux terminal</Text>
      
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor="#666"
      />
      
      <Button title={loading ? "Connecting..." : "Pair Device"} onPress={handlePair} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 30, color: '#666', fontSize: 16 },
  input: { 
    borderWidth: 2, 
    borderColor: '#ddd', 
    padding: 15, 
    borderRadius: 10, 
    fontSize: 32, 
    textAlign: 'center', 
    marginBottom: 30, 
    letterSpacing: 15 
  }
});
