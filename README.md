# Chronie Helper

A modern, efficient tool for managing and analyzing gacha game data, built with Vue 3 and Vite.

## Overview

Chronie Helper is a comprehensive application designed to help players track, analyze, and visualize their gacha pull data from popular games. It provides intuitive interfaces for managing multiple profiles across different games, viewing detailed pull histories, and generating statistical insights.

## Features

- **Multi-game Support**: Compatible with multiple popular gacha games including Genshin Impact and Honkai: Star Rail
- **Profile Management**: Create and manage multiple profiles for different accounts
- **Pull History Tracking**: View detailed history of gacha pulls with filtering options
- **Statistical Analysis**: Generate comprehensive statistics on your gacha pulls
- **Data Import/Export**: Easily import and export gacha data in JSON format
- **Responsive Design**: Works seamlessly on both desktop and mobile devices
- **Glassmorphism UI**: Modern, visually appealing user interface with glassmorphism effects

## Technologies Used

- **Frontend Framework**: Vue 3
- **Build Tool**: Vite
- **UI Design**: Custom glassmorphism styles
- **Localization**: Multi-language support (English, Chinese Simplified, Chinese Traditional, Japanese)

## Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js ^20.19.0 || >=22.12.0
- npm or yarn

## Installation

1. Clone the repository
```bash
# Using git
 git clone <repository-url>

# Navigate to the project directory
 cd chronie-helper
```

2. Install dependencies
```bash
 npm install
```

## Development

To start the development server:
```bash
 npm run dev
```

This will start the server on http://localhost:5173 (default port).

## Building for Production

To build the application for production:
```bash
 npm run build
```

This will create a `dist` directory with optimized production build files.

## Preview Production Build

To preview the production build locally:
```bash
 npm run preview
```

## Project Structure

```
chronie-helper/
├── src/
│   ├── components/       # Vue components
│   │   └── gacha/        # Gacha system components
│   ├── models/           # Data models
│   ├── services/         # Business logic and services
│   ├── types/            # Type definitions
│   ├── utils/            # Utility functions
│   ├── locales/          # Localization files
│   ├── styles/           # Global styles
│   ├── App.vue           # Main application component
│   └── main.js           # Application entry point
├── public/               # Static assets
├── index.html            # HTML entry point
├── package.json          # Project dependencies and scripts
└── vite.config.js        # Vite configuration
```

## Usage

1. **Create a Profile**: Start by creating a new profile for your game account
2. **Import Gacha Data**: Use the import feature to load your gacha pull data
3. **View History**: Check your complete pull history organized by date
4. **Analyze Stats**: Use the statistics tab to gain insights into your pulling patterns
5. **Manage Profiles**: Create multiple profiles for different accounts or games

## Supported Games
- Genshin Impact
- Honkai: Star Rail

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- Vue.js team for the excellent framework
- Vite team for the fast build tool
- All contributors who have helped with the project

© 2025 Chronie Helper