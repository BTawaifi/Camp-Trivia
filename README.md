# Camp Trivia (Debate Game)

A trivia game application built with Electron and Three.js.

## Features

- Displays trivia questions.
- Supports different trivia categories (e.g., normal, biblical).
- Simple and intuitive user interface.

## Project Structure

- `main.js`: Main Electron process.
- `style.css`: Styles for the application.
- `webpack.config.js`: Webpack configuration for building the renderer process.
- `assets/`: Contains static assets like fonts.
- `trivia-normal.json`, `trivia-biblical.json`: JSON files containing trivia questions.
- `src/`: Contains the source code for the renderer process.
- `dist/`: Contains the bundled renderer process code.
- `release/`: Contains the packaged application.

## Getting Started

### Prerequisites

- Node.js and npm installed.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd camp-trivia
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the application in development mode:

```bash
npm start
```

This will build the renderer process and launch the Electron application.

### Building for Production

To build the application for production:

```bash
npm run build
```

This will create a production build of the renderer process and package the application into the `release/` directory.

## Scripts

- `npm start`: Starts the application in development mode.
- `npm run build:renderer`: Builds the renderer process in development mode.
- `npm run build:renderer:prod`: Builds the renderer process in production mode.
- `npm run build`: Builds the application for production.

## Dependencies

- `electron`: Framework for building cross-platform desktop applications with web technologies.
- `three`: 3D graphics library.
- `webpack`: Module bundler.

## Development Dependencies

- `clean-webpack-plugin`: A webpack plugin to remove/clean your build folder(s).
- `electron-builder`: A complete solution to package and build a ready for distribution Electron app.
- `html-webpack-plugin`: Simplifies creation of HTML files to serve your webpack bundles.
- `webpack-cli`: Command line interface for webpack.

## License

ISC 