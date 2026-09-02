# Mapty Workout Tracker

![Mapty application preview](images/908031d2-2550-43ae-a639-8e47660fe6fd.jpg)

Mapty is a browser-based workout tracking application for mapping running and cycling sessions. It uses the user's current location, an interactive Leaflet map, and browser local storage to let users create, review, edit, sort, and remove workouts without a backend service.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [How to Use](#how-to-use)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Data Persistence](#data-persistence)
- [External Services](#external-services)
- [Browser Support](#browser-support)
- [Future Improvements](#future-improvements)

## Overview

Mapty helps users record outdoor workouts directly on a map. A user selects two points on the map to define a route, enters workout details, and the application renders the workout in both the sidebar and the map view.

The application is built with vanilla JavaScript and follows an object-oriented structure. Workout data is modeled through base and specialized classes, while the main application class manages map behavior, form interactions, rendering, sorting, editing, deletion, and local storage synchronization.

## Features

- **Current-location map initialization** using the browser Geolocation API.
- **Interactive route creation** by selecting two points on the map.
- **Running and cycling workout types** with type-specific metrics.
- **Running metrics** including distance, duration, cadence, and calculated pace.
- **Cycling metrics** including distance, duration, elevation gain, and calculated speed.
- **Map markers and route polylines** for each saved workout.
- **Reverse-geocoded workout titles** based on the workout location.
- **Workout list sidebar** with summary details for every activity.
- **Sort controls** for date, distance, and duration.
- **Edit workflow** for updating existing workout metrics.
- **Delete confirmation modal** for removing a single workout.
- **Clear-all action** for resetting all saved workouts.
- **Show-all action** for fitting all workout markers into the map viewport.
- **Persistent local storage** so workouts remain available after page reloads.
- **Responsive layout** for desktop and smaller screens.

## Tech Stack

- **HTML5** for page structure.
- **CSS3** for layout, responsive styling, and UI states.
- **JavaScript ES6+** for application logic.
- **Leaflet** for map rendering and geospatial interactions.
- **OpenStreetMap tiles** for map data.
- **Geoapify Reverse Geocoding API** for location-based workout titles.
- **Browser Local Storage** for client-side persistence.

## Getting Started

### Prerequisites

Use a modern browser that supports:

- JavaScript ES6+ syntax
- Geolocation API
- Local Storage
- Secure context geolocation on `localhost` or HTTPS

### Installation

Clone the repository and install the listed dependencies:

```bash
git clone <repository-url>
cd mapty
npm install
```

### Running Locally

This is a static frontend project. You can run it with any local static server, for example:

```bash
npx serve .
```

Then open the local URL shown in the terminal.

You can also use a development server extension such as Live Server in VS Code.

> Note: Browser geolocation generally requires `localhost` or HTTPS. Opening `index.html` directly from the file system may prevent location access in some browsers.

## How to Use

1. Allow the browser to access your location when prompted.
2. Click two points on the map to define the workout route.
3. Choose the workout type: running or cycling.
4. Enter the workout details.
5. Submit the form to save the workout.
6. Select a workout in the sidebar to move the map to its marker.
7. Use the edit and delete controls to manage saved workouts.
8. Use the sort dropdown to reorder workouts by date, distance, or duration.
9. Use **show all** to fit all markers in the current map view.
10. Use **clear all** to remove all workouts from the app and local storage.

## Project Structure

```text
mapty/
|-- assets/
|   |-- images/
|   |-- leaflet.css
|   `-- leaflet.js
|-- design/
|   `-- application diagrams and architecture images
|-- images/
|   |-- icon.png
|   |-- logo.png
|   `-- application preview image
|-- index.html
|-- script.js
|-- style.css
|-- package.json
`-- readme.md
```

## Architecture

The application logic is organized around four main classes:

- **`App`**: Coordinates application state, map setup, event listeners, form behavior, rendering, sorting, editing, deletion, and persistence.
- **`Workout`**: Base class for shared workout properties such as ID, distance, duration, coordinates, date formatting, title generation, and sidebar rendering.
- **`Running`**: Extends `Workout` with cadence and calculated pace.
- **`Cycling`**: Extends `Workout` with elevation gain and calculated speed.

The UI is event-driven. User interactions from the map, workout form, sidebar actions, modal actions, and sort controls update the in-memory workout collection and then synchronize the DOM, Leaflet layers, and local storage.

## Data Persistence

Workout data is saved in browser local storage under the `workouts` key. On page load, the application reads this data, recreates the correct workout class instances, renders the sidebar list, and restores map markers after the map is initialized.

Because the app uses local storage, saved data is specific to the current browser and device.

## External Services

Mapty depends on the following browser-accessible services:

- **OpenStreetMap tile service** through Leaflet tile layers.
- **Geoapify Reverse Geocoding API** for converting workout coordinates into readable location names.
- **Google Fonts** for the Manrope typeface.
- **Font Awesome** for edit, delete, and modal icons.

For production use, move API keys into a secure configuration layer and apply domain restrictions or usage limits where supported.

## Browser Support

Mapty is intended for current versions of major desktop and mobile browsers, including Chrome, Edge, Firefox, and Safari. Location-based functionality depends on the user's browser permissions and device geolocation availability.

## Future Improvements

- Add automated tests for workout creation, editing, deletion, and local storage restoration.
- Replace the exposed reverse-geocoding API key with an environment-based or server-mediated configuration.
- Add import and export support for workout data.
- Add route distance calculation from selected coordinates.
- Add stronger offline handling for map tiles and geocoding failures.
- Add filtering by workout type.
