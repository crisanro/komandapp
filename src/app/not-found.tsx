import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-2xl mb-6">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-500 text-sm mb-6">
          El link que seguiste no existe o ya no está disponible.
        </p>
        <Link
          href="/"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}