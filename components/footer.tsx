import { Phone, MessageCircle, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-6">Nous contacter</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-blue-600" />
                <span>Téléphone : 06 12 34 56 78</span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle size={18} className="text-green-600" />
                <span>WhatsApp : 06 12 34 56 78</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-red-600" />
                <span>Email : contact@bricol.ma</span>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-6">Réseaux sociaux</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-semibold">f</span>
                <span>Facebook : @Bricol.ma</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-600 font-semibold">📷</span>
                <span>Instagram : @bricol.ma</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-semibold">▶</span>
                <span>YouTube : Bricol Channel</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-black font-semibold">♪</span>
                <span>TikTok : @bricol.ma</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
          <p>&copy; 2025 Bricol. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
