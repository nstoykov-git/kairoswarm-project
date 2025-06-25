// src/components/Footer.tsx

'use client';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white py-4 px-6 mt-8 border-t border-gray-700 text-sm">
      <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
        <div>Kairoswarm © 2025</div>
        <div className="text-center">
          Customer Support: +1 773 704 1084<br />
          1801 W Diversey Parkway Unit 5, Chicago, IL 60614
        </div>
      </div>
    </footer>
  );
}

