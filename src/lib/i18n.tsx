import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { code: "it", label: "Italiano", flag: "IT", ai: "Italian" },
  { code: "en", label: "English", flag: "EN", ai: "English" },
  { code: "de", label: "Deutsch", flag: "DE", ai: "German" },
  { code: "fr", label: "Français", flag: "FR", ai: "French" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "atelier.lang";

type Dict = Record<string, string>;

const en: Dict = {
  "nav.today": "Today",
  "nav.wardrobe": "Wardrobe",
  "nav.outfits": "Outfits",
  "nav.stylist": "Stylist",
  "nav.check": "Check",
  "nav.profile": "Profile",
  "nav.signOut": "Sign out",
  "nav.menu": "Menu",
  "nav.language": "Language",

  "landing.signIn": "Sign in",
  "landing.eyebrow": "Personal styling, quietly clever",
  "landing.title": "Your closet already holds the answer.",
  "landing.body":
    "Atelier learns every piece you own, then puts outfits together for whatever the day asks of you — no shopping required.",
  "landing.cta": "Build my wardrobe",
  "landing.f1.title": "Digital wardrobe",
  "landing.f1.body": "Snap each piece — colour, fabric and season are tagged for you.",
  "landing.f2.title": "Outfits for your day",
  "landing.f2.body": "Looks matched to the occasion, the weather and your own taste.",
  "landing.f3.title": "A stylist on call",
  "landing.f3.body": "Ask anything; she answers using the clothes you actually own.",
  "landing.f4.title": "Second opinions",
  "landing.f4.body": "Check today's look, or whether that new piece earns its place.",

  "today.title": "Today",
  "today.emptyTitle": "Let's fill your closet first",
  "today.emptyBody":
    "Add at least three pieces and Atelier can start putting looks together for you.",
  "today.addClothes": "Add clothes",
  "today.occasion": "Occasion",
  "today.weather": "Weather",
  "today.styling": "Styling…",
  "today.styleMyDay": "Style my day",
  "today.saveLook": "Save look",
  "today.saved": "Saved to your outfits",
  "today.needMore": "Add a few more pieces and try again.",
  "today.busy": "The stylist is busy right now — try again in a moment.",
  "common.tip": "Tip",

  "outfits.title": "Outfits",
  "outfits.subtitle": "Looks you've saved, ready to wear again.",
  "outfits.loading": "Loading…",
  "outfits.emptyTitle": "No saved looks yet",
  "outfits.emptyBody": "Generate outfits on the Today page and save the ones you love.",
  "outfits.goStyle": "Style my day",
  "outfits.favourite": "Favourite",
  "outfits.delete": "Delete outfit",
  "outfits.removed": "Outfit removed",

  "stylist.title": "Your stylist",
  "stylist.subtitle": "Ask anything — she knows what's in your closet.",
  "stylist.startHint": "Not sure where to start?",
  "stylist.s1": "What should I wear to a dinner tonight?",
  "stylist.s2": "How do I style my white shirt differently?",
  "stylist.s3": "What's missing from my wardrobe?",
  "stylist.s4": "Build me a capsule for a weekend trip.",
  "stylist.thinking": "Thinking about your closet…",
  "stylist.placeholder": "What should I wear today?",
  "stylist.send": "Send",
  "stylist.error": "Couldn't reach your stylist — try again.",
};

const it: Dict = {
  "nav.today": "Oggi",
  "nav.wardrobe": "Armadio",
  "nav.outfits": "Outfit",
  "nav.stylist": "Stylist",
  "nav.check": "Verifica",
  "nav.profile": "Profilo",
  "nav.signOut": "Esci",
  "nav.menu": "Menu",
  "nav.language": "Lingua",

  "landing.signIn": "Accedi",
  "landing.eyebrow": "Styling personale, con discrezione",
  "landing.title": "Il tuo armadio ha già la risposta.",
  "landing.body":
    "Atelier impara ogni capo che possiedi e compone look per qualsiasi giornata — senza comprare nulla.",
  "landing.cta": "Crea il mio armadio",
  "landing.f1.title": "Armadio digitale",
  "landing.f1.body": "Fotografa ogni capo: colore, tessuto e stagione vengono taggati per te.",
  "landing.f2.title": "Outfit per la tua giornata",
  "landing.f2.body": "Look scelti in base all'occasione, al meteo e al tuo gusto.",
  "landing.f3.title": "Una stylist sempre disponibile",
  "landing.f3.body": "Chiedi quello che vuoi: risponde usando i vestiti che hai davvero.",
  "landing.f4.title": "Un secondo parere",
  "landing.f4.body": "Controlla il look di oggi o se quel nuovo capo merita spazio.",

  "today.title": "Oggi",
  "today.emptyTitle": "Riempiamo prima il tuo armadio",
  "today.emptyBody":
    "Aggiungi almeno tre capi e Atelier potrà iniziare a comporre i tuoi look.",
  "today.addClothes": "Aggiungi capi",
  "today.occasion": "Occasione",
  "today.weather": "Meteo",
  "today.styling": "Sto creando…",
  "today.styleMyDay": "Vesti la mia giornata",
  "today.saveLook": "Salva look",
  "today.saved": "Salvato nei tuoi outfit",
  "today.needMore": "Aggiungi qualche capo in più e riprova.",
  "today.busy": "La stylist è occupata — riprova tra un momento.",
  "common.tip": "Consiglio",

  "outfits.title": "Outfit",
  "outfits.subtitle": "I look che hai salvato, pronti da rimettere.",
  "outfits.loading": "Caricamento…",
  "outfits.emptyTitle": "Nessun look salvato",
  "outfits.emptyBody": "Genera outfit nella pagina Oggi e salva quelli che ami.",
  "outfits.goStyle": "Vesti la mia giornata",
  "outfits.favourite": "Preferito",
  "outfits.delete": "Elimina outfit",
  "outfits.removed": "Outfit eliminato",

  "stylist.title": "La tua stylist",
  "stylist.subtitle": "Chiedi pure — conosce tutto quello che hai nell'armadio.",
  "stylist.startHint": "Non sai da dove iniziare?",
  "stylist.s1": "Cosa metto per una cena stasera?",
  "stylist.s2": "Come abbino la mia camicia bianca in modo diverso?",
  "stylist.s3": "Cosa manca nel mio armadio?",
  "stylist.s4": "Creami una capsule per un weekend.",
  "stylist.thinking": "Sto guardando il tuo armadio…",
  "stylist.placeholder": "Cosa mi metto oggi?",
  "stylist.send": "Invia",
  "stylist.error": "Non riesco a contattare la stylist — riprova.",
};

const de: Dict = {
  "nav.today": "Heute",
  "nav.wardrobe": "Kleiderschrank",
  "nav.outfits": "Outfits",
  "nav.stylist": "Stylistin",
  "nav.check": "Check",
  "nav.profile": "Profil",
  "nav.signOut": "Abmelden",
  "nav.menu": "Menü",
  "nav.language": "Sprache",

  "landing.signIn": "Anmelden",
  "landing.eyebrow": "Persönliches Styling, ganz unaufgeregt",
  "landing.title": "Dein Kleiderschrank kennt die Antwort längst.",
  "landing.body":
    "Atelier lernt jedes deiner Teile kennen und stellt Outfits für jeden Tag zusammen — ganz ohne Shopping.",
  "landing.cta": "Kleiderschrank anlegen",
  "landing.f1.title": "Digitaler Kleiderschrank",
  "landing.f1.body": "Fotografiere jedes Teil — Farbe, Stoff und Saison werden automatisch getaggt.",
  "landing.f2.title": "Outfits für deinen Tag",
  "landing.f2.body": "Looks passend zu Anlass, Wetter und deinem Geschmack.",
  "landing.f3.title": "Stylistin auf Abruf",
  "landing.f3.body": "Frag alles — die Antwort nutzt nur Kleidung, die du wirklich besitzt.",
  "landing.f4.title": "Zweite Meinung",
  "landing.f4.body": "Prüfe den heutigen Look oder ob sich das neue Teil lohnt.",

  "today.title": "Heute",
  "today.emptyTitle": "Füllen wir zuerst deinen Schrank",
  "today.emptyBody":
    "Füge mindestens drei Teile hinzu, dann stellt Atelier Looks für dich zusammen.",
  "today.addClothes": "Kleidung hinzufügen",
  "today.occasion": "Anlass",
  "today.weather": "Wetter",
  "today.styling": "Stylen…",
  "today.styleMyDay": "Style meinen Tag",
  "today.saveLook": "Look speichern",
  "today.saved": "In deinen Outfits gespeichert",
  "today.needMore": "Füge noch ein paar Teile hinzu und versuch es erneut.",
  "today.busy": "Die Stylistin ist gerade beschäftigt — bitte gleich nochmal.",
  "common.tip": "Tipp",

  "outfits.title": "Outfits",
  "outfits.subtitle": "Gespeicherte Looks, bereit zum Wiedertragen.",
  "outfits.loading": "Lädt…",
  "outfits.emptyTitle": "Noch keine Looks gespeichert",
  "outfits.emptyBody": "Erstelle Outfits auf der Heute-Seite und speichere deine Favoriten.",
  "outfits.goStyle": "Style meinen Tag",
  "outfits.favourite": "Favorit",
  "outfits.delete": "Outfit löschen",
  "outfits.removed": "Outfit gelöscht",

  "stylist.title": "Deine Stylistin",
  "stylist.subtitle": "Frag alles — sie kennt deinen Kleiderschrank.",
  "stylist.startHint": "Keine Idee, wo du anfangen sollst?",
  "stylist.s1": "Was ziehe ich heute Abend zum Dinner an?",
  "stylist.s2": "Wie style ich mein weißes Hemd anders?",
  "stylist.s3": "Was fehlt in meinem Kleiderschrank?",
  "stylist.s4": "Stell mir eine Capsule für ein Wochenende zusammen.",
  "stylist.thinking": "Ich schaue in deinen Schrank…",
  "stylist.placeholder": "Was ziehe ich heute an?",
  "stylist.send": "Senden",
  "stylist.error": "Deine Stylistin ist nicht erreichbar — bitte erneut versuchen.",
};

const fr: Dict = {
  "nav.today": "Aujourd'hui",
  "nav.wardrobe": "Garde-robe",
  "nav.outfits": "Tenues",
  "nav.stylist": "Styliste",
  "nav.check": "Vérifier",
  "nav.profile": "Profil",
  "nav.signOut": "Se déconnecter",
  "nav.menu": "Menu",
  "nav.language": "Langue",

  "landing.signIn": "Se connecter",
  "landing.eyebrow": "Un styling personnel, tout en finesse",
  "landing.title": "Votre penderie a déjà la réponse.",
  "landing.body":
    "Atelier apprend chaque pièce que vous possédez, puis compose des tenues pour toutes vos journées — sans rien acheter.",
  "landing.cta": "Créer ma garde-robe",
  "landing.f1.title": "Garde-robe numérique",
  "landing.f1.body": "Photographiez chaque pièce : couleur, matière et saison sont étiquetées pour vous.",
  "landing.f2.title": "Des tenues pour votre journée",
  "landing.f2.body": "Des looks adaptés à l'occasion, à la météo et à vos goûts.",
  "landing.f3.title": "Une styliste disponible",
  "landing.f3.body": "Posez vos questions : elle répond avec les vêtements que vous avez vraiment.",
  "landing.f4.title": "Un deuxième avis",
  "landing.f4.body": "Vérifiez le look du jour, ou si cette nouveauté mérite sa place.",

  "today.title": "Aujourd'hui",
  "today.emptyTitle": "Remplissons d'abord votre penderie",
  "today.emptyBody":
    "Ajoutez au moins trois pièces et Atelier commencera à composer vos looks.",
  "today.addClothes": "Ajouter des vêtements",
  "today.occasion": "Occasion",
  "today.weather": "Météo",
  "today.styling": "Composition…",
  "today.styleMyDay": "Habillez ma journée",
  "today.saveLook": "Enregistrer le look",
  "today.saved": "Enregistré dans vos tenues",
  "today.needMore": "Ajoutez quelques pièces et réessayez.",
  "today.busy": "La styliste est occupée — réessayez dans un instant.",
  "common.tip": "Astuce",

  "outfits.title": "Tenues",
  "outfits.subtitle": "Les looks enregistrés, prêts à reporter.",
  "outfits.loading": "Chargement…",
  "outfits.emptyTitle": "Aucun look enregistré",
  "outfits.emptyBody": "Générez des tenues sur la page Aujourd'hui et gardez vos préférées.",
  "outfits.goStyle": "Habillez ma journée",
  "outfits.favourite": "Favori",
  "outfits.delete": "Supprimer la tenue",
  "outfits.removed": "Tenue supprimée",

  "stylist.title": "Votre styliste",
  "stylist.subtitle": "Demandez tout — elle connaît votre penderie.",
  "stylist.startHint": "Vous ne savez pas par où commencer ?",
  "stylist.s1": "Que porter pour un dîner ce soir ?",
  "stylist.s2": "Comment porter ma chemise blanche autrement ?",
  "stylist.s3": "Que manque-t-il dans ma garde-robe ?",
  "stylist.s4": "Composez-moi une capsule pour un week-end.",
  "stylist.thinking": "Je regarde votre penderie…",
  "stylist.placeholder": "Qu'est-ce que je porte aujourd'hui ?",
  "stylist.send": "Envoyer",
  "stylist.error": "Impossible de joindre votre styliste — réessayez.",
};

const DICTS: Record<Lang, Dict> = { en, it, de, fr };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; aiLanguage: string };

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const codes = LANGUAGES.map((l) => l.code) as string[];
    if (stored && codes.includes(stored)) {
      setLangState(stored as Lang);
      return;
    }
    const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en";
    if (codes.includes(nav)) setLangState(nav as Lang);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, l);
      },
      t: (key) => DICTS[lang][key] ?? en[key] ?? key,
      aiLanguage: LANGUAGES.find((l) => l.code === lang)?.ai ?? "English",
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "en",
      setLang: () => {},
      t: (key) => en[key] ?? key,
      aiLanguage: "English",
    };
  }
  return ctx;
}
