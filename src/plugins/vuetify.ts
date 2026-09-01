import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

export const vuetify = createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0f1115',
          surface: '#171a21',
          primary: '#7c4dff',
          secondary: '#4dd0e1',
          info: '#4dd0e1',
          success: '#81c784',
          warning: '#ffb74d',
          error: '#ef5350',
        },
      },
    },
  },
  defaults: {
    VCard: {
      rounded: 'lg',
      elevation: 0,
      variant: 'flat',
    },
  },
})
