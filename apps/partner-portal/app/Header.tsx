export default function Header() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
      <div className="text-xl font-serif text-gray-800">
        Bonjour, <span className="font-semibold text-[#D4AF37]">Sophie</span>
      </div>
      <div className="flex items-center space-x-6">
        <button className="text-sm tracking-widest text-gray-500 hover:text-gray-900 uppercase">
          Notifications
        </button>
        <button className="text-sm tracking-widest text-gray-500 hover:text-gray-900 uppercase">
          Profile
        </button>
      </div>
    </header>
  );
}
