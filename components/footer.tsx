"use client";

import { Phone, MessageCircle, Mail } from "lucide-react";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    contact: "Nous contacter",
    social: "Réseaux sociaux",
    phone: "Téléphone",
    whatsapp: "WhatsApp",
    email: "Email",
    rights: "Tous droits réservés.",
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    tiktok: "TikTok",
  },
  ar: {
    contact: "تواصل معنا",
    social: "وسائل التواصل",
    phone: "الهاتف",
    whatsapp: "واتساب",
    email: "البريد الإلكتروني",
    rights: "جميع الحقوق محفوظة.",
    facebook: "فيسبوك",
    instagram: "إنستغرام",
    youtube: "يوتيوب",
    tiktok: "تيك توك",
  },
} as const;

export default function Footer() {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200 py-12 px-4" dir={dir}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-6">{t.contact}</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-blue-600" />
                <span>
                  {t.phone} : 06 12 34 56 78
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MessageCircle size={18} className="text-green-600" />
                <span>
                  {t.whatsapp} : 06 12 34 56 78
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-red-600" />
                <span>
                  {t.email} : contact@bricola.ma
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-6">{t.social}</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-semibold">f</span>
                <span>
                  {t.facebook} : @bricola.ma
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-pink-600 font-semibold">📷</span>
                <span>
                  {t.instagram} : @bricola.ma
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-semibold">▶</span>
                <span>
                  {t.youtube} : Bricola Channel
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-black font-semibold">♪</span>
                <span>
                  {t.tiktok} : @bricola.ma
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-500">
          <p>&copy; 2025 Bricola. {t.rights}</p>
        </div>
      </div>
    </footer>
  );
}
