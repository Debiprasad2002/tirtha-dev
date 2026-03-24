# Tirtha Frontend

A modern, interactive React application for exploring 3D temples and religious heritage sites. Features real-time 3D model viewing, interactive maps, multi-language support, and a beautiful dark/light theme system.

## 🌟 Features

- **3D Temple Visualization** - View detailed 3D models of temples using Three.js
- **Interactive Map** - Explore temple locations on an interactive Leaflet map
- **Multi-Language Support** - Full i18n support with multiple language translations
- **Dark/Light Theme** - Seamless theme switching with persistent user preference
- **Responsive Design** - Fully responsive UI that works on desktop and mobile
- **Search Functionality** - Search and filter temples by name and attributes
- **Temple Details Modal** - Detailed information about each temple with rich content
- **Smooth Animations** - Celebration effects and smooth transitions throughout the app
- **Accessibility** - Semantic HTML and ARIA labels for better accessibility

## 🛠️ Tech Stack

### Core
- **React 19** - Latest React with modern hooks
- **Vite 7** - Lightning-fast build tool and dev server
- **React Router 7** - Client-side routing

### 3D & Visualization
- **Three.js r183** - WebGL library for 3D graphics
- **@react-three/fiber** - React renderer for Three.js
- **@react-three/drei** - Useful helpers for react-three-fiber
- **Leaflet 1.9** - Interactive maps
- **React Leaflet 5** - React wrapper for Leaflet

### Internationalization & Theming
- **i18next 25** - Multi-language support
- **React-i18next 16** - i18next binding for React
- **CSS Custom Properties** - Dynamic theme variables

### HTTP & Data
- **Axios 1.13** - HTTP client for API requests

### Development Tools
- **ESLint 9** - Code quality and style checking
- **ESLint React Plugins** - React-specific linting rules

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify all required packages are installed**
   ```bash
   npm list three @react-three/fiber @react-three/drei leaflet react-leaflet
   ```

## 🚀 Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` with hot module replacement (HMR) enabled.

### Development Features
- **Hot Module Replacement** - Instant updates without page reload
- **Fast Refresh** - React components update in-place
- **Source Maps** - Easy debugging with original source code visibility

## 🏗️ Build

Create an optimized production build:

```bash
npm run build
```

Output files are generated in the `dist/` directory.

### Build Features
- **Code Splitting** - Automatic chunk splitting for better caching
- **Minification** - JavaScript and CSS minified for smaller bundle size
- **Tree Shaking** - Unused code removed automatically

### Preview Production Build

```bash
npm run preview
```

## 🧹 Code Quality

Run ESLint to check code quality:

```bash
npm run lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ModelViewer3D.jsx       # 3D model viewer
│   │   ├── MapView.jsx             # Interactive map component
│   │   ├── SearchBar.jsx           # Search functionality
│   │   ├── TempleDetails.jsx       # Temple details display
│   │   ├── ModalViewer.jsx         # Modal container
│   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   ├── ThemeToggle.jsx         # Theme switcher
│   │   ├── CelebrationEffect.jsx   # Animation effects
│   │   └── ...other components
│   ├── pages/               # Page components
│   │   └── Home.jsx        # Main home page
│   ├── routes/             # Routing configuration
│   │   └── Approutes.jsx   # App routes definition
│   ├── context/            # React context
│   │   └── ThemeContext.jsx # Theme state management
│   ├── hooks/              # Custom React hooks
│   │   └── useTheme.js     # Theme hook
│   ├── constants/          # App constants
│   │   ├── app.constants.js
│   │   └── index.js
│   ├── i18n/               # Internationalization
│   │   ├── config.js       # i18n configuration
│   │   └── locales/        # Translation files
│   │       └── en/
│   │           ├── common.json
│   │           ├── home.json
│   │           ├── sidebar.json
│   │           └── theme.json
│   ├── styles/             # CSS files
│   │   ├── theme-variables.css    # CSS variables
│   │   ├── AccordionItem.css
│   │   ├── ModelViewer3D.css
│   │   └── ...other styles
│   ├── assets/             # Static assets
│   │   ├── icons/          # SVG icons
│   │   │   ├── navigation/
│   │   │   ├── social/
│   │   │   └── ui/
│   │   └── images/         # Image assets
│   │       ├── backgrounds/
│   │       ├── heroes/
│   │       └── temples/
│   ├── public/             # Public static files
│   │   ├── models/         # 3D model files (glb)
│   │   ├── images/         # Image files
│   │   └── gifs/          # GIF animations
│   ├── App.jsx             # Root component
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── public/                 # Public directory (static files)
├── vite.config.js          # Vite configuration
├── eslint.config.js        # ESLint configuration
├── index.html              # HTML entry point
├── package.json            # Project metadata and dependencies
└── README.md              # This file
```

