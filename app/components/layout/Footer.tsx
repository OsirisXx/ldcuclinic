export function Footer() {
  return (
    <footer className="bg-maroon-800 text-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <h3 className="font-bold text-lg">Liceo de Cagayan University</h3>
            <p className="text-sm text-gold-300">Clinic Scheduling System</p>
          </div>
          <div className="text-center md:text-right text-sm text-gray-300">
            <p>&copy; {new Date().getFullYear()} Liceo de Cagayan University</p>
            <p className="text-gold-300">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
