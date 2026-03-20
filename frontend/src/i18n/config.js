import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import commonEn from '../locales/en/common.json';
import sidebarEn from '../locales/en/sidebar.json';
import homeEn from '../locales/en/home.json';
import themeEn from '../locales/en/theme.json';

const resources = {
  en: {
    common: commonEn,
    sidebar: sidebarEn,
    home: homeEn,
    theme: themeEn
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
