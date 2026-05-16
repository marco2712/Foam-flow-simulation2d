# Foam Flow Web

Un simulador bidimensional interactivo para procesos de inyección de espuma en medios porosos estratificados, desarrollado bajo la asunción de equilibrio local. Esta herramienta de investigación y análisis permite visualizar la dinámica de fluidos complejos, calcular balances de la población de burbujas, observar caídas de presión y analizar el fenómeno transversal (*crossflow*) en tiempo real.

## 🌟 Características Principales

- **Simulación Matemática en Tiempo Real:** Resolución numérica de sistemas de ecuaciones de transporte fraccional sobre medios porosos heterogéneos.
- **Gráficas Reactivas y 2D:** Visualización interactiva con mapas de calor (colormaps) bidimensionales de las distribuciones de saturación y textura de la espuma.
- **Perfiles 1D de Comportamiento:** Monitoreo instantáneo de variables críticas como presión espacial, flujos cruzados verticales y avance del frente inyectado.
- **Manejo Intensivo de Cómputo:** Arquitectura orientada al alto rendimiento usando *Web Workers* para no bloquear la interfaz de usuario de JavaScript durante las iteraciones de la malla espaciotemporal.
- **Exportación de Datos:** Capacidad de exportar resultados a nivel matricial (JSON/CSV) correspondientes al último *Time-step* evaluado.

---

## 🏗️ Arquitectura del Proyecto

El sistema divide sus responsabilidades en un enfoque cliente-servidor/worker estructurado para separar la carga de visualización y modelado.

- **`client/` (Frontend):** 
  - Desarrollado usando **React** y empaquetado con **Vite**. 
  - Responsable de la vista, interacción, configuración de parámetros y renderizado asíncrono de los datos simulados. Las representaciones de los Mapas 2D aprovechan el renderizado nativo basado en *Canvas*.
  - Las lógicas de estado reactivo se gobiernan desde `simStore.js` y `useSimulation.js`.
  - Contiene el *Manual de Usuario* directamente embebido como documento navegable.

- **`server/` (Backend / Motor Numérico):**
  - Orquestado sobre **Node.js**. 
  - Contiene el núcleo de la resolución matemática. A través de la subcarpeta de `simulation/`, se ubican los módulos encargados del modelado constitutivo (`constitutive.js`), operadores de malla y derivadas espaciales (`operators.js`) y la ejecución iterativa concurrente con hilos integrados (`worker.js`).

---

## 📂 Estructura del Repositorio

```text
foam-flow-web/
├── client/                     # Código fuente de la Interfaz Web (React)
│   ├── public/                 # Assets (imágenes, manual de usuario HTML)
│   ├── src/
│   │   ├── components/         # Módulos de la UI y gráficos (Charts, Controles, Panel)
│   │   ├── data/               # Información estática de secciones teóricas
│   │   ├── hooks/              # Custom hooks reactivos (e.g. useSimulation)
│   │   ├── store/              # Manejo global de estados del simulador
│   │   └── main.jsx            # Punto de entrada de la SPA web
│   ├── index.html              # Plantilla base web
│   └── package.json            # Dependencias frontend
├── server/                     # Motor matemático y Backend (Node.js)
│   ├── src/
│   │   ├── routes/             # Rutas API de control o exportación de trazas
│   │   ├── simulation/         # Implementación rigurosa de las ecuaciones (Discretización)
│   │   ├── store/              # Instancias y almacenaje en memoria principal de las mallas
│   │   └── index.js            # Punto de inicialización del motor
│   └── package.json            # Dependencias backend
├── desplegue_foamflow/         # Scripts de despliegue / configuraciones de hosting
├── capitulo_*.tex              # Archivos LaTeX para integración de la tesis
└── README.md                   # Este archivo
```

---

## 🚀 Requisitos Previos

Asegúrate de contar con el siguiente software instalado:
- **[Node.js](https://nodejs.org/es/)** (Versión 18+ recomendada)
- Un navegador web moderno compatible con Web Workers nativos y Canvas API (e.g., Chrome, Firefox, Edge).

---

## 🛠️ Instalación y Configuración

1. **Clonar el Repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/Foam-flow-simulation2d.git
   cd "foam-flow-web"
   ```

2. **Instalar Dependencias del Backend (Motor Matemático):**
   ```bash
   cd server
   npm install
   ```

3. **Instalar Dependencias del Frontend (Interfaz de Usuario):**
   ```bash
   cd ../client
   npm install
   ```

---

## 💻 Ejecución Local del Proyecto

Para correr la aplicación completa en un entorno de desarrollo local, necesitas iniciar tanto la inferfaz como el motor. 

Abre **dos sesiones de terminal** y ejecuta los siguientes comandos:

**Terminal 1 (Backend - Motor Simulador):**
```bash
cd server
npm start
# O bien, si tienes un script de watch configurado: npm run dev
```

**Terminal 2 (Frontend - Interfaz):**
```bash
cd client
npm run dev
```

El front-end habitualmente quedará servido y accesible en `http://localhost:5173/` (Vite) o en su puerto asignado, mientras que el simulador lo enlazará desde su propio puerto de peticiones.

---

## 📖 Documentación

Tanto la formulación física, modelo matemático como la guía operativa en formato completo han sido incorporadas y están disponibles en el **Manual de Usuario** integrado en la subpágina `client/public/manual_usuario.html`, accesible directamente desde el enlace principal en el *landing page* de la interfaz gráfica. Alternativamente, los sustentos matemáticos teóricos residen en los archivos de la Tesis (`.tex`) anexados en este repositorio base.

---

## 👨‍💻 Autor y Desarrollo
Aplicación programada y diseñada para validación técnico-científica del modelamiento bidimensional en medios porosos de recuperación secundaria de hidrocarburos. 

*(c) 2026 - Uso investigativo y académico.*
