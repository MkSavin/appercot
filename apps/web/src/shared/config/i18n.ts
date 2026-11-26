import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import englishBot from './locales/en/bot.json'
import englishBrowse from './locales/en/browse.json'
import englishChat from './locales/en/chat.json'
import englishCommon from './locales/en/common.json'
import englishErrors from './locales/en/errors.json'
import englishMessage from './locales/en/message.json'
import englishOnboarding from './locales/en/onboarding.json'
import englishSettings from './locales/en/settings.json'
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

const resources = {
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
}

export const i18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  resources: {
    ru: resources,
    en: {
      bot: englishBot,
      browse: englishBrowse,
      chat: englishChat,
      common: englishCommon,
      errors: englishErrors,
      message: englishMessage,
      onboarding: englishOnboarding,
      settings: englishSettings,
      upload: englishUpload,
    },
  },
  ns: Object.keys(resources),
  defaultNS: 'global',
  fallbackNS: 'global',
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})
