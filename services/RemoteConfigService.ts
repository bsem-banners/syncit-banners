// services/RemoteConfigService.ts
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

class BannerConfigService {
  
  // Helper function to convert GitHub blob URLs to raw URLs
  static convertGitHubURL(url: string): string {
    if (url.includes('github.com') && url.includes('/blob/')) {
      // Convert: github.com/user/repo/blob/hash/file.jpg
      // To: raw.githubusercontent.com/user/repo/hash/file.jpg
      return url
        .replace('github.com', 'raw.githubusercontent.com')
        .replace('/blob/', '/');
    }
    return url;
  }
  
  static async getBannerConfig(): Promise<ImageBannerConfig> {
    try {
      console.log('🔍 Attempting to fetch banner config from Firestore...');
      
      const bannerDoc = await getDoc(doc(db, 'app-config', 'banner'));
      
      if (bannerDoc.exists()) {
        const data = bannerDoc.data();
        console.log('✅ Banner config found:', data);
        
        // Convert GitHub URL to proper raw format
        const rawImageUrl = this.convertGitHubURL(data.imageUrl || '');
        console.log('🔗 Converted image URL:', rawImageUrl);
        
        return {
          show: data.show === 'true' || data.show === true,
          imageUrl: rawImageUrl,
          clickUrl: data.clickUrl || 'https://play.google.com/store/apps/details?id=com.kairom.syncitmobile',
          width: parseInt(data.width) || 0,
          height: parseInt(data.height) || 120,
          borderRadius: parseInt(data.borderRadius) || 12,
          marginHorizontal: parseInt(data.marginHorizontal) || 16,
          marginVertical: parseInt(data.marginVertical) || 8,
        };
      } else {
        console.log('🚫 Banner document does not exist');
        return {
          show: false,
          imageUrl: '',
          clickUrl: 'https://play.google.com/store/apps/details?id=com.kairom.syncitmobile',
          width: 0,
          height: 120,
          borderRadius: 12,
          marginHorizontal: 16,
          marginVertical: 8,
        };
      }
    } catch (error) {
      console.error('❌ Error fetching banner config from Firestore:', error);
      console.log('🚫 Banner disabled or no image URL');
      
      return {
        show: false,
        imageUrl: '',
        clickUrl: '',
        width: 0,
        height: 120,
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
      };
    }
  }

  static async getCachedImageBannerConfig(): Promise<ImageBannerConfig> {
    return this.getBannerConfig();
  }

  static async fetchImageBannerConfig(): Promise<ImageBannerConfig> {
    return this.getBannerConfig();
  }
}

export default BannerConfigService;