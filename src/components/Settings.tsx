import React from 'react';
import { Settings as SettingsIcon, Globe, Check, ChevronRight, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ja', name: 'Japanese', native: '日本語' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
] as const;

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="h-full flex flex-col bg-paper relative overflow-hidden font-pixel selection:bg-accent/10 selection:text-accent">
      {/* Immersive Background */}
      <div className="absolute inset-0 atmosphere pointer-events-none opacity-50" />
      
      <div className="relative z-10 flex-1 overflow-y-auto p-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-accent">
              <SettingsIcon size={48} strokeWidth={1.5} />
              <h2 className="text-6xl font-bold tracking-tight text-ink">{t('settingsTitle')}</h2>
            </div>
            <p className="text-ink-muted text-xl font-bold tracking-widest max-w-2xl">
              {t('settingsDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {/* Language Section */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b-4 border-ink pb-4">
                <Globe size={24} className="text-accent" />
                <h3 className="text-2xl font-bold tracking-widest uppercase">{t('languageSection')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={cn(
                      "group p-6 border-4 border-ink transition-all duration-300 flex items-center justify-between relative",
                      language === lang.code
                        ? "bg-ink text-paper shadow-[-8px_8px_0px_0px_var(--color-accent)]"
                        : "bg-card-bg text-ink hover:bg-paper shadow-[8px_8px_0px_0px_var(--color-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-bold tracking-widest opacity-50 mb-1 uppercase">{lang.name}</span>
                      <span className="text-xl font-bold">{lang.native}</span>
                    </div>
                    {language === lang.code ? (
                      <Check size={24} className="text-accent" />
                    ) : (
                      <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-ink-muted text-xs font-bold tracking-widest italic">
                {t('languageNote')}
              </p>
            </section>

            {/* Placeholder for future settings */}
            <section className="space-y-8 opacity-40 grayscale pointer-events-none">
              <div className="flex items-center gap-4 border-b-4 border-ink pb-4">
                <ShieldCheck size={24} className="text-accent" />
                <h3 className="text-2xl font-bold tracking-widest uppercase">{t('securitySection')}</h3>
              </div>
              <div className="p-10 border-4 border-dashed border-ink bg-card-bg/50">
                <p className="text-center font-bold tracking-widest">{t('securityNote')}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