## 🎨 Theme System

The application uses CSS custom properties (variables) for theming. Review [theme-variables.css](src/styles/theme-variables.css) for available theme colors and properties.

### Theme Features
- **Light Theme** - Default light color scheme
- **Dark Theme** - Eye-friendly dark color scheme
- **Persistent** - User preference saved to localStorage
- **Smooth Transitions** - Theme switch animation

## 🌍 Internationalization (i18n)

Multi-language support is configured in [i18n/config.js](src/i18n/config.js).

### Adding a New Language

1. Create translation file: `src/i18n/locales/[lang]/[namespace].json`
2. Add language to i18n configuration
3. Translations are organized by namespace for better organization

### Current Namespaces
- `common.json` - Common/shared translations
- `home.json` - Home page translations
- `sidebar.json` - Sidebar translations
- `theme.json` - Theme translations

## 🎯 Key Components

### ModelViewer3D
Handles 3D model loading and rendering using Three.js and react-three-fiber.

**Features:**
- Loads GLB/GLTF models
- Orbit controls for rotation and zoom
- Lighting setup
- Model centering and scaling

### MapView
Interactive map component using Leaflet and React Leaflet.

**Features:**
- Temple location markers
- Hover tooltips
- Interactive popups
- Zoom and pan controls

### TempleDetails
Displays comprehensive temple information.

**Features:**
- Rich content support
- Accordion sections
- Modal display
- Responsive layout

### SearchBar
Search and filter temples.

**Features:**
- Real-time search
- Filter by attributes
- Debounced input
- Clear functionality

## 🔧 Configuration

### Vite Configuration
[vite.config.js](vite.config.js) - Vite build tool configuration

### ESLint Configuration
[eslint.config.js](eslint.config.js) - Code quality rules

## 📝 Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint checks
npm run lint

# Fix ESLint issues
npm run lint -- --fix
```

## 🌐 API Integration

The application uses Axios for HTTP requests. API configuration and services can be found in the `src/services/` directory.

## 🖼️ 3D Models

3D models should be:
- Format: GLB or GLTF
- Location: `/public/models/`
- Named without spaces (e.g., `ram-mandir.glb`)
- Optimized for web (appropriate file size)

### Loading Models

Models are loaded using the `useGLTF` hook from `@react-three/drei`.

## 🔍 Troubleshooting

### 3D Model Not Loading
1. Verify model file exists in `/public/models/`
2. Check the console for error messages
3. Ensure model file path is correct (use `/models/...` not `./models/...`)
4. Test model file: https://gltf-viewer.donmccurdy.com/

### Styles Not Applying
1. Clear browser cache
2. Restart dev server
3. Check CSS file imports
4. Verify theme variables are defined

### Translation Not Working
1. Verify translation file exists
2. Check language code in i18n config
3. Clear browser cache

## 🌱 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📱 Responsive Breakpoints

The application is designed to work seamlessly on:
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

## 🚀 Performance Optimization

- Code splitting with React Router
- Lazy loading of components
- Optimized 3D models
- Efficient CSS and asset loading
- Minified production builds

## 🔐 Security Considerations

- CSP headers recommended for production
- CORS configuration for API requests
- Input validation in search and forms
- XSS protection through React's built-in escaping

## 📦 Dependencies Management

Check `package.json` for all dependencies and versions. Keep dependencies updated:

```bash
npm outdated      # Check for outdated packages
npm update        # Update to latest versions
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run ESLint: `npm run lint`
4. Commit with clear messages
5. Push and create a pull request

## 📄 License

[Add your license information here]

## 📞 Support

For issues and questions:
- Check the [Troubleshooting](#-troubleshooting) section
- Review component documentation in code comments
- Check console for error messages

---

