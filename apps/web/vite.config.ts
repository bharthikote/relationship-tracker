import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Default (host: "localhost") was only binding the IPv6 loopback ([::1]) on this machine,
  // so anything resolving "localhost" to 127.0.0.1 (IPv4) got connection-refused -- e.g. a
  // Supabase email-confirmation redirect opened in the user's own browser. Binding all
  // interfaces makes both 127.0.0.1 and ::1 reachable.
  server: {
    host: true,
  },
})
