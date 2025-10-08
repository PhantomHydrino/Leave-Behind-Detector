
import MapView, { Marker, Heatmap } from 'react-native-maps';
import { ItemEvent } from '../../App';
import { Button, View } from 'react-native';

const MapScreen = ({ history, onClose }: { history: ItemEvent[], onClose: ()=>void }) => {
  // Group by latest timestamp per item
  const latest = history.reduce((acc: any, ev) => {
    if (!acc[ev.name] || ev.timestamp > acc[ev.name].timestamp) {
      acc[ev.name] = ev;
    }
    return acc;
  }, {});

  const markers = Object.values(latest) as ItemEvent[];

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: markers.length ? markers[0].lat : 37.78825,
          longitude: markers.length ? markers[0].lng : -122.4324,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {markers.map((ev: any, idx: number) => (
          <Marker
            key={idx}
            coordinate={{ latitude: ev.lat, longitude: ev.lng }}
            title={ev.name}
            description={`Last seen at ${ev.place}`}
          />
        ))}

        {/* Optional Heatmap */}
        <Heatmap
          points={history.map((ev) => ({
            latitude: ev.lat,
            longitude: ev.lng,
            weight: 1,
          }))}
          radius={40}
          opacity={0.6}
        />
      </MapView>
      <Button title="Close Map" onPress={onClose} />
    </View>
  );
};

export default MapScreen;