# Pull Staff Mobile App — Instrucciones de Build iOS / TestFlight

App lista para hacer EAS build y subir a TestFlight. Esta guía es para la persona que ejecute el build final.

## Estado del repo

- **Expo SDK 54** (RN 0.81.5, React 19.1, new architecture habilitada)
- **18/18 checks de `expo-doctor` pasan** (validado)
- **Bundle iOS se genera limpio** vía `expo export --platform ios`
- **Apunta a producción**: `https://aurora-hall.pages.dev/api/v1`
  - Endpoint base configurado en `.env.production` (`EXPO_PUBLIC_API_URL`)
  - Cloudflare Pages Function proxy a Fly.io (sin DNS issues con `fly.dev`)
- **Backend desplegado** con todos los endpoints que la app llama. Login real, scanner QR real, listado de órdenes, push tokens.

## Credenciales de prueba (Aurora Hall demo)

```
Email:    demo@aurorahall.com
Password: DemoStaff2026!
Role:     admin (todos los permisos)
```

Una vez logueado verás los 4 eventos demo de Aurora Hall (julio 2026),
órdenes ya emitidas, reservas de mesa, etc.

## Requisitos

- macOS con Xcode 15.1+ (para builds iOS locales) — opcional si usas EAS Build remoto
- Node 18+
- Cuenta Expo + organización (`eas login`)
- Cuenta Apple Developer + App Store Connect access
- `eas-cli` instalado: `npm install -g eas-cli`

## Build para TestFlight

```bash
cd PullMobileApp-GL
npm install
eas login
eas build --platform ios --profile production
```

EAS preguntará por:

1. **Bundle ID**: `com.pullevents.staff` (ya configurado en `app.config.js`)
2. **Apple ID** (tuyo o de la empresa con acceso al equipo)
3. **Apple Team ID**
4. **Provisioning profile** + **Distribution certificate**
   - Si es la primera build, deja que EAS los genere por ti (más cómodo)
5. **App Store Connect API Key** (recomendado para auto-submit posterior)

Tras unos 15-25 minutos termina y obtienes un `.ipa` en el dashboard de EAS.

## Subir a TestFlight

```bash
eas submit --platform ios --profile production --latest
```

O manualmente desde el dashboard de EAS (botón "Submit to App Store").

Después de la subida, Apple procesa la build (~30 minutos) y aparece en
App Store Connect → TestFlight → Builds. Desde ahí se invita a testers.

## Cambios respecto a la versión previa

- `app.json` eliminado (estaba huérfano; `app.config.js` es el único activo)
- `pnpm-lock.yaml` eliminado (CI usa npm)
- Versiones alineadas con Expo SDK 54 vía `expo install --fix`
- `.env.production` apunta a la API demo (`aurora-hall.pages.dev/api/v1`)

## Comprobaciones rápidas (correr local antes del build)

```bash
# 1. doctor — 18/18 deberían pasar
npx expo-doctor

# 2. bundle dry-run iOS (sin firmar, valida que el JS compila limpio)
npx expo export --platform ios

# 3. arranque local
npx expo start
# - 'i' → simulador iOS (requiere Xcode en macOS)
# - escanear QR con Expo Go (requiere `EXPO_PUBLIC_API_URL` que no sea localhost)
```

## Notas

- El push notifications requiere build EAS real (no funciona en Expo Go).
- El scanner QR usa `expo-camera/CameraView` con permisos ya declarados en
  `app.config.js > ios.infoPlist.NSCameraUsageDescription`.
- La app sobrevive a relogins automáticos: el JWT se renueva cada vez que la
  app abre con `POST /auth/refresh-staff-token`.

## URLs de la demo

- API: https://aurora-hall.pages.dev/api/v1 (proxy a Fly.io)
- API directa: https://pull-api-v2-demo.fly.dev/api/v1
- WebApp cliente final: https://aurora-hall.pages.dev/

## Project IDs

- EAS Project ID: `cc92c30d-3724-45c7-913f-6774f3a1ebfb`
- Bundle Identifier iOS: `com.pullevents.staff`
- Deep link scheme: `pullevents://`
