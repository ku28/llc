import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import EditLayout from '../components/EditLayout';
import ConfirmModal from '../components/ConfirmModal';
import StatusModal from '../components/StatusModal';
import Image from 'next/image';

interface GalleryImage {
  imageUrl: string;
  order: number;
}

export default function EditGalleryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Status modal states
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'loading' as 'loading' | 'success' | 'error',
    message: ''
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(d.user);
        loadGallery();
      })
      .catch(() => {
        router.push('/');
      });
  }, []);

  async function loadGallery() {
    setStatusModal({ isOpen: true, status: 'loading', message: 'Loading gallery...' })
    try {
      const res = await fetch('/api/gallery-content');
      const data = await res.json();
      setImages(data);
      setStatusModal({ isOpen: false, status: 'loading', message: '' })
      setLoading(false);
    } catch (error) {
      console.error('Error loading gallery:', error);
      setStatusModal({ 
        isOpen: true, 
        status: 'error', 
        message: 'Failed to load gallery. Please refresh the page.' 
      })
      setLoading(false);
    }
  }

  async function handleImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setStatusModal({ isOpen: true, status: 'loading', message: 'Uploading image...' })
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              image: base64,
              folder: 'gallery'
            })
          });
          const uploadData = await uploadRes.json();
          
          if (uploadData.url) {
            // Add new image to the end of the array
            setImages([...images, { imageUrl: uploadData.url, order: images.length }]);
            setStatusModal({ 
              isOpen: true, 
              status: 'success', 
              message: 'Image uploaded successfully!' 
            })
          } else {
            throw new Error(uploadData.error || 'Upload failed')
          }
        };
      } catch (error: any) {
        console.error('Error uploading image:', error);
        setStatusModal({ 
          isOpen: true, 
          status: 'error', 
          message: error.message || 'Failed to upload image. Please try again.' 
        })
      }
    };
    input.click();
  }

  function deleteImage(index: number) {
    setDeleteIndex(index);
    setShowDeleteConfirm(true);
  }

  function confirmDelete() {
    if (deleteIndex !== null) {
      const newImages = images.filter((_, i) => i !== deleteIndex);
      // Reorder after deletion
      const reordered = newImages.map((img, i) => ({ ...img, order: i }));
      setImages(reordered);
    }
    setShowDeleteConfirm(false);
    setDeleteIndex(null);
  }

  async function handleSave() {
    setStatusModal({ isOpen: true, status: 'loading', message: 'Saving gallery...' })
    try {
      const res = await fetch('/api/gallery-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(images)
      });
      
      if (res.ok) {
        setStatusModal({ 
          isOpen: true, 
          status: 'success', 
          message: 'Gallery updated successfully!' 
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update gallery')
      }
    } catch (error: any) {
      console.error('Error saving gallery:', error);
      setStatusModal({ 
        isOpen: true, 
        status: 'error', 
        message: error.message || 'Failed to update gallery. Please try again.' 
      })
    }
  }

  function handleEditImage(index: number) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setStatusModal({ isOpen: true, status: 'loading', message: 'Uploading replacement image...' })
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const uploadRes = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              image: base64,
              folder: 'gallery'
            })
          });
          const uploadData = await uploadRes.json();
          
          if (uploadData.url) {
            const updatedImages = [...images];
            updatedImages[index].imageUrl = uploadData.url;
            setImages(updatedImages);
            setStatusModal({ 
              isOpen: true, 
              status: 'success', 
              message: 'Image replaced successfully!' 
            })
          } else {
            throw new Error(uploadData.error || 'Upload failed')
          }
        };
      } catch (error: any) {
        console.error('Error uploading image:', error);
        setStatusModal({ 
          isOpen: true, 
          status: 'error', 
          message: error.message || 'Failed to upload image. Please try again.' 
        })
      }
    };
    input.click();
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    // Update order
    newImages.forEach((img, idx) => {
      img.order = idx;
    });
    
    setImages(newImages);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  return (
    <EditLayout>
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Gallery Page</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Upload and manage gallery images</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, index) => (
              <div 
                key={index} 
                className={`relative group border-2 ${draggedIndex === index ? 'border-green-500 scale-105' : 'border-gray-300 dark:border-gray-600'} rounded-lg overflow-hidden cursor-move transition-all`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <Image
                  src={img.imageUrl}
                  alt={`Gallery ${index + 1}`}
                  width={300}
                  height={300}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleEditImage(index)}
                    className="bg-blue-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-700"
                    title="Replace image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteImage(index)}
                    className="bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    title="Delete image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  #{index + 1}
                </div>
              </div>
            ))}

            {/* Add Image Button */}
            <button
              onClick={handleImageUpload}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg h-48 flex flex-col items-center justify-center hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">Add Image</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </button>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Gallery Management Tips</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-1 space-y-1">
                <li>• Click &quot;Add Image&quot; to upload new images to the gallery</li>
                <li>• Drag and drop images to reorder them</li>
                <li>• Hover over an image and click the blue edit icon to replace it</li>
                <li>• Hover over an image and click the red trash icon to delete it</li>
                <li>• Images are automatically numbered based on their order</li>
                <li>• Click &quot;Save Changes&quot; to update the gallery on the website</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={statusModal.isOpen}
        status={statusModal.status}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </EditLayout>
  );
}
