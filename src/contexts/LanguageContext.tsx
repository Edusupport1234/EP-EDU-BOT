import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'hi' | 'ta' | 'ms';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // App / Login
  initializing: { 
    en: 'Initializing Assistant...', 
    es: 'Inicializando Asistente...', 
    fr: 'Initialisation de l\'Assistant...', 
    de: 'Assistent wird initialisiert...', 
    zh: '正在初始化助手...', 
    ja: 'アシスタントを初期化中...',
    hi: 'सहायक प्रारंभ हो रहा है...',
    ta: 'உதவியாளர் தொடங்குகிறது...',
    ms: 'Memulakan Pembantu...'
  },
  knowledgeAssistant: { 
    en: 'Knowledge Assistant', 
    es: 'Asistente de Conocimiento', 
    fr: 'Assistant de Connaissance', 
    de: 'Wissensassistent', 
    zh: '知识助手', 
    ja: 'ナレッジアシスタント',
    hi: 'ज्ञान सहायक',
    ta: 'அறிவு உதவியாளர்',
    ms: 'Pembantu Pengetahuan'
  },
  connectKnowledge: { 
    en: 'Connect your organizational knowledge base to a powerful AI assistant.', 
    es: 'Conecte su base de conocimientos organizacional a un potente asistente de IA.', 
    fr: 'Connectez votre base de connaissances organisationnelle à un puissant assistant IA.', 
    de: 'Verbinden Sie Ihre organisationale Wissensdatenbank mit einem leistungsstarken KI-Assistenten.', 
    zh: '将您的组织知识库连接到强大的 AI 助手。', 
    ja: '組織のナレッジベースを強力なAIアシスタントに接続します。',
    hi: 'अपने संगठनात्मक ज्ञान आधार को एक शक्तिशाली एआई सहायक से जोड़ें।',
    ta: 'உங்கள் நிறுவன அறிவுத் தளத்தை ஒரு சக்திவாய்ந்த AI உதவியாளருடன் இணைக்கவும்.',
    ms: 'Sambungkan pangkalan pengetahuan organisasi anda kepada pembantu AI yang berkuasa.'
  },
  signInGoogle: { 
    en: 'Sign in with Google', 
    es: 'Iniciar sesión con Google', 
    fr: 'Se connecter with Google', 
    de: 'Mit Google anmelden', 
    zh: '使用 Google 登录', 
    ja: 'Googleでサインイン',
    hi: 'Google के साथ साइन इन करें',
    ta: 'Google மூலம் உள்நுழையவும்',
    ms: 'Log masuk dengan Google'
  },
  secureAuth: { 
    en: 'Secure Enterprise Authentication', 
    es: 'Autenticación Empresarial Segura', 
    fr: 'Authentification Entreprise Sécurisée', 
    de: 'Sichere Enterprise-Authentifizierung', 
    zh: '安全的企业级身份验证', 
    ja: '安全なエンタープライズ認証',
    hi: 'सुरक्षित एंटरप्राइज प्रमाणीकरण',
    ta: 'பாதுகாப்பான நிறுவன அங்கீகாரம்',
    ms: 'Pengesahan Perusahaan Selamat'
  },
  
  // Sidebar
  repository: { 
    en: 'Repository', 
    es: 'Repositorio', 
    fr: 'Répertoire', 
    de: 'Repository', 
    zh: '知识库', 
    ja: 'リポジトリ',
    hi: 'रिपॉजिटरी',
    ta: 'களஞ்சியம்',
    ms: 'Repositori'
  },
  assistant: { 
    en: 'Assistant', 
    es: 'Asistente', 
    fr: 'Assistant', 
    de: 'Assistent', 
    zh: '助手', 
    ja: 'アシスタント',
    hi: 'सहायक',
    ta: 'உதவியாளர்',
    ms: 'Pembantu'
  },
  calendar: { 
    en: 'Calendar', 
    es: 'Calendario', 
    fr: 'Calendrier', 
    de: 'Kalender', 
    zh: '日历', 
    ja: 'カレンダー',
    hi: 'कैलेंडर',
    ta: 'நாட்காட்டி',
    ms: 'Kalendar'
  },
  settings: { 
    en: 'Settings', 
    es: 'Ajustes', 
    fr: 'Paramètres', 
    de: 'Einstellungen', 
    zh: '设置', 
    ja: '設定',
    hi: 'सेटिंग्स',
    ta: 'அமைப்புகள்',
    ms: 'Tetapan'
  },
  toggleTheme: { 
    en: 'Toggle Theme', 
    es: 'Cambiar Tema', 
    fr: 'Changer le Thème', 
    de: 'Design ändern', 
    zh: '切换主题', 
    ja: 'テーマ切替',
    hi: 'थी目 बदलें',
    ta: 'தீம் மாற்றவும்',
    ms: 'Tukar Tema'
  },
  logout: { 
    en: 'Logout', 
    es: 'Cerrar Sesión', 
    fr: 'Déconnexion', 
    de: 'Abmelden', 
    zh: '登出', 
    ja: 'ログアウト',
    hi: 'लॉगआउट',
    ta: 'வெளியேறு',
    ms: 'Log keluar'
  },
  
  // Settings Page
  settingsTitle: { 
    en: 'Settings', 
    es: 'Ajustes', 
    fr: 'Paramètres', 
    de: 'Einstellungen', 
    zh: '设置', 
    ja: '設定',
    hi: 'सेटिंग्स',
    ta: 'அமைப்புகள்',
    ms: 'Tetapan'
  },
  settingsDesc: { 
    en: 'Configure your intelligence environment and interface preferences.', 
    es: 'Configure su entorno de inteligencia y preferencias de interfaz.', 
    fr: 'Configurez votre environnement d\'intelligence et vos préférences d\'interface.', 
    de: 'Konfigurieren Sie Ihre Intelligenzumgebung und Schnittstellenpräferenzen.', 
    zh: '配置您的智能环境和界面偏好。', 
    ja: 'インテリジェンス環境とインターフェース設定を構成します。',
    hi: 'अपने इंटेलिजेंस वातावरण और इंटरफ़ेस प्राथमिकताओं को कॉन्फ़िगर करें।',
    ta: 'உங்கள் நுண்ணறிவு சூழல் மற்றும் இடைமுக விருப்பங்களை உள்ளமைக்கவும்.',
    ms: 'Konfigurasikan persekitaran kecerdasan dan pilihan antara muka anda.'
  },
  languageSection: { 
    en: 'Language & Localization', 
    es: 'Idioma y Localización', 
    fr: 'Langue et Localisation', 
    de: 'Sprache & Lokalisierung', 
    zh: '语言与本地化', 
    ja: '言語とローカリゼーション',
    hi: 'भाषा और स्थानीयकरण',
    ta: 'மொழி மற்றும் உள்ளூர்மயமாக்கல்',
    ms: 'Bahasa & Penempatan'
  },
  languageNote: { 
    en: '* Note: Language settings affect interface labels. Content translation is handled by the AI Core.', 
    es: '* Nota: Los ajustes de idioma afectan a las etiquetas de la interfaz. La traducción del contenido es gestionada por el Núcleo de IA.', 
    fr: '* Note : Les paramètres de langue affectent les libellés de l\'interface. La traducción du contenu est gérée par le Cœur d\'IA.', 
    de: '* Hinweis: Spracheinstellungen wirken sich auf die Schnittstellenbeschriftungen aus. Die Inhaltsübersetzung wird vom KI-Kern übernommen.', 
    zh: '* 注意：语言设置影响界面标签。内容翻译由 AI 核心处理。', 
    ja: '* 注：言語設定はインターフェースのラベルに影響します。コンテンツの翻訳はAIコアによって処理されます。',
    hi: '* नोट: भाषा सेटिंग्स इंटरफ़ेस लेबल को प्रभावित करती हैं। सामग्री अनुवाद एआई कोर द्वारा नियंत्रित किया जाता है।',
    ta: '* குறிப்பு: மொழி அமைப்புகள் இடைமுக லேபிள்களைப் பாதிக்கும். உள்ளடக்க மொழிபெயர்ப்பு AI கோர் மூலம் கையாளப்படுகிறது.',
    ms: '* Nota: Tetapan bahasa mempengaruhi label antara muka. Terjemahan kandungan dikendalikan oleh AI Core.'
  },
  securitySection: { 
    en: 'Security & Privacy', 
    es: 'Seguridad y Privacidad', 
    fr: 'Sécurité et Confidentialité', 
    de: 'Sicherheit & Datenschutz', 
    zh: '安全与隐私', 
    ja: 'セキュリティとプライバシー',
    hi: 'सुरक्षा और गोपनीयता',
    ta: 'பாதுகாப்பு மற்றும் தனியுரிமை',
    ms: 'Keselamatan & Privasi'
  },
  securityNote: { 
    en: 'Advanced encryption and access controls coming soon.', 
    es: 'Próximamente controles de acceso y cifrado avanzado.', 
    fr: 'Chiffrement avancé et contrôles d\'accès bientôt disponibles.', 
    de: 'Erweiterte Verschlüsselung und Zugriffskontrollen in Kürze verfügbar.', 
    zh: '高级加密和访问控制即将推出。', 
    ja: '高度な暗号化とアクセス制御がまもなく登場します。',
    hi: 'उन्नत एन्क्रिप्शन और एक्सेस कंट्रोल जल्द ही आ रहे हैं।',
    ta: 'மேம்பட்ட குறியாக்கம் மற்றும் அணுகல் கட்டுப்பாடுகள் விரைவில் வரும்.',
    ms: 'Penyulitan lanjutan dan kawalan akses akan datang tidak lama lagi.'
  },

  // Knowledge Base
  intelligenceIndex: { 
    en: 'Intelligence Index', 
    es: 'Índice de Inteligencia', 
    fr: 'Index d\'Intelligence', 
    de: 'Intelligenz-Index', 
    zh: '智能索引', 
    ja: 'インテリジェンス・インデックス',
    hi: 'इंटेलिजेंस इंडेक्स',
    ta: 'நுண்ணறிவு அட்டவணை',
    ms: 'Indeks Kecerdasan'
  },
  searchKnowledge: { 
    en: 'Search the intelligence base...', 
    es: 'Buscar en la base de inteligencia...', 
    fr: 'Rechercher dans la base d\'intelligence...', 
    de: 'Wissensdatenbank durchsuchen...', 
    zh: '搜索智能库...', 
    ja: 'インテリジェンスベースを検索...',
    hi: 'इंटेलिजेंस बेस खोजें...',
    ta: 'நுண்ணறிவு தளத்தைத் தேடுங்கள்...',
    ms: 'Cari pangkalan kecerdasan...'
  },
  addEntry: { 
    en: 'New entry', 
    es: 'Nueva entrada', 
    fr: 'Nouvelle entrée', 
    de: 'Neuer Eintrag', 
    zh: '新条目', 
    ja: '新規エントリ',
    hi: 'नई प्रविष्टि',
    ta: 'புதிய பதிவு',
    ms: 'Entri baru'
  },
  recycleBin: { 
    en: 'Recycle Bin', 
    es: 'Papelera de Reciclaje', 
    fr: 'Corbeille', 
    de: 'Papierkorb', 
    zh: '回收站', 
    ja: 'ゴミ箱',
    hi: 'रीसायकल बिन',
    ta: 'மறுசுழற்சி தொட்டி',
    ms: 'Tong Kitar Semula'
  },
  favorites: { 
    en: 'Favorites', 
    es: 'Favoritos', 
    fr: 'Favoris', 
    de: 'Favoriten', 
    zh: '收藏夹', 
    ja: 'お気に入り',
    hi: 'पसंदीदा',
    ta: 'பிடித்தவை',
    ms: 'Kegemaran'
  },
  curatedIntelligence: { 
    en: 'Curated Organizational Intelligence', 
    es: 'Inteligencia Organizacional Curada', 
    fr: 'Intelligence Organisationnelle Curatée', 
    de: 'Kuratierte organisationale Intelligenz', 
    zh: '策划的组织智能', 
    ja: '厳選された組織インテリジェンス',
    hi: 'क्यूरेटेड संगठनात्मक इंटेलिजेंस',
    ta: 'தொகுக்கப்பட்ட நிறுவன நுண்ணறிவு',
    ms: 'Kecerdasan Organisasi Terpilih'
  },
  purgedIntelligence: { 
    en: 'Recently Purged Intelligence', 
    es: 'Inteligencia Purgada Recientemente', 
    fr: 'Intelligence Récemment Purgée', 
    de: 'Kürzlich gelöschte Intelligenz', 
    zh: '最近清除的智能', 
    ja: '最近削除されたインテリジェンス',
    hi: 'हाल ही में हटाई गई इंटेलिजेंस',
    ta: 'சமீபத்தில் நீக்கப்பட்ட நுண்ணறிவு',
    ms: 'Kecerdasan yang Dibuang Baru-baru Ini'
  },
  refineEntry: { 
    en: 'Refine entry', 
    es: 'Refinar entrada', 
    fr: 'Affiner l\'entrée', 
    de: 'Eintrag verfeinern', 
    zh: '优化条目', 
    ja: 'エントリを洗練',
    hi: 'प्रविष्टि को परिष्कृत करें',
    ta: 'பதிவைச் செம்மைப்படுத்தவும்',
    ms: 'Haluskan entri'
  },
  newIntelligenceTitle: { 
    en: 'New intelligence', 
    es: 'Nueva inteligencia', 
    fr: 'Nouvelle intelligence', 
    de: 'Neue Intelligenz', 
    zh: '新智能', 
    ja: '新規インテリジェンス',
    hi: 'नई इंटेलिजेंस',
    ta: 'புதிய நுண்ணறிவு',
    ms: 'Kecerdasan baru'
  },
  acquisitionProtocol: { 
    en: 'Intelligence Acquisition Protocol', 
    es: 'Protocolo de Adquisición de Inteligencia', 
    fr: 'Protocole d\'Acquisition d\'Intelligence', 
    de: 'Intelligenz-Erfassungsprotokoll', 
    zh: '智能获取协议', 
    ja: 'インテリジェンス取得プロトコル',
    hi: 'इंटेलिजेंस अधिग्रहण प्रोटोकॉल',
    ta: 'நுண்ணறிவு கையகப்படுத்தும் நெறிமுறை',
    ms: 'Protokol Pemerolehan Kecerdasan'
  },
  committing: { 
    en: 'Committing...', 
    es: 'Confirmando...', 
    fr: 'Validation...', 
    de: 'Wird übertragen...', 
    zh: '正在提交...', 
    ja: 'コミット中...',
    hi: 'प्रतिबद्ध हो रहा है...',
    ta: 'பதிவு செய்யப்படுகிறது...',
    ms: 'Menyimpan...'
  },
  commitChanges: { 
    en: 'Commit changes', 
    es: 'Confirmar cambios', 
    fr: 'Valider les modifications', 
    de: 'Änderungen übernehmen', 
    zh: '提交更改', 
    ja: '変更をコミット',
    hi: 'परिवर्तन सहेजें',
    ta: 'மாற்றங்களைச் சேமிக்கவும்',
    ms: 'Simpan perubahan'
  },
  commitRepository: { 
    en: 'Commit to repository', 
    es: 'Confirmar al repositorio', 
    fr: 'Valider dans le répertoire', 
    de: 'In Repository übernehmen', 
    zh: '提交到知识库', 
    ja: 'リポジトリにコミット',
    hi: 'रिपॉजिटरी में सहेजें',
    ta: 'களஞ்சியத்தில் சேமிக்கவும்',
    ms: 'Simpan ke repositori'
  },
  moveToRecycle: { 
    en: 'Move to recycle bin?', 
    es: '¿Mover a la papelera?', 
    fr: 'Déplacer vers la corbeille ?', 
    de: 'In den Papierkorb verschieben?', 
    zh: '移动到回收站？', 
    ja: 'ゴミ箱に移動しますか？',
    hi: 'रीसायकल बिन में ले जाएं?',
    ta: 'மறுசுழற்சி தொட்டிக்கு நகர்த்தவா?',
    ms: 'Pindah ke tong kitar semula?'
  },
  confirmDeleteChunk: { 
    en: 'This intelligence will be moved to the recycle bin. You can restore it later if needed.', 
    es: 'Esta inteligencia se moverá a la papelera. Puede restaurarla más tarde si es necesario.', 
    fr: 'Cette intelligence sera déplacée vers la corbeille. Vous pourrez la restaurer plus tard si nécessaire.', 
    de: 'Diese Intelligenz wird in den Papierkorb verschoben. Sie können sie bei Bedarf später wiederherstellen.', 
    zh: '此智能将被移动到回收站。如果需要，您可以稍后恢复它。', 
    ja: 'このインテリジェンスはゴミ箱に移動されます。必要に応じて後で復元できます。',
    hi: 'यह इंटेलिजेंस रीसायकल बिन में ले जाया जाएगा। यदि आवश्यक हो तो आप इसे बाद में पुनर्स्थापित कर सकते हैं।',
    ta: 'இந்த நுண்ணறிவு மறுசுழற்சி தொட்டிக்கு நகர்த்தப்படும். தேவைப்பட்டால் பின்னர் மீட்டெடுக்கலாம்.',
    ms: 'Kecerdasan ini akan dipindahkan ke tong kitar semula. Anda boleh memulihkannya kemudian jika perlu.'
  },
  confirmDeleteCategory: { 
    en: 'This classification will be moved to the recycle bin. This will move ALL associated intelligence entries.', 
    es: 'Esta clasificación se moverá a la papelera. Esto moverá TODAS las entradas de inteligencia asociadas.', 
    fr: 'Cette classification sera déplacée vers la corbeille. Cela déplacera TOUTES les entrées d\'intelligence asociadas.', 
    de: 'Diese Klassifizierung wird in den Papierkorb verschoben. Dadurch werden ALLE zugehörigen Intelligenzeinträge verschoben.', 
    zh: '此分类将被移动到回收站。这将移动所有关联的智能条目。', 
    ja: 'この分類はゴミ箱に移動されます。これにより、関連するすべてのインテリジェンスエントリが移動されます。',
    hi: 'यह वर्गीकरण रीसायकल बिन में ले जाया जाएगा। यह सभी संबंधित इंटेलिजेंस प्रविष्टियों को स्थानांतरित कर देगा।',
    ta: 'இந்த வகைப்பாடு மறுசுழற்சி தொட்டிக்கு நகர்த்தப்படும். இது தொடர்புடைய அனைத்து நுண்ணறிவு பதிவுகளையும் நகர்த்தும்.',
    ms: 'Klasifikasi ini akan dipindahkan ke tong kitar semula. Ini akan memindahkan SEMUA entri kecerdasan yang berkaitan.'
  },
  cancel: { 
    en: 'Cancel', 
    es: 'Cancelar', 
    fr: 'Annuler', 
    de: 'Abbrechen', 
    zh: '取消', 
    ja: 'キャンセル',
    hi: 'रद्द करें',
    ta: 'ரத்துசெய்',
    ms: 'Batal'
  },
  confirm: { 
    en: 'Confirm', 
    es: 'Confirmar', 
    fr: 'Confirmer', 
    de: 'Bestätigen', 
    zh: '确认', 
    ja: '確認',
    hi: 'पुष्टि करें',
    ta: 'உறுதிப்படுத்து',
    ms: 'Sahkan'
  },
  categories: { 
    en: 'Categories', 
    es: 'Categorías', 
    fr: 'Catégories', 
    de: 'Kategorien', 
    zh: '类别', 
    ja: 'カテゴリー',
    hi: 'श्रेणियाँ',
    ta: 'வகைகள்',
    ms: 'Kategori'
  },
  allCategories: { 
    en: 'All Categories', 
    es: 'Todas las Categorías', 
    fr: 'Toutes les Catégories', 
    de: 'Alle Kategorien', 
    zh: '所有类别', 
    ja: 'すべてのカテゴリー',
    hi: 'सभी श्रेणियाँ',
    ta: 'அனைத்து வகைகள்',
    ms: 'Semua Kategori'
  },
  noEntries: { 
    en: 'No intelligence entries found.', 
    es: 'No se encontraron entradas de inteligencia.', 
    fr: 'Aucune entrée d\'intelligence trouvée.', 
    de: 'Keine Intelligenzeinträge gefunden.', 
    zh: '未找到智能条目。', 
    ja: 'インテリジェンス・エントリが見つかりません。',
    hi: 'कोई इंटेलिजेंस प्रविष्टि नहीं मिली।',
    ta: 'நுண்ணறிவு பதிவுகள் எதுவும் கிடைக்கவில்லை.',
    ms: 'Entri kecerdasan ditemui.'
  },
  categoryEmpty: { 
    en: 'This category is empty', 
    es: 'Esta categoría está vacía', 
    fr: 'Cette catégorie est vide', 
    de: 'Diese Kategorie ist leer', 
    zh: '此类别为空', 
    ja: 'このカテゴリーは空です',
    hi: 'यह श्रेणी खाली है',
    ta: 'இந்த வகை காலியாக உள்ளது',
    ms: 'Kategori ini kosong'
  },
  noArchivesFound: { en: 'No matching archives found', es: 'No se encontraron archivos coincidentes', fr: 'Aucune archive correspondante trouvée', de: 'Keine passenden Archive gefunden', zh: '未找到匹配的档案', ja: '一致するアーカイブが見つかりません', hi: 'कोई मिलान अभिलेखागार नहीं मिला', ta: 'பொருந்தும் காப்பகங்கள் எதுவும் கிடைக்கவில்லை', ms: 'Tiada arkib yang sepadan ditemui' },
  archiveIntelligence: { en: 'Archive intelligence?', es: '¿Archivar inteligencia?', fr: 'Archiver l\'intelligence ?', de: 'Intelligenz archivieren?', zh: '归档智能？', ja: 'インテリジェンスをアーカイブしますか？', hi: 'इंटेलिजेंस आर्काइव करें?', ta: 'நுண்ணறிவை காப்பகப்படுத்தவா?', ms: 'Arkibkan kecerdasan?' },
  purgeAllArchives: { en: 'ALL INTELLIGENCE SESSIONS WILL BE PURGED FROM THE ARCHIVES. THIS ACTION IS IRREVERSIBLE.', es: 'TODAS LAS SESIONES DE INTELIGENCIA SERÁN PURGADAS DE LOS ARCHIVOS. ESTA ACCIÓN ES IRREVERSIBLE.', fr: 'TOUTES LES SESSIONS D\'INTELLIGENCE SERONT PURGÉES DES ARCHIVES. CETTE ACTION EST IRRÉVERSIBLE.', de: 'ALLE INTELLIGENZSITZUNGEN WERDEN AUS DEN ARCHIVEN GELÖSCHT. DIESE AKTION IST IRREVERSIBEL.', zh: '所有智能会话将从档案中清除。此操作不可逆。', ja: 'すべてのインテリジェンスセッションがアーカイブから消去されます。この操作は取り消せません。', hi: 'सभी इंटेलिजेंस सत्रों को अभिलेखागार से हटा दिया जाएगा। यह क्रिया अपरिवर्तनीय है।', ta: 'அனைத்து நுண்ணறிவு அமர்வுகளும் காப்பகங்களிலிருந்து நீக்கப்படும். இந்த நடவடிக்கை மாற்ற முடியாதது.', ms: 'SEMUA SESI KECERDASAN AKAN DIBUANG DARIPADA ARKIB. TINDAKAN INI TIDAK BOLEH DIUBAH.' },
  purgeSession: { en: 'THE SESSION WILL BE PURGED. THIS ACTION IS IRREVERSIBLE.', es: 'LA SESIÓN SERÁ PURGADA. ESTA ACCIÓN ES IRREVERSIBLE.', fr: 'LA SESSION SERA PURGÉE. CETTE ACTION EST IRRÉVERSIBLE.', de: 'DIE SITZUNG WIRD GELÖSCHT. DIESE AKTION IST IRREVERSIBEL.', zh: '会话将被清除。此操作不可逆。', ja: 'セッションが消去されます。この操作は取り消せません。', hi: 'सत्र हटा दिया जाएगा। यह क्रिया अपरिवर्तनीय है।', ta: 'அமர்வு நீக்கப்படும். இந்த நடவடிக்கை மாற்ற முடியாதது.', ms: 'SESI AKAN DIBUANG. TINDAKAN INI TIDAK BOLEH DIUBAH.' },
  archive: { en: 'Archive', es: 'Archivo', fr: 'Archive', de: 'Archiv', zh: '档案', ja: 'アーカイブ', hi: 'अभिलेखागार', ta: 'காப்பகம்', ms: 'Arkib' },
  intelligenceVisualization: { en: 'Intelligence Visualization: ', es: 'Visualización de Inteligencia: ', fr: 'Visualisation d\'Intelligence : ', de: 'Intelligenz-Visualisierung: ', zh: '智能可视化：', ja: 'インテリジェンスの可視化：', hi: 'इंटेलिजेंस विज़ुஅலைज़ेशन: ', ta: 'நுண்ணறிவு காட்சிப்படுத்தல்: ', ms: 'Visualisasi Kecerdasan: ' },
  mediaIntelligence: { en: 'Media Intelligence: ', es: 'Inteligencia de Medios: ', fr: 'Intelligence Média : ', de: 'Medien-Intelligenz: ', zh: '媒体智能：', ja: 'メディア・インテリジェンス：', hi: 'मीडिया इंटेलिजेंस: ', ta: 'ஊடக நுண்ணறிவு: ', ms: 'Kecerdasan Media: ' },
  source: { en: 'Source: ', es: 'Fuente: ', fr: 'Source : ', de: 'Quelle: ', zh: '来源：', ja: 'ソース：', hi: 'स्रोत: ', ta: 'ஆதாரம்: ', ms: 'Sumber: ' },
  synthesizingIntelligence: { en: 'Synthesizing intelligence...', es: 'Sintetizando inteligencia...', fr: 'Synthèse de l\'intelligence...', de: 'Intelligenz wird synthetisiert...', zh: '正在合成智能...', ja: 'インテリジェンスを合成中...', hi: 'इंटेलिजेंस का संश्लेषण हो रहा है...', ta: 'நுண்ணறிவை ஒருங்கிணைக்கிறது...', ms: 'Mensintesis kecerdasan...' },
  inquirePlaceholder: { en: 'Inquire about the intelligence base...', es: 'Consulte sobre la base de inteligencia...', fr: 'Demander sur la base d\'intelligence...', de: 'Fragen Sie die Wissensdatenbank ab...', zh: '查询智能库...', ja: 'インテリジェンスベースについて問い合わせる...', hi: 'इंटेलिजेंस बेस के बारे में पूछताछ करें...', ta: 'நுண்ணறிவு தளம் பற்றி விசாரிக்கவும்...', ms: 'Tanya tentang pangkalan kecerdasan...' },
  restoreHidden: { en: 'Restore hidden', es: 'Restaurar ocultos', fr: 'Restaurer les éléments cachés', de: 'Versteckte wiederherstellen', zh: '恢复隐藏内容', ja: '非表示を元に戻す', hi: 'छिपे हुए को पुनर्स्थापित करें', ta: 'மறைக்கப்பட்டதை மீட்டெடுக்கவும்', ms: 'Pulihkan yang tersembunyi' },
  recycleBinVacant: { en: 'Recycle bin is vacant', es: 'La papelera está vacía', fr: 'La corbeille est vide', de: 'Papierkorb ist leer', zh: '回收站为空', ja: 'ゴミ箱は空です', hi: 'रीसायकल बिन खाली है', ta: 'மறுசுழற்சி தொட்டி காலியாக உள்ளது', ms: 'Tong kitar semula kosong' },
  noPurgedIntelligence: { en: 'No intelligence has been purged recently.', es: 'No se ha purgado inteligencia recientemente.', fr: 'Aucune intelligence n\'a été purgée recientemente.', de: 'In letzter Zeit wurde keine Intelligenz gelöscht.', zh: '最近没有清除任何智能。', ja: '最近削除されたインテリジェンスはありません。', hi: 'हाल ही में कोई इंटेलिजेंस नहीं हटाई गई है।', ta: 'சமீபத்தில் எந்த நுண்ணறிவும் நீக்கப்படவில்லை.', ms: 'Tiada kecerdasan yang dibuang baru-baru ini.' },
  deletedOn: { en: 'Deleted: ', es: 'Eliminado: ', fr: 'Supprimé le : ', de: 'Gelöscht am: ', zh: '删除于：', ja: '削除日：', hi: 'हटाया गया: ', ta: 'நீக்கப்பட்டது: ', ms: 'Dihapus pada: ' },
  restore: { en: 'Restore', es: 'Restaurar', fr: 'Restaurer', de: 'Wiederherstellen', zh: '恢复', ja: '元に戻す', hi: 'पुनर्स्थापित करें', ta: 'மீட்டமை', ms: 'Pulihkan' },
  purge: { en: 'Purge', es: 'Purgar', fr: 'Purger', de: 'Löschen', zh: '清除', ja: '消去', hi: 'हटाएं', ta: 'நீக்கு', ms: 'Buang' },
  moveCategoryToBin: { en: 'Move category to bin', es: 'Mover categoría a la papelera', fr: 'Déplacer la catégorie vers la corbeille', de: 'Kategorie in den Papierkorb verschieben', zh: '将类别移动到回收站', ja: 'カテゴリーをゴミ箱に移動', hi: 'श्रेणी को बिन में ले जाएं', ta: 'வகையை தொட்டிக்கு நகர்த்தவும்', ms: 'Pindah kategori ke tong' },
  noFavoritedEntries: { en: 'No favorited entries in this category.', es: 'No hay entradas favoritas en esta categoría.', fr: 'Aucune entrada favorita dans cette catégorie.', de: 'Keine favorisierten Einträge in dieser Kategorie.', zh: '此类别中没有收藏的条目。', ja: 'このカテゴリーにお気に入りのエントリはありません。', hi: 'इस श्रेणी में कोई पसंदीदा प्रविष्टि नहीं है।', ta: 'இந்த வகையில் பிடித்த பதிவுகள் எதுவும் இல்லை.', ms: 'Tiada entri kegemaran dalam kategori ini.' },
  noEntriesInCategory: { en: 'No entries found in this category.', es: 'No se encontraron entradas en esta categoría.', fr: 'Aucune entrée trouvée dans cette catégorie.', de: 'Keine Einträge in dieser Kategorie gefunden.', zh: '在此类别中未找到任何条目。', ja: 'このカテゴリーにエントリは見つかりませんでした。', hi: 'इस श्रेणी में कोई प्रविष्टि नहीं मिली।', ta: 'இந்த வகையில் பதிவுகள் எதுவும் கிடைக்கவில்லை.', ms: 'Tiada entri ditemui dalam kategori ini.' },
  backToTop: { en: 'Back to Top', es: 'Volver arriba', fr: 'Retour en haut', de: 'Zurück nach oben', zh: '回到顶部', ja: 'トップに戻る', hi: 'ऊपर वापस जाएं', ta: 'மேலே செல்லவும்', ms: 'Kembali ke Atas' },
  systemWarning: { en: 'System Warning', es: 'Advertencia del Sistema', fr: 'Avertissement du Système', de: 'Systemwarnung', zh: '系统警告', ja: 'システム警告', hi: 'सिस्टम चेतावनी', ta: 'கணினி எச்சரிக்கை', ms: 'Amaran Sistem' },
  acknowledge: { en: 'Acknowledge', es: 'Aceptar', fr: 'Prendre connaissance', de: 'Bestätigen', zh: '确认', ja: '了解', hi: 'स्वीकार करें', ta: 'ஏற்றுக்கொள்', ms: 'Maklum' },
  category: { en: 'Category', es: 'Categoría', fr: 'Catégorie', de: 'Kategorie', zh: '类别', ja: 'カテゴリー', hi: 'श्रेणी', ta: 'வகை', ms: 'Kategori' },
  createNew: { en: 'Create New...', es: 'Crear nuevo...', fr: 'Créer nouveau...', de: 'Neu erstellen...', zh: '创建新...', ja: '新規作成...', hi: 'नया बनाएं...', ta: 'புதியதை உருவாக்கு...', ms: 'Cipta Baru...' },
  defineCategory: { en: 'Define category name...', es: 'Definir nombre de categoría...', fr: 'Définir le nom de la catégorie...', de: 'Kategorienamen definieren...', zh: '定义类别名称...', ja: 'カテゴリー名を定義...', hi: 'श्रेणी का नाम परिभाषित करें...', ta: 'வகை பெயரை வரையறுக்கவும்...', ms: 'Takrifkan nama kategori...' },
  title: { en: 'Title', es: 'Título', fr: 'Titre', de: 'Titel', zh: '标题', ja: 'タイトル', hi: 'शीर्षक', ta: 'தலைப்பு', ms: 'Tajuk' },
  titlePlaceholder: { en: 'e.g. Strategic Directive 01', es: 'p. ej. Directiva Estratégica 01', fr: 'ex. Directive Stratégique 01', de: 'z. B. Strategische Richtlinie 01', zh: '例如：战略指令 01', ja: '例：戦略指令 01', hi: 'जैसे: रणनीतिक निर्देश 01', ta: 'உதாரணம்: மூலோபாய உத்தரவு 01', ms: 'cth. Arahan Strategik 01' },
  intelligenceContent: { en: 'Intelligence Content', es: 'Contenido de Inteligencia', fr: 'Contenu d\'Intelligence', de: 'Intelligenz-Inhalt', zh: '智能内容', ja: 'インテリジェンス・コンテンツ', hi: 'इंटेलिजेंस सामग्री', ta: 'நுண்ணறிவு உள்ளடக்கம்', ms: 'Kandungan Kecerdasan' },
  recording: { en: 'Recording', es: 'Grabando', fr: 'Enregistrement', de: 'Aufnahme', zh: '正在录音', ja: '録音中', hi: 'रिकॉर्डिंग', ta: 'பதிவு செய்யப்படுகிறது', ms: 'Merakam' },
  requestingMic: { en: 'Requesting Mic...', es: 'Solicitando micrófono...', fr: 'Demande de micro...', de: 'Mikrofon anfordern...', zh: '正在请求麦克风...', ja: 'マイクをリクエスト中...', hi: 'माइक का अनुरोध हो रहा है...', ta: 'மைக் கோரப்படுகிறது...', ms: 'Meminta Mikrofon...' },
  voiceNote: { en: 'Voice Note', es: 'Nota de voz', fr: 'Note vocale', de: 'Sprachnotiz', zh: '语音笔记', ja: 'ボイスノート', hi: 'वॉयस नोट', ta: 'குரல் குறிப்பு', ms: 'Nota Suara' },
  ingestDocument: { en: 'Ingest Document', es: 'Ingerir documento', fr: 'Ingérer le document', de: 'Dokument einlesen', zh: '摄取文档', ja: 'ドキュメントを取り込む', hi: 'दस्तावेज़ शामिल करें', ta: 'ஆவணத்தைச் சேர்க்கவும்', ms: 'Masukkan Dokumen' },
  contentPlaceholder: { en: 'The core intelligence data goes here...', es: 'Los datos centrales de inteligencia van aquí...', fr: 'Les données d\'intelligence de base vont ici...', de: 'Die zentralen Intelligenzdaten kommen hierher...', zh: '核心智能数据放在这里...', ja: 'コア・インテリジェンス・データはここに入ります...', hi: 'मुख्य इंटेलिजेंस डेटा यहाँ जाता है...', ta: 'முக்கிய நுண்ணறிவு தரவு இங்கே செல்கிறது...', ms: 'Data kecerdasan teras pergi ke sini...' },
  executiveSummary: { en: 'Executive summary', es: 'Resumen ejecutivo', fr: 'Résumé exécutif', de: 'Zusammenfassung', zh: '执行摘要', ja: 'エグゼクティブ・サマリー', hi: 'कार्यकारी सारांश', ta: 'நிர்வாக சுருக்கம்', ms: 'Ringkasan eksekutif' },
  summaryPlaceholder: { en: 'A refined distillation of the intelligence...', es: 'Una destilación refinada de la inteligencia...', fr: 'Une distillation raffinée de l\'intelligence...', de: 'Eine verfeinerte Destillation der Intelligenz...', zh: '智能的精炼提炼...', ja: 'インテリジェンスの洗練された蒸留...', hi: 'इंटेलिजेंस का एक परिष्कृत आसवन...', ta: 'நுண்ணறிவின் சுத்திகரிக்கப்பட்ட வடிகட்டுதல்...', ms: 'Penyulingan kecerdasan yang halus...' },
  classificationTags: { en: 'Classification tags', es: 'Etiquetas de clasificación', fr: 'Étiquettes de classification', de: 'Klassifizierungs-Tags', zh: '分类标签', ja: '分類タグ', hi: 'वर्गीकरण टैग', ta: 'வகைப்பாட்டு குறிச்சொற்கள்', ms: 'Tag klasifikasi' },
  tagsPlaceholder: { en: 'Separated by commas...', es: 'Separado por comas...', fr: 'Séparé par des virgules...', de: 'Durch Kommas getrennt...', zh: '用逗号分隔...', ja: 'カンマで区切る...', hi: 'अल्पविराम द्वारा अलग किया गया...', ta: 'காற்புள்ளிகளால் பிரிக்கப்பட்டது...', ms: 'Dipisahkan dengan koma...' },
  updated: { en: 'Updated', es: 'Actualizado', fr: 'Mis à jour', de: 'Aktualisiert', zh: '已更新', ja: '更新日', hi: 'अपडेट किया गया', ta: 'புதுப்பிக்கப்பட்டது', ms: 'Dikemas kini' },
  id: { en: 'ID', es: 'ID', fr: 'ID', de: 'ID', zh: 'ID', ja: 'ID', hi: 'आईडी', ta: 'அடையாளம்', ms: 'ID' },
  coreIntelligenceData: { en: 'Core intelligence data', es: 'Datos centrales de inteligencia', fr: 'Données d\'intelligence de base', de: 'Zentrale Intelligenzdaten', zh: '核心智能数据', ja: 'コア・インテリジェンス・データ', hi: 'मुख्य इंटेलिजेंस डेटा', ta: 'முக்கிய நுண்ணறிவு தரவு', ms: 'Data kecerdasan teras' },
  intelligenceMediaStream: { en: 'Intelligence Media Stream', es: 'Flujo de medios de inteligencia', fr: 'Flux média d\'intelligence', de: 'Intelligenz-Medienstream', zh: '智能媒体流', ja: 'インテリジェンス・メディア・ストリーム', hi: 'इंटेलिजेंस मीडिया स्ट्रीम', ta: 'நுண்ணறிவு ஊடக ஸ்ட்ரீம்', ms: 'Strim Media Kecerdasan' },
  connectionFailed: { en: 'Firestore connection failed. Please ensure you have created a Firestore database in your Firebase Console.', es: 'Error de conexión con Firestore. Asegúrese de haber creado una base de datos de Firestore en su consola de Firebase.', fr: 'Échec de la connexion à Firestore. Veuillez vous assurer d\'avoir creado una base de datos Firestore dans votre console Firebase.', de: 'Firestore-Verbindung fehlgeschlagen. Bitte stellen Sie sicher, dass Sie eine Firestore-Datenbank in Ihrer Firebase-Konsole erstellt haben.', zh: 'Firestore 连接失败。请确保您已在 Firebase 控制台中创建了 Firestore 数据库。', ja: 'Firestore への接続に失敗しました。Firebase コンソールで Firestore データベースを作成したことを確認してください。', hi: 'Firestore कनेक्शन विफल रहा। कृपया सुनिश्चित करें कि आपने अपने Firebase कंसोल में Firestore डेटाबेस बनाया है।', ta: 'Firestore இணைப்பு தோல்வியடைந்தது. உங்கள் Firebase கன்சோலில் Firestore தரவுத்தளத்தை உருவாக்கியுள்ளீர்கள் என்பதை உறுதிப்படுத்தவும்.', ms: 'Sambungan Firestore gagal. Sila pastikan anda telah mencipta pangkalan data Firestore dalam Konsol Firebase anda.' },
  quotaExceeded: { en: 'Firestore daily quota exceeded. The system is operating in read-only mode with cached data where available.', es: 'Se excedió la cuota diaria de Firestore. El sistema está operando en modo de solo lectura con datos en caché donde estén disponibles.', fr: 'Quota quotidien Firestore dépassé. Le système fonctionne en mode lecture seule avec les données en cache si disponibles.', de: 'Tägliches Firestore-Kontingent überschritten. Das System arbeitet im schreibgeschützten Modus mit zwischengespeicherten Daten, sofern verfügbar.', zh: 'Firestore 每日配额已超出。系统正在以只读模式运行，并在可用时使用缓存数据。', ja: 'Firestore の 1 日の割り当てを超えました。システムは、利用可能な場合はキャッシュされたデータを使用して読み取り専用モードで動作しています。', hi: 'Firestore दैनिक कोटा समाप्त हो गया है। सिस्टम उपलब्ध होने पर कैश्ड डेटा के साथ केवल-पढ़ने के मोड में काम कर रहा है।', ta: 'Firestore தினசரி ஒதுக்கீடு மீறப்பட்டது. தற்காலிக சேமிப்பு தரவு கிடைக்கும் இடங்களில் கணினி படிக்க மட்டும் பயன்முறையில் இயங்குகிறது.', ms: 'Kuota harian Firestore telah melebihi had. Sistem beroperasi dalam mod baca sahaja dengan data cache jika ada.' },
  terminateSession: { en: 'Terminate Session', es: 'Terminar sesión', fr: 'Terminer la session', de: 'Sitzung beenden', zh: '终止会话', ja: 'セッションを終了', hi: 'सत्र समाप्त करें', ta: 'அமர்வை முடிக்கவும்', ms: 'Tamatkan Sesi' },
  openConsole: { en: 'Open Console', es: 'Abrir consola', fr: 'Ouvrir la console', de: 'Konsole öffnen', zh: '打开控制台', ja: 'コンソールを開く', hi: 'कंसोल खोलें', ta: 'கன்சோலைத் திறக்கவும்', ms: 'Buka Konsol' },
  tellMeMoreAbout: { en: 'Tell me more about', es: 'Cuéntame más sobre', fr: 'Parlez-moi plus de', de: 'Erzählen Sie mir mehr über', zh: '告诉我更多关于', ja: '詳細を教えてください：', hi: 'मुझे इसके बारे में और बताएं', ta: 'இதைப் பற்றி மேலும் சொல்லுங்கள்', ms: 'Beritahu saya lebih lanjut tentang' },

  // Chatbot
  intelligenceAssistant: { 
    en: 'Intelligence Assistant', 
    es: 'Asistente de Inteligencia', 
    fr: 'Assistant d\'Intelligence', 
    de: 'Intelligenz-Assistent', 
    zh: '智能助手', 
    ja: 'インテリジェンス・アシスタント',
    hi: 'इंटेलिजेंस सहायक',
    ta: 'நுண்ணறிவு உதவியாளர்',
    ms: 'Pembantu Kecerdasan'
  },
  awaitingInquiry: { 
    en: 'Awaiting your inquiry into the intelligence base.', 
    es: 'Esperando su consulta en la base de inteligencia.', 
    fr: 'En attente de votre demande dans la base d\'intelligence.', 
    de: 'Erwarte Ihre Anfrage an die Wissensdatenbank.', 
    zh: '等待您对智能库的查询。', 
    ja: 'インテリジェンスベースへの問い合わせを待っています。',
    hi: 'इंटेलिजेंस बेस में आपकी पूछताछ की प्रतीक्षा है।',
    ta: 'நுண்ணறிவு தளத்தில் உங்கள் விசாரணைக்காக காத்திருக்கிறோம்.',
    ms: 'Menunggu pertanyaan anda ke dalam pangkalan kecerdasan.'
  },
  newIntelligence: { 
    en: 'New Intelligence', 
    es: 'Nueva Inteligencia', 
    fr: 'Nouvelle Intelligence', 
    de: 'Neue Intelligenz', 
    zh: '新智能', 
    ja: '新規インテリジェンス',
    hi: 'नई इंटेलिजेंस',
    ta: 'புதிய நுண்ணறிவு',
    ms: 'Kecerdasan Baru'
  },
  archives: { 
    en: 'Archives', 
    es: 'Archivos', 
    fr: 'Archives', 
    de: 'Archive', 
    zh: '档案', 
    ja: 'アーカイブ',
    hi: 'अभिलेखागार',
    ta: 'காப்பகங்கள்',
    ms: 'Arkib'
  },
  searchArchives: { 
    en: 'Search archives...', 
    es: 'Buscar archivos...', 
    fr: 'Rechercher dans les archives...', 
    de: 'Archive durchsuchen...', 
    zh: '搜索档案...', 
    ja: 'アーカイブを検索...',
    hi: 'अभिलेखागार खोजें...',
    ta: 'காப்பகங்களைத் தேடுங்கள்...',
    ms: 'Cari arkib...'
  },
  clickToInquire: { 
    en: 'Click to inquire', 
    es: 'Haga clic para consultar', 
    fr: 'Cliquez pour demander', 
    de: 'Klicken zum Anfragen', 
    zh: '点击查询', 
    ja: 'クリックして問い合わせ',
    hi: 'पूछताछ के लिए क्लिक करें',
    ta: 'விசாரிக்க கிளிக் செய்யவும்',
    ms: 'Klik untuk bertanya'
  },
  operator: { 
    en: 'Operator', 
    es: 'Operador', 
    fr: 'Opérateur', 
    de: 'Operator', 
    zh: '操作员', 
    ja: 'オペレーター',
    hi: 'ऑपरेटर',
    ta: 'இயக்குபவர்',
    ms: 'Operator'
  },
  aiCore: { 
    en: 'AI Core', 
    es: 'Núcleo de IA', 
    fr: 'Cœur d\'IA', 
    de: 'KI-Kern', 
    zh: 'AI 核心', 
    ja: 'AIコア',
    hi: 'एआई कोर',
    ta: 'AI கோர்',
    ms: 'Teras AI'
  },
  sources: { 
    en: 'Sources', 
    es: 'Fuentes', 
    fr: 'Sources', 
    de: 'Quellen', 
    zh: '来源', 
    ja: 'ソース',
    hi: 'स्रोत',
    ta: 'ஆதாரங்கள்',
    ms: 'Sumber'
  },
  schedule: { en: 'Schedule', es: 'Horario', fr: 'Emploi du temps', de: 'Zeitplan', zh: '日程', ja: 'スケジュール', hi: 'अनुसूची', ta: 'அட்டவணை', ms: 'Jadual' },
  addEvent: { en: 'Add Event', es: 'Añadir evento', fr: 'Ajouter un événement', de: 'Ereignis hinzufügen', zh: '添加事件', ja: 'イベントを追加', hi: 'इवेंट जोड़ें', ta: 'நிகழ்வைச் சேர்க்கவும்', ms: 'Tambah Acara' },
  eventTitle: { en: 'Event Title', es: 'Título del evento', fr: 'Titre de l\'événement', de: 'Ereignistitel', zh: '事件标题', ja: 'イベントタイトル', hi: 'इवेंट का शीर्षक', ta: 'நிகழ்வு தலைப்பு', ms: 'Tajuk Acara' },
  startTime: { en: 'Start Time', es: 'Hora de inicio', fr: 'Heure de début', de: 'Startzeit', zh: '开始时间', ja: '開始時間', hi: 'शुरू होने का समय', ta: 'ஆரம்ப நேரம்', ms: 'Masa Mula' },
  endTime: { en: 'End Time', es: 'Hora de finalización', fr: 'Heure de fin', de: 'Endzeit', zh: '结束时间', ja: '終了時間', hi: 'समाप्त होने का समय', ta: 'முடிவு நேரம்', ms: 'Masa Tamat' },
  description: { en: 'Description', es: 'Descripción', fr: 'Description', de: 'Beschreibung', zh: '描述', ja: '説明', hi: 'विवरण', ta: 'விளக்கம்', ms: 'Penerangan' },
  saveEvent: { en: 'Save Event', es: 'Guardar evento', fr: 'Enregistrer l\'événement', de: 'Ereignis speichern', zh: '保存事件', ja: 'イベントを保存', hi: 'इवेंट सहेजें', ta: 'நிகழ்வைச் சேமிக்கவும்', ms: 'Simpan Acara' },
  deleteEvent: { en: 'Delete Event', es: 'Eliminar evento', fr: 'Supprimer l\'événement', de: 'Ereignis löschen', zh: '删除事件', ja: 'イベントを削除', hi: 'इवेंट हटाएं', ta: 'நிகழ்வை நீக்கவும்', ms: 'Padam Acara' },
  noEvents: { en: 'No events scheduled for this day', es: 'No hay eventos programados para este día', fr: 'Aucun événement prévu pour ce jour', de: 'Keine Ereignisse für diesen Tag geplant', zh: '今天没有安排事件', ja: 'この日に予定されているイベントはありません', hi: 'इस दिन के लिए कोई इवेंट निर्धारित नहीं है', ta: 'இந்த நாளில் எந்த நிகழ்வுகளும் திட்டமிடப்படவில்லை', ms: 'Tiada acara dijadualkan untuk hari ini' },
  today: { en: 'Today', es: 'Hoy', fr: 'Aujourd\'hui', de: 'Heute', zh: '今天', ja: '今日', hi: 'आज', ta: 'இன்று', ms: 'Hari ini' },
  addToCalendar: { en: 'Add to Calendar', es: 'Añadir al calendario', fr: 'Ajouter au calendario', de: 'Zum Kalender hinzufügen', zh: '添加到日历', ja: 'カレンダーに追加', hi: 'कैलेंडर में जोड़ें', ta: 'நாட்காட்டியில் சேர்க்கவும்', ms: 'Tambah ke Kalendar' },
  addAllToCalendar: { en: 'Add All to Calendar', es: 'Añadir todo al calendario', fr: 'Tout ajouter au calendrier', de: 'Alle zum Kalender hinzufügen', zh: '全部添加到日历', ja: 'すべてカレンダーに追加', hi: 'सभी को कैलेंडर में जोड़ें', ta: 'அனைத்தையும் நாட்காட்டியில் சேர்க்கவும்', ms: 'Tambah Semua ke Kalendar' },
  addedToCalendar: { en: 'Added to Calendar', es: 'Añadido al calendario', fr: 'Ajouté au calendario', de: 'Zum Kalender hinzugefügt', zh: '已添加到日历', ja: 'カレンダーに追加済み', hi: 'कैलेंडर में जोड़ा गया', ta: 'நாட்காட்டியில் சேர்க்கப்பட்டது', ms: 'Ditambah ke Kalendar' },
  eventProposal: { en: 'Event Proposal', es: 'Propuesta de evento', fr: 'Proposition d\'événement', de: 'Ereignisvorschlag', zh: '事件提案', ja: 'イベントの提案', hi: 'इवेंट प्रस्ताव', ta: 'நிகழ்வு முன்மொழிவு', ms: 'Cadangan Acara' },
  reviewInCalendar: { en: 'Review in Calendar', es: 'Revisar en el calendario', fr: 'Examiner dans le calendrier', de: 'Im Kalender überprüfen', zh: '在日历中查看', ja: 'カレンダーで確認', hi: 'कैलेंडर में समीक्षा करें', ta: 'நாட்காட்டியில் மதிப்பாய்வு செய்யவும்', ms: 'Semak dalam Kalendar' },
  proposeSchedule: { en: 'I\'ve drafted a schedule for you. Would you like to add it to your calendar?', es: 'He preparado un horario para ti. ¿Te gustaría añadirlo a tu calendario?', fr: 'J\'ai préparé un emploi du temps pour vous. Souhaitez-vous l\'ajouter à votre calendrier ?', de: 'Ich habe einen Zeitplan für Sie entworfen. Möchten Sie ihn Ihrem Kalender hinzufügen?', zh: '我为你起草了一个日程。你想把它添加到你的日历中吗？', ja: 'スケジュールを作成しました。カレンダーに追加しますか？', hi: 'मैंने आपके लिए एक अनुसूची तैयार की है। क्या आप इसे अपने कैलेंडर में जोड़ना चाहेंगे?', ta: 'நான் உங்களுக்காக ஒரு அட்டவணையை உருவாக்கியுள்ளேன். அதை உங்கள் நாட்காட்டியில் சேர்க்க விரும்புகிறீர்களா?', ms: 'Saya telah merangka jadual untuk anda. Adakah anda mahu menambahkannya ke kalendar anda?' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['en'];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
