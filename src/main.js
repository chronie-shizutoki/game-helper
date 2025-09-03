import { createApp } from 'vue'
import App from './App.vue'
import i18n from './utils/i18n'
import './styles/glassmorphism.css'

// Initialize i18n before creating the app
i18n.initialize().then(() => {
  createApp(App).mount('#app')
}).catch(error => {
  console.error('Failed to initialize i18n:', error)
  // Fallback: create app without i18n
  createApp(App).mount('#app')
})
