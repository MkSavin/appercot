import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import {
  applyDocumentLocale,
  getLocalePreference,
  localeStorageKey,
  normalizeLocale,
  supportedLocales,
} from '../lib/locale'
import englishAccount from './locales/en/account.json'
import englishAdmin from './locales/en/admin.json'
import englishAuth from './locales/en/auth.json'
import englishBot from './locales/en/bot.json'
import englishBrowse from './locales/en/browse.json'
import englishChat from './locales/en/chat.json'
import englishCommandPalette from './locales/en/commandPalette.json'
import englishCommon from './locales/en/common.json'
import englishErrors from './locales/en/errors.json'
import englishGlobal from './locales/en/global.json'
import englishGuest from './locales/en/guest.json'
import englishInvitation from './locales/en/invitation.json'
import englishMessage from './locales/en/message.json'
import englishNotFound from './locales/en/notFound.json'
import englishOnboarding from './locales/en/onboarding.json'
import englishPush from './locales/en/push.json'
import englishRegistration from './locales/en/registration.json'
import englishSettings from './locales/en/settings.json'
import englishToaster from './locales/en/toaster.json'
import englishUpload from './locales/en/upload.json'
import account from './locales/ru/account.json'
import admin from './locales/ru/admin.json'
import auth from './locales/ru/auth.json'
import bot from './locales/ru/bot.json'
import browse from './locales/ru/browse.json'
import chat from './locales/ru/chat.json'
import commandPalette from './locales/ru/commandPalette.json'
import common from './locales/ru/common.json'
import errors from './locales/ru/errors.json'
import global from './locales/ru/global.json'
import guest from './locales/ru/guest.json'
import invitation from './locales/ru/invitation.json'
import message from './locales/ru/message.json'
import notFound from './locales/ru/notFound.json'
import onboarding from './locales/ru/onboarding.json'
import push from './locales/ru/push.json'
import registration from './locales/ru/registration.json'
import settings from './locales/ru/settings.json'
import toaster from './locales/ru/toaster.json'
import upload from './locales/ru/upload.json'

export const localeResources = {
  ru: {
    account,
    admin,
    auth,
    bot,
    browse,
    chat,
    commandPalette,
    common,
    errors,
    global,
    guest,
    invitation,
    message,
    notFound,
    onboarding,
    push,
    registration,
    settings,
    toaster,
    upload,
  },
  en: {
    account: englishAccount,
    admin: englishAdmin,
    auth: englishAuth,
    bot: englishBot,
    browse: englishBrowse,
    chat: englishChat,
    commandPalette: englishCommandPalette,
    common: englishCommon,
    errors: englishErrors,
    global: englishGlobal,
    guest: englishGuest,
    invitation: englishInvitation,
    message: englishMessage,
    notFound: englishNotFound,
    onboarding: englishOnboarding,
    push: englishPush,
    registration: englishRegistration,
    settings: englishSettings,
    toaster: englishToaster,
    upload: englishUpload,
  },
}

export const i18n = i18next.createInstance()
const initialLocale = getLocalePreference()

void i18n.use(initReactI18next).init({
  resources: localeResources,
  ns: Object.keys(localeResources.ru),
  defaultNS: 'global',
  fallbackNS: 'global',
  lng: initialLocale,
  fallbackLng: 'ru',
  supportedLngs: supportedLocales,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

applyDocumentLocale(initialLocale)
i18n.on('languageChanged', (language) => applyDocumentLocale(normalizeLocale(language)))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== localeStorageKey) return
    const locale = normalizeLocale(event.newValue)
    if (locale !== normalizeLocale(i18n.resolvedLanguage)) void i18n.changeLanguage(locale)
  })
}
