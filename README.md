# Leave-Behind Detector

A React Native **Expo** app that reminds you to take your belongings before leaving a specific area.
It uses **device GPS** to monitor when you enter or exit saved locations and sends **local notifications** as a reminder.

---

## ✨ Features

* **Item Reminders**

  * Add, toggle, or delete items you never want to forget (e.g., *umbrella, charger*).
  * Clear all items with one tap.

* **Recover Items**

  * Enter the name of the missing item to view its most recent tracked locations, using the 'Recover Items' button.

* **Saved Places**

  * Add a place by manually entering latitude/longitude or by tapping **Detect Current Location** to auto-fill coordinates.
  * Specify a radius in meters for each place.
  * Delete individual locations or clear them all.

* **Geofence & Notifications**

  * Background location tracking with Expo Location.
  * Detects when you leave a saved area and sends a local notification listing the “always-remember” items.
  * Works in foreground or background; uses iOS/Android notification APIs.

* **Testing & Simulation**

  * **Test Reminder** button simulates leaving a location to verify notifications without physically moving.

* **User Feedback**

  * Toasts (via `react-native-toast-message`) for success/info messages such as “Item List Empty” or “No Location Present.”

* **Cross-Platform Safe Area**

  * `react-native-safe-area-context` ensures UI looks correct on notched phones (iOS & Android).

---

## 🛠️ Tech Stack

* [React Native](https://reactnative.dev/) (with hooks)
* [Expo](https://expo.dev/) SDK (Location, Notifications)
* [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context)
* [react-native-toast-message](https://github.com/calintamas/react-native-toast-message)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/leave-behind-detector.git
cd leave-behind-detector
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Run the app

With Expo Go or a simulator/emulator:

```bash
npx expo start
```

Then scan the QR code with your Expo Go app or press the key for iOS/Android simulator.

---

## 📦 Project Setup Commands (recap)

These are the key commands used to bootstrap the project:

```bash
# Create project
npx create-expo-app Leave-Behind-Detector

# Install location & notifications
npx expo install expo-location expo-notifications

# Safe area context
npm install react-native-safe-area-context

# Toast messages
npm install react-native-toast-message
```

If you build a standalone app:

```bash
npx expo run:android   # or
npx expo run:ios
```

---

## ⚙️ How It Works

1. **Start Tracking** – Begins watching GPS position (`Location.watchPositionAsync`).
2. **Check Position** – On every update, calculates distance to each saved place with the Haversine formula.
3. **Enter/Exit Detection** –

   * When entering a place, sets `currentPlace` and session start time.
   * When leaving and if you stayed longer than the minimum session, calls `triggerReminder`.
4. **Trigger Reminder** – Sends a local notification and shows an in-app alert listing all items marked `always: true`.

---

## 📱 Permissions

* **Location** – Required to detect when you leave a saved area.
* **Notifications** – Required to deliver local reminders.

The app asks for permissions at runtime.

---

## 🧑‍💻 Development Notes

* Uses `SafeAreaView` with `edges={['top','bottom','left','right']}` for proper layout on devices with notches.
* All logic (state management, location watching, notifications) is contained in `App.tsx` for simplicity.

---

## 📄 License

MIT License – feel free to fork and modify.

---

### Screenshots
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 55" src="https://github.com/user-attachments/assets/84256afc-3a09-4c2a-a5a5-dadb4066b773" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 32" src="https://github.com/user-attachments/assets/d7475bb8-7890-4e98-a0a2-448d74fa140d" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 48" src="https://github.com/user-attachments/assets/f598772d-c4b5-4a5d-b406-940b0f6b4eb8" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 14" src="https://github.com/user-attachments/assets/f741186e-b43a-4a42-97cb-6e2deb1c62d4" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 14" src="https://github.com/user-attachments/assets/7800932f-29df-496e-8da3-6e9d9b6af3a3" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 14" src="https://github.com/user-attachments/assets/9c42329b-d21f-4df7-bbe9-6806838ece17" />
<img width="1080" height="1920" alt="Simulator Screenshot - iPhone 16 Pro - 2025-09-12 at 17 21 14" src="https://github.com/user-attachments/assets/7800932f-29df-496e-8da3-6e9d9b6af3a3" />






