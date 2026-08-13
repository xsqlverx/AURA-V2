import * as Location from 'expo-location';

type Coords = { lat: number; lon: number };

let lastCoords: Coords | null = null;

export async function getDeviceCoords(): Promise<Coords | null> {
  if (lastCoords) return lastCoords;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    lastCoords = { lat: position.coords.latitude, lon: position.coords.longitude };
    return lastCoords;
  } catch {
    return null;
  }
}

export function clearCoords() {
  lastCoords = null;
}