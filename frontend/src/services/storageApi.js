import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Use the default storage bucket configured in Firebase app (from firebaseConfig)

export const uploadBookImage = async (file) => {
  if (!file) {
    throw new Error('No file selected');
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or WebP image.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.');
  }

  try {
    // Create storage path: books/{timestamp}_{filename}
    const timestamp = Date.now();
    const fileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    const storagePath = `books/${timestamp}_${fileName}`;

    // Upload file
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);

    // Get public download URL
    const publicUrl = await getDownloadURL(storageRef);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    const code = error?.code || 'UNKNOWN_ERROR';
    const message = error?.message || String(error);
    throw new Error(`Failed to upload image (${code}): ${message}`);
  }
};
