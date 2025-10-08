
import React, { useEffect, useState, useRef } from 'react';
import { Text, TextInput, View, FlatList, TouchableOpacity, Button, Alert, PermissionsAndroid, Platform, ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapScreen from './Components/map-screen/MapScreen';


// Types
interface Item {
  name: string;
  always: boolean;
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
  radius: number;
}

// New type
export interface ItemEvent {
  name: string;
  place: string;
  lat: number;
  lng: number;
  timestamp: number;
}

const haversine = (lat1:number, lon1:number, lat2:number, lon2:number) => {
  const R = 6371000;
  const toRad = (a:number) => a * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const App = () => {
  const [items, setItems] = useState<Item[]>([]);

  const [places, setPlaces] = useState<Place[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newPlace, setNewPlace] = useState({name:'', lat:'', lng:'', radius:'60'});

  const [status, setStatus] = useState('idle');
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [minSession, setMinSession] = useState(30);

  const watchId = useRef<Location.LocationSubscription | null>(null);
  const [itemHistory, setItemHistory] = useState<ItemEvent[]>([]);

  const [recoverVisible, setRecoverVisible] = useState(false);
  const [recoverInput, setRecoverInput] = useState('');

  const [mapVisible, setMapVisible] = useState(false);

  // Notifications setup
  useEffect(() => {
    // Configure how notifications are displayed when the app is foregrounded
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,   // show banner/alert while app is foreground
        shouldShowBadge: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowList: true   
      }),
    });
  
    // iOS foreground permission prompt
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Enable notifications to receive leave-behind reminders.'
        );
      }
    })();
  }, []);
  

  useEffect(() => {
    (async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('itemHistory');
        if (savedHistory) {
          setItemHistory(JSON.parse(savedHistory));
        }
      } catch (err) {
        console.error("Failed to load itemHistory from storage", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('itemHistory', JSON.stringify(itemHistory));
      } catch (err) {
        console.error("Failed to save itemHistory to storage", err);
      }
    })();
  }, [itemHistory]);


  const triggerReminder = async (place: Place, elapsed: number) => {
  const candidates = items.filter(it => it.always).map(it => it.name);

  // Format list nicely with bullet points and line breaks
  const body = candidates.length
    ? `Take with you:\n• ${candidates.join('\n• ')}`
    : `Did you take everything?`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Reminder',                  // keep short to avoid truncation
        subtitle: `Leaving ${place.name}`,  // second line on iOS
        body,                               // main message with line breaks
        data: { place: place.name, items: candidates }, // optional for app handling
      },
      trigger: null, // send immediately
    });

    // Show the same text in an in-app alert as well} from 'react-
    Alert.alert(`Leaving ${place.name}`, body);
  };

  const logItemEvents = (placeName: string) => {
    const place = places.find(p => p.name === placeName);
  if (!place) return;

  const events = items.map(it => ({
    name: it.name,
    place: place.name,
    lat: place.lat,   // 👈 add coords
    lng: place.lng,   // 👈 add coords
    timestamp: Date.now()
  }));
  setItemHistory(prev => [...prev, ...events]);
  };


  const checkPosition = (lat:number, lng:number) => {
    let found: Place | null = null;
    for (const p of places) {
      const d = haversine(lat, lng, p.lat, p.lng);
      if (d <= p.radius) {
        found = p;
        break;
      }
    }

    if(found && !currentPlace){
      setCurrentPlace(found);
      setSessionStart(Date.now());
      setStatus('inside');
      logItemEvents(found.name);
    } else if(!found && currentPlace){
      const elapsed = sessionStart ? Math.floor((Date.now()-sessionStart)/1000) : 0;
      if(elapsed >= minSession){ triggerReminder(currentPlace, elapsed) }
      setCurrentPlace(null);
      setSessionStart(null);
      setStatus('idle');
    }
  };

  const startTracking = async () => {
  // 👇 Show your own explanation FIRST
  if (Platform.OS === 'android') {
    Alert.alert(
      "Location Permission",
      "We use your location to remind you about items you might leave behind when leaving a place.",
      [
        {
          text: "OK",
          onPress: async () => {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
              Alert.alert("Permission denied", "Location permission is required");
              return;
            }

            // Only start watching after permission is granted
            watchId.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
              },
              (pos) => {
                checkPosition(pos.coords.latitude, pos.coords.longitude);
              }
            );

            setStatus('watching');
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  } else {
    // iOS or other platforms
    watchId.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (pos) => {
        checkPosition(pos.coords.latitude, pos.coords.longitude);
      }
    );
    setStatus('watching');
  }
};

  const stopTracking = () => {
    if (watchId.current) {
      watchId.current.remove(); // LocationSubscription has remove()
      watchId.current = null;
    }
    setStatus('idle');
    setCurrentPlace(null);
    setSessionStart(null);
  };

  const detectCurrentLocation = async () => {
  // Ask for location permission (Expo handles both iOS & Android)
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Pre-fill lat/lng fields in the newPlace state
    setNewPlace(prev => ({
      ...prev,
      lat: loc.coords.latitude.toString(),
      lng: loc.coords.longitude.toString(),
    }));

    Alert.alert(
      'Location Detected',
      `Lat: ${loc.coords.latitude.toFixed(5)}, Lng: ${loc.coords.longitude.toFixed(5)}`
    );
  };

  const simulateLeaving = () => {
    if (!currentPlace) {
      // If not currently "inside", fake being inside first
      if (places.length === 0) {
        Alert.alert('No places set', 'Add a place before testing.');
        return;
      }
      const testPlace = places[0];
      setCurrentPlace(testPlace);
      setSessionStart(Date.now() - (minSession * 1000 + 1000)); // ensure min time is met
      setStatus('inside');
    }

    // Simulate that we’ve just crossed the boundary
    const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : minSession;
    if (currentPlace) {
      triggerReminder(currentPlace, elapsed);
      setCurrentPlace(null);
      setSessionStart(null);
      setStatus('idle');
    }
  };

  const clearItems = () => {
    if (items.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'Item List Empty',
        position: 'bottom',
      });
      return;
    }
    setItems([]);
    Toast.show({
      type: 'success',
      text1: 'All Items Cleared',
      position: 'bottom',
    });
  };

  const clearPlaces = () => {
    if (places.length === 0) {
      Toast.show({
        type: 'info',
        text1: 'No Location Present',
        position: 'bottom',
      });
      return;
    }
    setPlaces([]);
    Toast.show({
      type: 'success',
      text1: 'All Locations Cleared',
      position: 'bottom',
    });
  };

  function getRecoverySuggestions(itemName: string, history: ItemEvent[]) {
    const now = Date.now();
    const candidatePlaces: { [place: string]: { score: number, lastSeen: number } } = {};

    history
        .filter(ev => ev.name === itemName)
        .forEach(ev => {
          const recency = 1 / Math.max(1, (now - ev.timestamp) / (1000 * 60)); // weight by minutes ago
          const freq = history.filter(h => h.name === itemName && h.place === ev.place).length;
          const score = (recency * 0.6) + (freq * 0.4);
          if (!candidatePlaces[ev.place] || score > candidatePlaces[ev.place].score) {
            candidatePlaces[ev.place] = { score, lastSeen: ev.timestamp };
          }
        });

      return Object.entries(candidatePlaces)
        .sort((a, b) => b[1].score - a[1].score)
        .map(([place, data]) => ({ place, ...data }));
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{color:'white', fontSize:20, fontWeight:'bold'}}>Leave-Behind Detector (RN)</Text>

      {/* Items */}
      <View style={{marginTop:16}}>
        <Text style={{color:'#94a3b8'}}>Items to remember</Text>
        <FlatList
          data={items}
          keyExtractor={(it)=>it.name}
          renderItem={({item, index}) => (
            <TouchableOpacity onPress={() => {
              const newItems=[...items]; newItems[index].always=!newItems[index].always; setItems(newItems);
            }}
            onLongPress={() => {
              const newItems=items.filter((_,i)=>i!==index); setItems(newItems);
            }}
            >
              <Text style={{color:'white', fontWeight:item.always?'bold':'normal'}}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
        <TextInput style={{backgroundColor:'#1e293b', color:'white',marginTop:8,padding:8}} placeholder="Add item" placeholderTextColor="#64748b" value={newItem} onChangeText={setNewItem}/>
        <Button title="Add" onPress={()=>{
          if(!newItem.trim()) return; setItems([...items,{name:newItem,always:true}]); setNewItem('');
        }}/>
        <Button
        title="Clear All Items"
        color="red"
        onPress={() => {
          Alert.alert(
            'Clear All?',
            'This will remove every item from the list.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'OK', onPress: clearItems },
            ]
          );
          }}
        />
      </View>

      {/* Places */}
      <View style={{marginTop:16}}>
        <Text style={{color:'#94a3b8'}}>Places</Text>
        <FlatList
          data={places}
          keyExtractor={(p)=>p.name+""+p.lat}
          renderItem={({item,index})=>(
            <TouchableOpacity onLongPress={()=>{
              const newPlaces=places.filter((_,i)=>i!==index); setPlaces(newPlaces);
            }}>
              <Text style={{color:'white'}}>{item.name} ({item.radius}m)</Text>
            </TouchableOpacity>
          )}
        />
        <TextInput placeholder="Name" placeholderTextColor="#64748b" value={newPlace.name} onChangeText={(t)=>setNewPlace({...newPlace,name:t})} style={{backgroundColor:'#1e293b',color:'white',marginTop:8,padding:8}}/>
        <TextInput placeholder="Lat" placeholderTextColor="#64748b" value={newPlace.lat} onChangeText={(t)=>setNewPlace({...newPlace,lat:t})} style={{backgroundColor:'#1e293b',color:'white',marginTop:8,padding:8}}/>
        <TextInput placeholder="Lng" placeholderTextColor="#64748b" value={newPlace.lng} onChangeText={(t)=>setNewPlace({...newPlace,lng:t})} style={{backgroundColor:'#1e293b',color:'white',marginTop:8,padding:8}}/>
        <TextInput placeholder="Radius" placeholderTextColor="#64748b" value={newPlace.radius} onChangeText={(t)=>setNewPlace({...newPlace,radius:t})} style={{backgroundColor:'#1e293b',color:'white',marginTop:8,padding:8}}/>
        <Button title="Add Place" onPress={()=>{
          if(!newPlace.lat||!newPlace.lng) return;
          setPlaces([...places,{
            name:newPlace.name||'Place',
            lat:parseFloat(newPlace.lat),
            lng:parseFloat(newPlace.lng),
            radius:parseInt(newPlace.radius)||60
          }]);
          setNewPlace({name:'',lat:'',lng:'',radius:'60'});
        }}/>
        <Button title="Detect Current Location" onPress={detectCurrentLocation} />
              </View>
              <Button
          title="Clear All Locations"
          color="red"
          onPress={() => {
            Alert.alert(
              'Clear All Locations?',
              'This will remove every saved place.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'OK', onPress: clearPlaces },
              ]
            );
          }}
        />

      {/* Tracker */}
      <View style={{marginTop:16}}>
        <Text style={{color:'white'}}>Status: {status}</Text>
        <Text style={{color:'white'}}>Current Place: {currentPlace?.name || '—'}</Text>
        <Button title="Start Tracking" onPress={startTracking}/>
        <Button title="Stop Tracking" onPress={stopTracking}/>
      </View>

      <Button title="Test Reminder (Simulate Leaving)" onPress={simulateLeaving} />

      
      <Button title="Recover Item" onPress={() => setRecoverVisible(true)} />

      <Button
        title="Clear History"
        color="red"
        onPress={() => {
          Alert.alert(
            'Clear History?',
            'This will erase all saved item events.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'OK', onPress: async () => {
                  setItemHistory([]);
                  await AsyncStorage.removeItem('itemHistory');
                }},
            ]
          );
        }}
      />

      {recoverVisible && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#1e293b',
            padding: 16,
            borderRadius: 12,
            width: '80%'
          }}>
            <Text style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>
              Enter Item Name
            </Text>
            <TextInput
              style={{
                backgroundColor: '#0f172a',
                color: 'white',
                padding: 8,
                borderRadius: 8,
                marginBottom: 12
              }}
              placeholder="e.g. Wallet"
              placeholderTextColor="#64748b"
              value={recoverInput}
              onChangeText={setRecoverInput}
            />
            <Button
              title="Search"
              onPress={() => {
                const suggestions = getRecoverySuggestions(recoverInput, itemHistory);
                if (suggestions.length === 0) {
                  Alert.alert("No data", "No history found for this item.");
                } else {
                  const formatted = suggestions
                    .map(s => `${s.place} (last seen ${Math.floor((Date.now()-s.lastSeen)/60000)} mins ago)`)
                    .join('\n');
                  Alert.alert("Possible Locations", formatted);
                }
                setRecoverVisible(false);
                setRecoverInput('');
              }}
            />
            <Button title="Show Map" onPress={() => setMapVisible(true)} />
            <Button title="Cancel" color="red" onPress={() => setRecoverVisible(false)} />
          </View>
        </View>
      )}
      {mapVisible && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <MapScreen history={itemHistory} onClose={() => setMapVisible(false)} />
        </View>
      )}

      <Toast /> 
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;

