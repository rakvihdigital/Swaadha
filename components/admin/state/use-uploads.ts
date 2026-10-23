'use client';
import { useState } from 'react';
import { uploadImage } from '@/lib/storage';
import type { AdminData } from './use-admin-data';

/** Uploading product, category and banner photos to Supabase Storage. */
export function useUploads({ setError, setNotice }: AdminData) {
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleFileUpload(file: File, bucket: 'banners' | 'products', callback: (url: string) => void) {
    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadImage(file, bucket);
      callback(url);
      setNotice(`Image uploaded to '${bucket}' bucket.`);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to upload image to bucket.');
    } finally {
      setUploadingImage(false);
    }
  }

  return { uploadingImage, handleFileUpload };
}
