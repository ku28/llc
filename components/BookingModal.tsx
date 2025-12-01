"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useToast } from "../hooks/useToast";
import ToastNotification from "./ToastNotification";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);

  // Check if user is logged in and if profile is complete
  useEffect(() => {
    const checkUser = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        
        if (authData.user) {
          setUser(authData.user);
          
          // If user role, check if patient profile is complete
          if (authData.user.role?.toLowerCase() === 'user') {
            const patientsRes = await fetch('/api/patients');
            const patients = await patientsRes.json();
            
            const patientRecord = patients.find((p: any) => 
              p.email === authData.user.email || p.phone === authData.user.phone
            );
            
            if (patientRecord) {
              setPatientData(patientRecord);
              
              // Check if required fields are filled
              const isComplete = !!(
                authData.user.name &&
                authData.user.email &&
                authData.user.phone &&
                patientRecord.dob &&
                patientRecord.age &&
                patientRecord.gender &&
                patientRecord.address
              );
              
              setProfileComplete(isComplete);
            } else {
              setProfileComplete(false);
            }
          } else {
            // Non-user roles don't need patient profile
            setProfileComplete(true);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error checking user:', err);
        setUser(null);
        setLoading(false);
      }
    };
    
    checkUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // If user is logged in and profile is complete, show form directly
      setShowForm(!!user && profileComplete);
      // Small delay to trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowForm(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, user, profileComplete]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const { toasts, addToast, removeToast, showSuccess, showError } = useToast();

  // Pre-fill form data if user is logged in
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
        message: '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { message } = formData;
  setSubmitting(true);
    
    if (user) {
      // For logged-in users: Save request to database
      try {
        const res = await fetch('/api/appointment-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });

        if (res.ok) {
          showSuccess('Appointment request submitted. You will be notified once it is reviewed.');
        } else {
          const data = await res.json();
          showError(data.error || 'Failed to submit request');
        }
      } catch (error) {
        console.error('Error submitting request:', error);
        showError('Failed to submit appointment request');
      }
    } else {
      // For non-logged-in users: Send via WhatsApp
      const { firstName, lastName, email, phoneNumber } = formData;
      const formattedMessage = `Hello, I am ${firstName} ${lastName}%0A%0A` +
        `My Email: ${email}%0A` +
        `My Phone: ${phoneNumber}%0A%0A` +
        `Message: ${message}`;

      const whatsappNumber = "919915066777";
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${formattedMessage}`;
      window.open(whatsappLink, '_blank');
    }
    
    // Reset form and close modal
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      message: "",
    });
    setSubmitting(false);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBackdropClick = () => {
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className={`relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-300 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user ? 'Request Appointment' : 'Book Appointment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          // Loading state
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
          </div>
        ) : user && user.role?.toLowerCase() === 'user' && !profileComplete ? (
          // Incomplete profile - show "Complete Profile" button
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                Complete Your Profile
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-1">
                Please complete your profile information before booking an appointment.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Required fields: Phone Number, Date of Birth, Age, Gender, and Address
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                router.push('/profile?tab=edit');
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Complete Profile
            </button>
          </div>
        ) : !showForm ? (
          // Initial buttons view
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="w-full px-4 py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-600 transition-colors whitespace-nowrap text-sm"
            >
              Send via WhatsApp
            </button>
            <button
              onClick={() => {
                onClose();
                router.push('/user-signup');
              }}
              className="w-full px-4 py-2.5 bg-gray-700 dark:bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors whitespace-nowrap text-sm"
            >
              Book from Website
            </button>
          </div>
        ) : (
          // Form view
          <form onSubmit={handleSubmit} className="grid w-full gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand"
                required
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="lastleafcare@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Mobile Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Mobile No."
              maxLength={10}
              pattern="[0-9]{10}"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Message</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              placeholder="Your message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-brand focus:border-brand"
              required
            />
          </div>

            <div className="flex gap-3">
            {!user && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2.5 bg-brand text-white rounded-lg font-medium transition-colors whitespace-nowrap text-sm ${submitting ? 'opacity-70 cursor-wait' : 'hover:bg-brand-600'}`}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Submitting...</span>
                </div>
              ) : (user ? 'Submit Request' : 'Send via WhatsApp')}
            </button>
          </div>
        </form>
        )}
        {/* Toasts for this component */}
        <ToastNotification toasts={toasts} removeToast={removeToast} />
      </div>
    </div>
  );
}