/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Permite transformar los paquetes ESM de RN/Expo y librerías que publican
  // módulos sin compilar. @tanstack/react-query ya es CJS, pero lo incluimos
  // por si alguna sub-dependencia lo necesita.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/.*))',
  ],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
};
