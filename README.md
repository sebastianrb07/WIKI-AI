# WikiAI — La Evolución de la Enciclopedia Inteligente

**WikiAI** es una plataforma enciclopédica de última generación que combina la profundidad de Wikipedia con el poder del Procesamiento de Lenguaje Natural (NLP) **100% local**. Diseñada con una estética premium y minimalista, ofrece una experiencia de lectura y generación de conocimiento sin costos ni dependencias de APIs externas.

---

## 🚀 Características Principales (Fase Final)

- **✦ Inteligencia Local (NLP)**: Generación de artículos y resúmenes profundos procesados íntegramente en el servidor mediante el algoritmo TextRank. Sin límites ni claves de API.
- **🖼️ Multimedia Automática**: Integración en tiempo real con la API de Wikipedia para mostrar imágenes y fotografías de alta resolución en cada tema.
- **📄 Exportación PDF Pro**: Sistema de generación de reportes en PDF de alta fidelidad con encabezados profesionales y tipografía optimizada.
- **📍 Navegación Inteligente (TOC)**: Índice interactivo dinámico y panel de "Acceso Rápido" para saltar entre secciones al instante.
- **🏷️ Clasificación por Chips**: Sistema de categorías interactivo que permite explorar temas relacionados con un solo clic.
- **🛡️ Veracidad Local**: Sistema de análisis de neutralidad y veracidad procesado localmente.
- **🔊 Búsqueda por Voz**: Exploración manos libres integrada nativamente.
- **💎 Diseño Premium**: Interfaz basada en _Glassmorphism_, modo oscuro/claro adaptable y barras de desplazamiento personalizadas.

---

## 📁 Estructura del Ecosistema

```
wikiai/
├── frontend/                 ← Interfaz Premium (HTML, Vanilla CSS, JS)
│   ├── index.html            ← Layout principal y componentes UI
│   ├── css/main.css          ← Sistema de diseño (Tokens, Glassmorphism, Responsive)
│   └── js/                   ← Controladores (Search, Navigation, AI, PDF)
│
├── backend/                  ← Motor de la Aplicación (Node.js + Express)
│   ├── server.js             ← API REST, Gestión de JWT y Motor NLP Local
│   ├── seed.js               ← Script de inicialización de Base de Datos
│   └── Dockerfile            ← Contenedorización del servicio backend
│
├── db/                       ← Infraestructura de Datos (PostgreSQL)
│   └── init.sql              ← Esquema de base de datos relacional
│
└── docker-compose.yml        ← Orquestador de la infraestructura completa
```

---

## 🛠️ Instalación y Ejecución (Guía Rápida)

Este proyecto está completamente contenedorizado para que funcione en cualquier equipo con un solo comando.

### Requisitos

- **Docker Desktop** instalado y en ejecución.

### Pasos

1. Descomprime el proyecto y abre una terminal en la carpeta raíz.
2. Levanta el ecosistema completo:
   ```bash
   docker compose up --build
   ```
3. Abre tu navegador en: `http://localhost:3000`

> **💡 Nota sobre Inteligencia Local**:
> Este proyecto utiliza un motor NLP interno basado en TextRank. No requiere ninguna `API_KEY` externa ni conexión a servicios de pago. Todo el procesamiento se realiza en tu propia infraestructura de forma privada y gratuita.

---

## 🌟 Tabla Comparativa de Evolución

| Característica      |   WikiAI Base    | WikiAI Premium (Actual) |
| ------------------- | :--------------: | :---------------------: |
| **Infraestructura** | Estática / Local |    Docker Full-Stack    |
| **Persistencia**    |     Temporal     |  PostgreSQL Permanente  |
| **Exportación**     |  No disponible   | PDF Alta Fidelidad (A4) |
| **Multimedia**      |    Solo Texto    | Imágenes Dinámicas API  |
| **Navegación**      |  Scroll manual   | TOC Interactivo + Chips |
| **Inteligencia**    |  Texto estático  |  NLP Local (TextRank)   |
| **Estética**        |     Estándar     | Glassmorphism / Modern  |

---

_Desarrollado para Ingeniería Inversa Aplicada (Arquitectura y Sistemas, 2026)._
