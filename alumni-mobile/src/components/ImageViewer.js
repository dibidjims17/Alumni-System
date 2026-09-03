// src/components/ImageViewer.js
import React from 'react';
import { View, Image, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

// Full-screen image lightbox. Pure JS — no native deps.
export default function ImageViewer({ imageUrl, onClose }) {
  return (
    <Modal
      visible={!!imageUrl}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
