// src/components/Footer.tsx

'use client';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-4 px-6 mt-8 border-t border-gray-700 text-sm">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
        <div>Kairoswarm © 2025</div>
        <div className="text-center">
          Customer Support: +1 773 704 1084<br />
          1801 W Diversey Parkway Unit 5, Chicago, IL 60614<br />
          <a href="mailto:nsstoykov@gmail.com" className="text-blue-400 hover:underline">Email: nsstoykov@gmail.com</a><br />
          <a href="https://www.youtube.com/playlist?list=PLbgbaZJFsPRBTfkEdrXlRFpo5Odaactyp" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            Kairoswarm YouTube Playlist
          </a>
        </div>
      </div>
    </footer>

  );
}

