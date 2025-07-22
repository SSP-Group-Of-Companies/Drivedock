// /src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend) // load translations via HTTP (for /public/locales)
  .use(initReactI18next) // connect with react
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "pa"],
    defaultNS: "common",
    ns: ["common"],
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json"
    },
    react: {
      useSuspense: false
    }
  });

export default i18n;
