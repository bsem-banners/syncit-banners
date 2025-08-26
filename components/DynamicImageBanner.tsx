// components/DynamicImageBanner.tsx

import BannerConfigService from '@/services/RemoteConfigService';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

interface ImageBannerConfig {
  show: boolean;
  imageUrl: string;
  clickUrl: string;
  width: number;
  height: number;
  borderRadius: number;
  marginHorizontal: number;
  marginVertical: number;
}

interface DynamicImageBannerProps {
  onClose?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function DynamicImageBanner({ onClose }: DynamicImageBannerProps) {
  const [bannerConfig, setBannerConfig] = useState<ImageBannerConfig | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupRealtimeListener = async () => {
      try {
        setLoading(true);
        
        // Import Firestore real-time functions
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        
        // Listen to banner config changes in real-time
        unsubscribe = onSnapshot(doc(db, 'app-config', 'banner'), (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const config = {
              show: data.show === 'true' || data.show === true,
              imageUrl: BannerConfigService.convertGitHubURL(data.imageUrl || ''),
              clickUrl: data.clickUrl || '',
              width: parseInt(data.width) || 0,
              height: parseInt(data.height) || 120,
              borderRadius: parseInt(data.borderRadius) || 12,
              marginHorizontal: parseInt(data.marginHorizontal) || 16,
              marginVertical: parseInt(data.marginVertical) || 8,
            };
            
            if (config.show && config.imageUrl) {
              setBannerConfig(config);
              setIsVisible(true);
              console.log('✅ Banner updated in real-time:', config);
            } else {
              setIsVisible(false);
              console.log('🚫 Banner disabled via real-time update');
            }
          } else {
            setIsVisible(false);
            console.log('🚫 Banner document deleted');
          }
          setLoading(false);
        }, (error) => {
          console.error('❌ Banner listener error:', error);
          setLoading(false);
        });
        
      } catch (error) {
        console.error('❌ Error setting up banner listener:', error);
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🧹 Banner listener cleaned up');
      }
    };
  }, []);

  const handleBannerPress = async () => {
    if (!bannerConfig?.clickUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(bannerConfig.clickUrl);
      if (canOpen) {
        await Linking.openURL(bannerConfig.clickUrl);
        console.log('🔗 Opened banner link:', bannerConfig.clickUrl);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('❌ Error opening URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    console.log('❌ Banner closed by user');
    onClose?.();
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
    console.log('✅ Banner image loaded successfully');
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error('❌ Failed to load banner image:', bannerConfig?.imageUrl);
  };

  // Don't show if loading, not visible, no config, or image failed
  if (loading || !isVisible || !bannerConfig || imageError) {
    return null;
  }

  // Calculate banner width
  const bannerWidth = bannerConfig.width > 0 
    ? bannerConfig.width 
    : screenWidth - (bannerConfig.marginHorizontal * 2);

  return (
    <View
      style={[
        styles.container,
        {
          marginHorizontal: bannerConfig.marginHorizontal,
          marginVertical: bannerConfig.marginVertical,
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bannerContainer,
          {
            width: bannerWidth,
            height: bannerConfig.height,
            borderRadius: bannerConfig.borderRadius,
          }
        ]}
        onPress={handleBannerPress}
        disabled={imageLoading}
        activeOpacity={0.8}
      >
        {/* Loading indicator */}
        {imageLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        )}

        {/* Banner Image */}
        <Image
          source={{ uri: bannerConfig.imageUrl }}
          style={[
            styles.bannerImage,
            {
              width: bannerWidth,
              height: bannerConfig.height,
              borderRadius: bannerConfig.borderRadius,
            }
          ]}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Close Button Overlay */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <View style={styles.closeButtonBackground}>
            <X size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bannerContainer: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bannerImage: {
    // Width and height set dynamically
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  closeButtonBackground: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});