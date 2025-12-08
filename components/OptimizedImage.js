// components/OptimizedImage.js
// Optimized image components with caching using expo-image
import { Image } from 'expo-image';
import { View, StyleSheet } from 'react-native';

// Cache policy for different image types
const CACHE_POLICIES = {
  background: 'disk', // Long-term cache for backgrounds
  logo: 'memory-disk', // Keep in memory and disk
  remote: 'disk', // Cache remote images on disk
};

// Blurhash placeholders for smooth loading
const BLURHASH = {
  dark: 'L00000fQfQfQfQfQfQfQfQfQfQfQ',
  purple: 'L25E:Jt7WBayoffQfQfQfQfQfQfQ',
};

/**
 * Optimized Image component with caching
 * @param {object} props - Component props
 * @param {object|number} props.source - Image source (uri object or require())
 * @param {object} props.style - Image styles
 * @param {string} props.contentFit - How image fits container (cover, contain, fill)
 * @param {string} props.cachePolicy - Cache policy (memory, disk, memory-disk, none)
 * @param {string} props.placeholder - Blurhash placeholder
 * @param {number} props.transition - Transition duration in ms
 */
export function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  cachePolicy = 'disk',
  placeholder = BLURHASH.dark,
  transition = 200,
  ...props
}) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      placeholder={placeholder}
      placeholderContentFit="cover"
      transition={transition}
      {...props}
    />
  );
}

/**
 * Optimized Background component with blur support
 * @param {object} props - Component props
 * @param {object|number} props.source - Image source
 * @param {number} props.blurRadius - Blur radius (applied via style)
 * @param {object} props.style - Container styles
 * @param {React.ReactNode} props.children - Child components
 */
export function OptimizedBackground({
  source,
  blurRadius = 0,
  style,
  children,
  ...props
}) {
  return (
    <View style={[styles.backgroundContainer, style]}>
      <Image
        source={source}
        style={[
          StyleSheet.absoluteFillObject,
          blurRadius > 0 && { transform: [{ scale: 1.1 }] },
        ]}
        contentFit="cover"
        cachePolicy="disk"
        placeholder={BLURHASH.dark}
        placeholderContentFit="cover"
        transition={300}
        blurRadius={blurRadius}
        {...props}
      />
      {children}
    </View>
  );
}

/**
 * Logo component - optimized for memory caching
 */
export function Logo({ style, source, ...props }) {
  return (
    <Image
      source={source}
      style={style}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={150}
      {...props}
    />
  );
}

/**
 * Preload critical images for faster display
 * Call this in App.js or _layout.js during app initialization
 */
export async function preloadImages(imageSources) {
  try {
    await Image.prefetch(imageSources);
  } catch {
    // Silently handle preload failures - non-critical
  }
}

/**
 * Clear image cache (useful for debugging or when memory is low)
 */
export async function clearImageCache() {
  try {
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
  } catch {
    // Silently handle cache clear failures - non-critical
  }
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

// Export cache policies and blurhash for external use
export { CACHE_POLICIES, BLURHASH };
