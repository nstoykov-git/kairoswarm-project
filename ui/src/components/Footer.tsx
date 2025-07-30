import { Mail, Phone, MapPin, Youtube, X as XIcon } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-4 px-6 mt-8 border-t border-gray-700 text-sm">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
        <div>Kairoswarm © 2025</div>
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" /> +1 773 704 1084
          </div>
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4" /> 1801 W Diversey Parkway Unit 5, Chicago, IL 60614
          </div>
          <div className="flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" />
            <a href="mailto:hello@kairoswarm.com" className="text-blue-400 hover:underline">
              hello@kairoswarm.com
            </a>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <a href="https://www.youtube.com/@Kairoswarm" target="_blank" rel="noopener noreferrer">
              <Youtube className="w-5 h-5 text-red-500 hover:scale-110 transition" />
            </a>
            <a href="https://x.com/kairoswarm" target="_blank" rel="noopener noreferrer">
              <XIcon className="w-5 h-5 text-white hover:scale-110 transition" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
