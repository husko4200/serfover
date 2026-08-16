# SERFOVER — Desplegar en Vercel

Esta carpeta (`serfover-deploy`) trae SOLO los archivos que van en tu hosting —
la app web ya actualizada para hablar con Firebase. No incluye los scripts de
Apps Script (esos van en Google, no en Vercel) ni las herramientas de
migración (ya las usaste, no se suben a producción).

## ⚠️ Falta un archivo que no estaba en lo que subiste
`index.html` y `manifest.json` hacen referencia a `serfover_logo.png`, pero
ese archivo no venía entre los que me compartiste. Agrégalo tú mismo a esta
misma carpeta antes de desplegar (cualquier imagen cuadrada, ideal 512x512),
o la app va a funcionar igual pero sin el logo/ícono.

## Desplegar con la CLI de Vercel (recomendado, no necesita GitHub)

1. Si no tienes Node.js, instálalo desde nodejs.org (versión LTS).
2. Abre una terminal dentro de esta carpeta (`serfover-deploy`).
3. Instala la CLI de Vercel (una sola vez):
   ```
   npm install -g vercel
   ```
4. Inicia sesión:
   ```
   vercel login
   ```
   Te va a pedir el correo con el que tienes tu cuenta de Vercel — revisa tu
   email y confirma desde ahí.
5. Despliega:
   ```
   vercel --prod
   ```
   La primera vez te va a hacer un par de preguntas:
   - "Set up and deploy?" → **Y**
   - "Which scope?" → tu cuenta
   - "Link to existing project?" → **Y** si ya tenías un proyecto de SERFOVER
     en Vercel (así actualiza el mismo sitio, misma URL); **N** si es la
     primera vez.
   - "What's your project's name?" → déjalo o ponle "serfover-app"
   - "In which directory is your code located?" → deja el que aparece (`.`)

Al terminar te va a dar la URL pública de tu app, ya actualizada.

## Actualizaciones futuras
Cada vez que yo te entregue un archivo nuevo, reemplázalo en esta misma
carpeta y vuelve a correr `vercel --prod` desde ahí — no hace falta repetir
`login` ni las preguntas de configuración, ya quedan guardadas.

## Alternativa: conectar un repositorio de GitHub
Si prefieres no usar la terminal cada vez, puedes subir esta carpeta a un
repositorio de GitHub y conectarlo desde vercel.com → "Add New Project" →
"Import Git Repository". Así cada vez que subas cambios al repositorio,
Vercel despliega solo. Es más cómodo a largo plazo, pero requiere configurar
Git/GitHub — avísame si quieres que te guíe por ese camino en vez del de la CLI.
