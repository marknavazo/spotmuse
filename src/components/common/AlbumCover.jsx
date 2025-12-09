import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Skeleton, Box } from '@mui/material';

export default function AlbumCover({ images, alt, size = 50, className, onClick }) {
  const src = useMemo(() => {
    if (!images) return '';
    // If images is a string URL
    if (typeof images === 'string') return images;
    // If images is an array
    if (Array.isArray(images)) {
      // Spotify usually provides [{width:640},{width:300},{width:64}]
      // Choose the closest size >= requested size; else choose largest available.
      const candidates = images
        .map((img) => {
          if (!img) return null;
          if (typeof img === 'string') return { url: img, width: Infinity };
          if (typeof img === 'object') return { url: img.url, width: img.width ?? Infinity };
          return null;
        })
        .filter(Boolean);
      if (candidates.length === 0) return '';
      const sorted = candidates.sort((a, b) => (b.width || 0) - (a.width || 0));
      // Find first with width >= size
      const match = sorted.find((c) => (c.width || 0) >= size);
      return (match || sorted[0]).url || '';
    }
    // If images is an object with url
    if (typeof images === 'object' && images.url) return images.url;
    return '';
  }, [images, size]);
  // Reset loading state when image source changes so skeleton shows until new image loads
  useEffect(() => {
    setLoaded(false);
  }, [src]);
  const [loaded, setLoaded] = useState(false);
  const showSkeleton = !src || !loaded;
  const isResponsive =
    !!className &&
    (className.includes('album-card-cover') || className.includes('album-detail-cover'));
  return (
    <Box
      sx={{
        position: 'relative',
        width: isResponsive ? '100%' : size,
        height: isResponsive ? 'auto' : size,
        ...(isResponsive ? { paddingTop: '100%' } : {}),
      }}
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {src && (
        <img
          src={src}
          alt={loaded ? alt || '' : ''}
          loading="lazy"
          style={{
            position: isResponsive ? 'absolute' : 'static',
            inset: isResponsive ? 0 : 'auto',
            width: isResponsive ? '100%' : size,
            height: isResponsive ? '100%' : size,
            objectFit: 'cover',
            borderRadius: 4,
            display: 'block',
          }}
          onLoad={() => setLoaded(true)}
        />
      )}
      {showSkeleton && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <Skeleton
            variant="rounded"
            width={isResponsive ? '100%' : size}
            height={isResponsive ? '100%' : size}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      )}
    </Box>
  );
}

AlbumCover.propTypes = {
  images: PropTypes.array,
  alt: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
