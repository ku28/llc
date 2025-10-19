"use client";
import { useState } from "react";

export default function ContactSection() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { firstName, lastName, email, phoneNumber, message } = formData;
    const formattedMessage = `Hello, I am ${firstName} ${lastName}%0A%0A` +
      `My Email: ${email}%0A` +
      `My Phone: ${phoneNumber}%0A%0A` +
      `Message: ${message}`;

    const whatsappNumber = "919915066777"; // Replace with actual number
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${formattedMessage}`;
    window.open(whatsappLink, '_blank');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section id="contact" className="container py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="mb-4">
            <h2 className="text-lg text-brand mb-2 tracking-wider">
              Contact
            </h2>

            <h2 className="text-3xl md:text-4xl mb-8 font-bold text-gray-900 dark:text-white">Connect With Us</h2>
          </div>

          <div className="flex flex-col gap-4 text-gray-700 dark:text-gray-300">
            <div>
              <div className="flex gap-2 mb-1 font-bold text-gray-900 dark:text-white">
                <span>🏢</span>
                <div>Find us</div>
              </div>
              <div>S-5, Royal Heights Royal City, Chahal Road, Faridkot 151203</div>
            </div>

            <div>
              <div className="flex gap-2 mb-1 font-bold text-gray-900 dark:text-white">
                <span>📞</span>
                <div>Call us</div>
              </div>
              <div>+91-9915066777/ 9357066777/ 9463220005</div>
            </div>

            <div>
              <div className="flex gap-2 mb-1 font-bold text-gray-900 dark:text-white">
                <span>✉️</span>
                <div>Mail US</div>
              </div>
              <div>lastleafcare@gmail.com</div>
            </div>

            <div>
              <div className="flex gap-2 mb-1 font-bold text-gray-900 dark:text-white">
                <span>🕐</span>
                <div>Visit us</div>
              </div>
              <div>
                <div>Monday - Saturday</div>
                <div>10AM - 8PM</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="grid w-full gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                placeholder="Your message..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                required
              />
            </div>

            <button 
              type="submit"
              className="mt-4 px-6 py-3 bg-brand text-white rounded-lg font-bold hover:bg-brand-600 transition-colors"
            >
              Send message
            </button>
          </form>
        </div>
      </section>
      
      <div className="mt-12">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1756997.9761557446!2d74.77041!3d30.672358!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39175958bb1dc549%3A0x66154357fca4b43d!2z8J2Xn_Cdl67wnZiA8J2YgSDwnZef8J2XsvCdl67wnZezIPCdl5bwnZeu8J2Xv_Cdl7ItIEhvbWVvcGF0aHkgQ2VudHJlL01lZGljYWwgU3RvcmUvUGhhcm1hY3kgU3RvcmUvQmVzdCBFbGVjdHJvIEhvbWVvcGF0aHkgQ2xpbmljIGluIEZhcmlka290!5e0!3m2!1sen!2sin!4v1750168841568!5m2!1sen!2sin"
          width="100%"
          height="400"
          style={{ border: 0, width: '100%', borderRadius: '0.5rem' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      </div>
    </section>
  );
}
