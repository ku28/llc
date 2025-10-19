import Image from "next/image";
import Link from "next/link";

export default function FooterSection() {
  return (
    <footer id="footer" className="w-full bg-white dark:bg-[#0a0a0a] py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="p-8 md:p-10 lg:p-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8 md:gap-12">
            {/* Logo and Brand Section */}
            <div className="col-span-1 sm:col-span-2 xl:col-span-2 flex flex-col items-center sm:items-start">
              <Link href="/" className="flex font-bold items-center group">
                <Image
                  src="https://res.cloudinary.com/dwgsflt8h/image/upload/v1750161266/logo_isxw3s.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="mr-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 group-hover:border-brand transition-colors"
                />
                <h3 className="text-2xl md:text-3xl text-gray-900 dark:text-white group-hover:text-brand transition-colors">
                  Last Leaf Care
                </h3>
              </Link>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left max-w-sm">
                An Electrohomeopathy Centre dedicated to providing holistic healthcare solutions since 1965.
              </p>
            </div>

            {/* Navigate Section */}
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Navigate</h3>
              <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Home
              </Link>
              <Link href="/about" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                About
              </Link>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Services
              </Link>
              <Link href="/gallery" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Gallery
              </Link>
              <Link href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Contact Us
              </Link>
            </div>

            {/* Services Section */}
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Services</h3>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Trigeminal Neuralgia
              </Link>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Bell&apos;s Palsy
              </Link>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Diabetes Mellitus
              </Link>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Chronic Kidney Disease
              </Link>
              <Link href="/services" className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm">
                Gallstone Treatment
              </Link>
            </div>

            {/* Socials Section */}
            <div className="flex flex-col gap-3 items-center sm:items-start">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Connect</h3>
              <Link 
                href="https://facebook.com" 
                target="_blank"
                className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm flex items-center gap-2"
              >
                <span>📘</span> Facebook
              </Link>
              <Link 
                href="https://instagram.com" 
                target="_blank"
                className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm flex items-center gap-2"
              >
                <span>📷</span> Instagram
              </Link>
              <Link 
                href="mailto:lastleafcare@gmail.com"
                className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm flex items-center gap-2"
              >
                <span>✉️</span> Email
              </Link>
              <Link 
                href="https://github.com/ku28/lastleafcare.git" 
                target="_blank"
                className="text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand transition-colors text-sm flex items-center gap-2"
              >
                <span>🔗</span> GitHub
              </Link>
            </div>
          </div>

          {/* Separator */}
          <div className="my-8 border-t border-gray-300 dark:border-gray-700"></div>

          {/* Copyright Section */}
          <section className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              2025 &copy; Last Leaf Care. All Rights Reserved.
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> | </span>
              Designed and Developed By:{" "}
              <Link
                target="_blank"
                href="https://github.com/ku28"
                className="text-brand hover:text-brand-600 font-semibold transition-colors hover:underline"
              >
                Kushagra Juneja
              </Link>
            </p>
          </section>
        </div>
      </div>
    </footer>
  );
}
