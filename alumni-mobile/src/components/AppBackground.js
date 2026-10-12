// src/components/AppBackground.js
// App-wide dimmed backdrop: the alumni background artwork at low opacity
// so content stays readable. Place as the FIRST child of a root container
// whose own background is transparent.
// Usage: <View style={{ flex: 1, backgroundColor: 'transparent' }}><AppBackground />...</View>
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

export default function AppBackground({ opacity = 0.1 }) {
  return (
    <ImageBackground
      source={require('../../assets/background.png')}
      style={StyleSheet.absoluteFill}
      imageStyle={{ opacity }}
      resizeMode="cover"
      pointerEvents="none"
    />
  );
}
