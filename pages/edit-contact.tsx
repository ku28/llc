import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import EditLayout from '../components/EditLayout';
import StatusModal from '../components/StatusModal';

interface ContactInfo {
  address: string;
  phone: string;
  email: string;
  hours: string;
}

export default function EditContactPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [content, setContent] = useState<ContactInfo>({
    address: '',
    phone: '',
    email: '',
    hours: ''
  });
  const [loading, setLoading] = useState(true);
  
  // Status modal states
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'loading' as 'loading' | 'success' | 'error',
    message: ''
  });

  useEffect(() => {
    // Show loading modal immediately
    setStatusModal({ isOpen: true, status: 'loading', message: 'Loading contact information...' })
    
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'admin') {
          setStatusModal({ isOpen: false, status: 'loading', message: '' })
          router.push('/');
          return;
        }
        setUser(d.user);
        loadContent();
      })
      .catch(() => {
        setStatusModal({ isOpen: false, status: 'loading', message: '' })
        router.push('/');
      });
  }, []);

  async function loadContent() {
    try {
      const res = await fetch('/api/contact-info');
      const data = await res.json();
      setContent(data);
      setLoading(false);
      setStatusModal({ isOpen: false, status: 'loading', message: '' })
    } catch (error) {
      console.error('Error loading contact info:', error);
      setLoading(false);
      setStatusModal({ 
        isOpen: true, 
        status: 'error', 
        message: 'Failed to load contact information. Please try again.' 
      })
    }
  }

  async function handleSave() {
    setStatusModal({ isOpen: true, status: 'loading', message: 'Saving contact information...' })
    try {
      const res = await fetch('/api/contact-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      
      if (res.ok) {
        setStatusModal({ 
          isOpen: true, 
          status: 'success', 
          message: 'Contact information updated successfully!' 
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update contact information')
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      setStatusModal({ 
        isOpen: true, 
        status: 'error', 
        message: error.message || 'Failed to update contact information. Please try again.' 
      })
    }
  }

  return (
    <EditLayout>
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Contact Page</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Update your contact information</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Address</label>
            <textarea
              value={content.address}
              onChange={(e) => setContent({ ...content, address: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter physical address (use line breaks for formatting)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phone Number</label>
            <input
              type="tel"
              value={content.phone}
              onChange={(e) => setContent({ ...content, phone: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
            <input
              type="email"
              value={content.email}
              onChange={(e) => setContent({ ...content, email: e.target.value })}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="info@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Business Hours</label>
            <textarea
              value={content.hours}
              onChange={(e) => setContent({ ...content, hours: e.target.value })}
              rows={4}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Monday - Friday: 9:00 AM - 6:00 PM&#10;Saturday: 10:00 AM - 4:00 PM&#10;Sunday: Closed"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all"
          >
            Save Changes
          </button>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Instructions:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>Update your contact information in the fields above</li>
            <li>Use line breaks in Address and Hours fields for better formatting</li>
            <li>Make sure email and phone are correctly formatted</li>
            <li>Click &quot;Save Changes&quot; to update the information</li>
            <li>Use the navigation above to edit other pages</li>
          </ul>
        </div>
      </div>

      <StatusModal
        isOpen={statusModal.isOpen}
        status={statusModal.status}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
      />
    </EditLayout>
  );
}
