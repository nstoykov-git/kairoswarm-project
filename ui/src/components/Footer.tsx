'use client';

import { Mail, Youtube, Phone, MapPin } from 'lucide-react';
import { Twitter } from 'lucide-react'; // X is still named Twitter in Lucide

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-4 px-6 mt-8 border-t border-gray-700 text-sm">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <div>Kairoswarm © 2025</div>

        <div className="text-center leading-relaxed space-y-2">
          <div className="flex justify-center items-center space-x-2">
            <Phone className="w-4 h-4 text-blue-400" />
            <span>+1 773 704 1084</span>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>1801 W Diversey Pkwy Unit 5, Chicago, IL</span>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <Mail className="w-4 h-4 text-blue-400" />
            <a
              href="mailto:hello@kairoswarm.com"
              className="text-blue-400 hover:underline"
            >
              hello@kairoswarm.com
            </a>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <Twitter className="w-4 h-4 text-blue-400" />
            <a
              href="https://x.com/kairoswarm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              @kairoswarm
            </a>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <Youtube className="w-4 h-4 text-blue-400" />
            <a
              href="https://www.youtube.com/playlist?list=PLbgbaZJFsPRBTfkEdrXlRFpo5Odaactyp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              Faces of AI
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
