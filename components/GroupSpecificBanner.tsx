// components/GroupSpecificBanner.tsx
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface GroupBannerConfig {
  show: boolean;
  imageUrl: string;
  clickUrl: string;
  width: number;
  height: number;
  borderRadius: number;
  marginHorizontal: number;
  marginVertical: number;
  title?: string;
}

interface GroupSpecificBannerProps {
  groupId: number;
  onClose?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function GroupSpecificBanner({ groupId, onClose }: GroupSpecificBannerProps) {
  const [banners, setBanners] = useState<GroupBannerConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: number]: boolean }>({});
  const [imageErrorStates, setImageErrorStates] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupRealtimeListener = async () => {
      try {
        setLoading(true);
        
        // Import Firestore real-time functions
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('@/config/firebase');
        
        // Listen to group document changes for banners
        unsubscribe = onSnapshot(doc(db, 'groups', groupId.toString()), (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const groupBanners = data.banners || [];
            
            // Process banners similar to your existing banner logic
            const activeBanners = groupBanners
              .filter((banner: any) => banner.show === 'true' || banner.show === true)
              .map((banner: any, _: number) => ({
                show: banner.show === 'true' || banner.show === true,
                imageUrl: convertGitHubURL(banner.imageUrl || ''),
                clickUrl: banner.clickUrl || '',
                width: parseInt(banner.width) || 0,
                height: parseInt(banner.height) || 120,
                borderRadius: parseInt(banner.borderRadius) || 12,
                marginHorizontal: parseInt(banner.marginHorizontal) || 16,
                marginVertical: parseInt(banner.marginVertical) || 8,
                title: banner.title || '',
              }));
            
            if (activeBanners.length > 0) {
              setBanners(activeBanners);
              
              // Initialize loading states for all banners
              const initialLoadingStates: { [key: number]: boolean } = {};
              activeBanners.forEach((_: GroupBannerConfig, index: number) => {
                initialLoadingStates[index] = true;
              });
              setImageLoadingStates(initialLoadingStates);
              setImageErrorStates({});
              
              console.log('✅ Group banners updated:', activeBanners.length);
            } else {
              setBanners([]);
              console.log('🚫 No active group banners');
            }
          } else {
            setBanners([]);
            console.log('🚫 Group document not found');
          }
          setLoading(false);
        }, (error) => {
          console.error('❌ Group banner listener error:', error);
          setLoading(false);
        });
        
      } catch (error) {
        console.error('❌ Error setting up group banner listener:', error);
        setLoading(false);
      }
    };

    setupRealtimeListener();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('🧹 Group banner listener cleaned up');
      }
    };
  }, [groupId]);

  // GitHub URL converter (matching your existing logic)
  const convertGitHubURL = (url: string): string => {
    if (!url) return '';
    
    if (url.includes('github.com') && url.includes('/blob/')) {
      return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    
    return url;
  };

  const handleBannerPress = async (clickUrl: string) => {
    if (!clickUrl) return;

    try {
      const canOpen = await Linking.canOpenURL(clickUrl);
      if (canOpen) {
        await Linking.openURL(clickUrl);
        console.log('🔗 Opened group banner link:', clickUrl);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('❌ Error opening URL:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleClose = (bannerIndex: number) => {
    // Remove specific banner from view
    setBanners(prev => prev.filter((_: GroupBannerConfig, index: number) => index !== bannerIndex));
    onClose?.();
  };

  const handleImageLoad = (bannerIndex: number) => {
    setImageLoadingStates(prev => ({ ...prev, [bannerIndex]: false }));
    setImageErrorStates(prev => ({ ...prev, [bannerIndex]: false }));
    console.log(`✅ Group banner ${bannerIndex} loaded successfully`);
  };

  const handleImageError = (bannerIndex: number) => {
    setImageLoadingStates(prev => ({ ...prev, [bannerIndex]: false }));
    setImageErrorStates(prev => ({ ...prev, [bannerIndex]: true }));
    console.error(`❌ Failed to load group banner ${bannerIndex}`);
  };

  // Don't show if loading or no banners
  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.bannersContainer}>
      {banners.map((banner, index) => {
        const isImageLoading = imageLoadingStates[index] || false;
        const hasImageError = imageErrorStates[index] || false;
        
        // Skip banner if image failed to load
        if (hasImageError) return null;

        // Calculate banner width (same logic as your existing banner)
        const bannerWidth = banner.width > 0 
          ? banner.width 
          : screenWidth - (banner.marginHorizontal * 2);

        return (
          <View
            key={index}
            style={[
              styles.bannerWrapper,
              {
                marginHorizontal: banner.marginHorizontal,
                marginVertical: banner.marginVertical,
              }
            ]}
          >
            {/* Optional Title */}
            {banner.title && (
              <Text style={styles.bannerTitle}>{banner.title}</Text>
            )}
            
            <TouchableOpacity
              style={[
                styles.bannerContainer,
                {
                  width: bannerWidth,
                  height: banner.height,
                  borderRadius: banner.borderRadius,
                }
              ]}
              onPress={() => handleBannerPress(banner.clickUrl)}
              disabled={isImageLoading}
              activeOpacity={0.8}
            >
              {/* Loading indicator */}
              {isImageLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              )}

              {/* Banner Image */}
              <Image
                source={{ uri: banner.imageUrl }}
                style={[
                  styles.bannerImage,
                  {
                    width: bannerWidth,
                    height: banner.height,
                    borderRadius: banner.borderRadius,
                  }
                ]}
                resizeMode="cover"
                onLoad={() => handleImageLoad(index)}
                onError={() => handleImageError(index)}
              />

              {/* Close Button Overlay */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleClose(index)}
                activeOpacity={0.7}
              >
                <View style={styles.closeButtonBackground}>
                  <X size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bannersContainer: {
    paddingTop: 8,
  },
  bannerWrapper: {
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
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