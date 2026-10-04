import React, { createContext, useContext } from 'react';
import type { AppLanguage, TranslationCatalog } from './types';
import { en } from './en';
import { es } from './es';
import { pt } from './pt';

export type { AppLanguage, TranslationCatalog } from './types';

export const catalogs: Record<AppLanguage, TranslationCatalog> = {
  en,
  es,
  pt,
};

export const languages: Array<{ id: AppLanguage; name: string; flag: string }> = [
  { id: 'en', name: 'English (Default)', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'pt', name: 'Português', flag: '🇧🇷' },
];

export const getTranslation = (lang: AppLanguage = 'en'): TranslationCatalog => {
  return catalogs[lang] || catalogs.en;
};

export const formatText = (template: string, params: Record<string, string | number>): string => {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
};

interface I18nContextValue {
  language: AppLanguage;
  t: TranslationCatalog;
  setLanguage: (lang: AppLanguage) => void;
  format: (template: string, params: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  t: en,
  setLanguage: () => {},
  format: formatText,
});

export const I18nProvider: React.FC<{
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  children: React.ReactNode;
}> = ({ language, onLanguageChange, children }) => {
  const currentCatalog = getTranslation(language);

  return (
    <I18nContext.Provider
      value={{
        language,
        t: currentCatalog,
        setLanguage: onLanguageChange,
        format: formatText,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextValue => {
  return useContext(I18nContext);
};

/**
 * Returns translated strings for the Electron Native Menu Bar
 */
export const getNativeMenuStrings = (lang: AppLanguage = 'en') => {
  const t = getTranslation(lang);
  return {
    file: lang === 'es' ? 'Archivo' : lang === 'pt' ? 'Arquivo' : 'File',
    newFile: t.header.newTooltip.replace(' (Ctrl+N)', ''),
    openFile: t.header.openTooltip.replace(' (Ctrl+O)', '') + '...',
    save: t.header.save,
    saveAs: lang === 'es' ? 'Guardar como...' : lang === 'pt' ? 'Salvar como...' : 'Save as...',
    preferences: t.settings.title + '...',
    quit: lang === 'es' ? 'Salir' : lang === 'pt' ? 'Sair' : 'Quit',
    edit: lang === 'es' ? 'Edición' : lang === 'pt' ? 'Editar' : 'Edit',
    undo: t.ribbon.actions.undo.replace(' (Ctrl+Z)', ''),
    redo: t.ribbon.actions.redo.replace(' (Ctrl+Y)', ''),
    cut: lang === 'es' ? 'Cortar' : lang === 'pt' ? 'Recortar' : 'Cut',
    copy: lang === 'es' ? 'Copiar' : lang === 'pt' ? 'Copiar' : 'Copy',
    paste: lang === 'es' ? 'Pegar' : lang === 'pt' ? 'Colar' : 'Paste',
    selectAll: lang === 'es' ? 'Seleccionar todo' : lang === 'pt' ? 'Selecionar tudo' : 'Select All',
    view: t.ribbon.tabs.view,
    toggleLibrary: t.header.toggleSidebar.replace(' (Ctrl+B)', ''),
    modeLive: t.header.viewLiveTooltip,
    modeEditor: t.header.viewEditorTooltip,
    modeSplit: t.header.viewSplitTooltip,
    modeReader: t.header.viewReaderTooltip,
    export: t.header.export,
    exportHtml: t.header.exportHtml + '...',
    exportPdf: t.header.exportPdf + '...',
    help: lang === 'es' ? 'Ayuda' : lang === 'pt' ? 'Ajuda' : 'Help',
    about: t.about.title + '...',
  };
};
