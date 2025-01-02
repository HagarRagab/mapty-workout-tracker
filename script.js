'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const allInputs = document.querySelectorAll('.form__input[name]');
const sortByContainer = document.querySelector('.workouts__sort-container');
const sortBy = document.querySelector('.workouts__sort');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearAll = document.querySelector('.clear-all');
const showAll = document.querySelector('.show-all');
const errorMsgEle = document.querySelector('.form__error-msg');
const spinner = document.querySelector('.spinner');
const workoutsControllers = document.querySelector('.workouts__all-btns');

const modal = document.querySelector('.modal');
const overlay = document.querySelector('.modal__overlay');
const modalConfirm = document.querySelector('.modal__confirm');

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

class App {
  #map;
  #mapEvents = []; // [[lat1, lng1], [lat2, lng2]]
  #workouts = []; // [{workout1}, {workout2}, ...]
  #markers = []; // {id: ..., marker: {...}, polyline: {...}}
  #formData = {};
  #edit = null;
  #boundMapClickCallback;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    sortBy.addEventListener('change', e => this._sort(e.target.value));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', e => {
      if (e.target.closest('.workout__icons--edit')) this._editWorkout(e);
      if (e.target.closest('.workout__icons--delete')) this._deleteWorkout(e);
      if (e.target.closest('.workout')) this._moveToWorkout(e);
    });
    clearAll.addEventListener('click', this._reset.bind(this));
    showAll.addEventListener('click', this._displayAllMarkers.bind(this));
    this._displayHideBtns(clearAll, showAll, sortByContainer);
  }

  _init() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    inputDistance.focus();
    // activate sort button
    sortBy.disabled = false;
    errorMsgEle.classList.remove('display');
    this._hideForm();
    // Clear map events
    this.#mapEvents = [];

    // Removing previous event listeners to prevent events accumulation (Event Listener Buildup)
    this.#map.off('click', this.#boundMapClickCallback);
    // Enable map clicking
    this.#boundMapClickCallback = this._mapClickCallback.bind(this);
    this.#map.on('click', this.#boundMapClickCallback);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        // Success callback function
        this._loadMap.bind(this),
        // Failure callback function
        function (positionError) {
          console.log(positionError.message);
        }
      );
    }
  }

  _mapClickCallback(mapE) {
    this.#mapEvents.push(mapE);
    if (this.#mapEvents.length === 2) {
      this.#edit = null;
      this._showForm();
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    // initialize the map on the "map" div with a given center and zoom
    this.#map = L.map('map').setView([latitude, longitude], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
    }).addTo(this.#map);

    this.#boundMapClickCallback = this._mapClickCallback.bind(this);
    this.#map.on('click', this.#boundMapClickCallback);

    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));

    document.querySelector('.leaflet-control-attribution').remove();
  }

  //? FORM METHODS
  _showForm() {
    // Disable map clicking
    this.#map.off('click', this.#boundMapClickCallback);

    form.classList.remove('hidden');
    inputDistance.focus();

    if (!this.#edit) {
      allInputs.forEach(input => {
        if (input.name === 'type') return (input.disabled = false);
        input.value = '';
      });

      const that = this;
      function keyEventsCallback(e) {
        if (e.key === 'Escape') that._init();
        if (e.key === 'Enter') form.requestSubmit();
        document.removeEventListener('keydown', keyEventsCallback);
      }

      document.addEventListener('keydown', keyEventsCallback);
    }
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    const formRowCadence = inputCadence.closest('.form__row');
    const formRowElevation = inputElevation.closest('.form__row');
    if (inputType.value === 'running') {
      formRowCadence.classList.remove('form__row--hidden');
      formRowElevation.classList.add('form__row--hidden');
    }
    if (inputType.value === 'cycling') {
      formRowCadence.classList.add('form__row--hidden');
      formRowElevation.classList.remove('form__row--hidden');
    }
  }

  _isInputsPositiveNumbers(data) {
    if (!data || typeof data !== 'object') return false;
    const positiveNumericInputs = Object.entries(data)
      .filter(([key]) => key !== 'type' && key !== 'elevation')
      .map(input => input[1]);

    const areInputsPositiveNumbers = positiveNumericInputs.every(
      input => Number.isFinite(input) && input > 0
    );

    if (data.type === 'cycling')
      return Number(data.elevation) && areInputsPositiveNumbers;

    return areInputsPositiveNumbers;
  }

  _collectFormData() {
    this.#formData.type = inputType.value;
    this.#formData.distance = +inputDistance.value;
    this.#formData.duration = +inputDuration.value;
    if (this.#formData.type === 'running') {
      this.#formData.cadence = +inputCadence.value;
    }
    if (this.#formData.type === 'cycling') {
      this.#formData.elevation = +inputElevation.value;
    }
  }

  _formDataValidation(coords) {
    if (this.#formData.type === 'running') {
      if (this._isInputsPositiveNumbers(this.#formData)) {
        errorMsgEle.classList.remove('display');

        return new Running(
          this.#formData.distance,
          this.#formData.duration,
          coords,
          this.#formData.cadence
        );
      } else {
        errorMsgEle.classList.add('display');
      }
    }
    if (this.#formData.type === 'cycling') {
      if (this._isInputsPositiveNumbers(this.#formData)) {
        errorMsgEle.classList.remove('display');

        return new Cycling(
          this.#formData.distance,
          this.#formData.duration,
          coords,
          this.#formData.elevation
        );
      } else {
        errorMsgEle.classList.add('display');
      }
    }
  }

  //? WORKOUT
  _newWorkout(e) {
    e.preventDefault();
    if (this.#edit) return;

    // Get data from the form
    this._collectFormData();

    // Check form data and initiate instances
    const coords = this.#mapEvents.map(mapEvent => [
      mapEvent.latlng.lat,
      mapEvent.latlng.lng,
    ]);

    const workout = this._formDataValidation(coords);
    if (!workout) return;

    // Render workout marker
    this._renderWorkoutMarker(workout);

    // Add new workout to workouts array
    this.#workouts.push(workout);

    // Sort and Render workouts lists
    this._sort(sortBy.value);

    // Add workout to local storage
    this._setLocalStorage();

    // Handle clear, show, sort buttons
    this._displayHideBtns(clearAll, showAll, sortByContainer);

    // Reset form
    this._init();
  }

  async _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords[0], {
      icon: L.icon({
        iconUrl: './images/icon.png',
        iconSize: [45, 45],
        iconAnchor: [22, 50],
        popupAnchor: [0, -48],
        shadowUrl: './node_modules/leaflet/dist/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [12, 46],
      }),
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: '250',
          maxHeight: '50',
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }).setContent(
          `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${await Promise.all([
            workout._workoutTitle(),
          ])}`
        )
      )
      .openPopup();

    // Create polyline and add it to the map
    const polyline = L.polyline(workout.coords, {
      color: getComputedStyle(document.documentElement).getPropertyValue(
        '--color-brand--1'
      ),
      weight: 5,
      lineCap: 'round',
    }).addTo(this.#map);

    // Adjust the map view to fit the polyline
    this.#map.fitBounds(polyline.getBounds());

    this.#markers.push({ id: workout.id, marker, polyline });
  }

  _moveToWorkout(e) {
    const workoutEle = e.target.closest('.workout');
    if (e.target.closest('.workout__icons')) return;
    const clickedWorkout = this.#workouts.find(
      workout => workout.id === workoutEle.dataset.id
    );
    this.#map.flyTo(clickedWorkout.coords[0]);
  }

  //? ACTIONS
  _displayHideBtns(...buttons) {
    buttons.forEach(btn =>
      this.#workouts.length
        ? btn.classList.remove('hidden')
        : btn.classList.add('hidden')
    );
  }

  _editWorkout(e) {
    if (e.target.nodeName !== 'I') return;

    // Check if we already in the edit mode -> update the editing element to the new one
    if (this.#edit) this.#edit.classList.remove('hidden');

    const modifiedEle = e.target.closest('.workout');
    const modifiedWorkout = this.#workouts.find(
      workout => workout.id === modifiedEle.dataset.id
    );
    const modifiedWorkoutIndex = this.#workouts.findIndex(
      workout => workout.id === modifiedEle.dataset.id
    );

    // Enter edit mode
    this.#edit = modifiedEle;

    // Disable sorting
    sortBy.disabled = true;

    let newWorkout;

    // Hide modified workout and display form to edit it
    modifiedEle.classList.add('hidden');
    this._showForm();

    // Assign form values to modified workout values
    allInputs.forEach(input => {
      input.value = modifiedWorkout[input.name] || 0;
      if (input.name === 'type') return (input.disabled = true);
    });
    this._toggleElevationField();

    // Handle clicking escape key
    const that = this;
    function keyEventCallback(e) {
      if (!that.#edit) return;
      if (e.key === 'Escape') {
        modifiedEle.classList.remove('hidden');
        that._init();
        document.removeEventListener('keydown', keyEventCallback);
      }
      if (e.key === 'Enter') {
        // Get data from the form
        that._collectFormData();

        // Check form data and initiate instances
        newWorkout = that._formDataValidation(modifiedWorkout.coords);
        if (!newWorkout) return;

        // Delete workout from workouts array
        that.#workouts[modifiedWorkoutIndex] = newWorkout;
        that._sort();

        // Delete workout from local storage
        that._clearLocalStorage();
        that._setLocalStorage();

        that._init();
        document.removeEventListener('keydown', keyEventCallback);
      }
    }
    document.addEventListener('keydown', keyEventCallback);
  }

  _deleteWorkout(e) {
    // Find workout and marker by id
    const deletedWorkoutEle = e.target.closest('.workout');
    const deletedWorkoutMarker = this.#markers.find(
      marker => marker.id === deletedWorkoutEle.dataset.id
    );
    const deletedWorkoutIndex = this.#workouts.findIndex(
      workout => workout.id === deletedWorkoutEle.dataset.id
    );
    this._displayModal();
    modal.addEventListener(
      'click',
      e => {
        const clickedLayer = e.target;
        if (
          clickedLayer.closest('.modal__overlay') ||
          clickedLayer.closest('.modal__close') ||
          clickedLayer.closest('.modal__confirm--no')
        )
          this._hideModal();
        if (clickedLayer.closest('.modal__confirm--yes')) {
          // Delete workout from workouts array
          this.#workouts.splice(deletedWorkoutIndex, 1);
          // Remove workout element from DOM
          deletedWorkoutEle.remove();
          // Delete workout popup from map
          deletedWorkoutMarker.marker.removeFrom(this.#map);
          deletedWorkoutMarker.polyline.removeFrom(this.#map);

          // Delete workout from local storage
          this._clearLocalStorage();
          if (this.#workouts.length) this._setLocalStorage();

          this._displayHideBtns(clearAll, showAll, sortByContainer);
          this._hideModal();
        }
      },
      {
        once: true,
      }
    );
  }

  async _sort(sortedBy = 'date') {
    const allWorkouts = document.querySelectorAll('.workout');

    // Delete all workouts lists
    allWorkouts.forEach(workout => workout.remove());

    const sortedWorkouts =
      sortedBy === 'date'
        ? this.#workouts
        : this.#workouts.slice().sort((a, b) => a[sortedBy] - b[sortedBy]);

    // Fetching all workouts titles
    const workoutsTitles = await Promise.all(
      sortedWorkouts.map(workout => workout._workoutTitle())
    );

    // Store resolved title in workout
    sortedWorkouts.forEach((workout, i) => {
      workout.title = workoutsTitles[i];
      workout._renderWorkout();
    });
  }

  _reset() {
    this._displayModal();
    modal.addEventListener(
      'click',
      e => {
        const clickedLayer = e.target;
        if (
          clickedLayer.closest('.modal__overlay') ||
          clickedLayer.closest('.modal__close') ||
          clickedLayer.closest('.modal__confirm--no')
        ) {
          this._hideModal();
        } else {
          // Delete all workouts lists
          const allWorkouts = document.querySelectorAll('.workout');
          allWorkouts.forEach(workout => workout.remove());
          // Delete all markers from map
          this.#markers.forEach(marker => {
            marker.marker.removeFrom(this.#map);
            marker.polyline.removeFrom(this.#map);
          });
          // Reset workouts, markers arrays
          this.#workouts = [];
          this.#markers = [];
          // Reset local storage
          this._clearLocalStorage();
          // Handle clear, show, sort buttons
          this._displayHideBtns(clearAll, showAll, sortByContainer);
          // Hide modal
          this._hideModal();
        }
      },
      { once: true }
    );
  }

  _displayAllMarkers() {
    // Create a LatLngBounds object
    const bounds = L.latLngBounds([]);
    // Add each marker's position to the bounds
    this.#markers.forEach(function (marker) {
      bounds.extend(marker.marker.getLatLng());
    });
    // Adjust the map view to fit all markers
    this.#map.fitBounds(bounds);
  }

  //? MODAL METHODS
  _displayModal() {
    modal.classList.remove('hidden');
  }

  _hideModal() {
    modal.classList.add('hidden');
  }

  //? LOCAL STORAGE METHODS
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data.map(workout => {
      if (workout.type === 'running')
        return new Running(
          workout.distance,
          workout.duration,
          workout.coords,
          workout.cadence
        );
      if (workout.type === 'cycling')
        return new Cycling(
          workout.distance,
          workout.duration,
          workout.coords,
          workout.elevationGain
        );
    });

    this._sort();
    //! We cannot add renderWorkoutMarker here because the map is still not loaded in the page. The current function will be executed once the page loaded
  }

  _clearLocalStorage() {
    localStorage.removeItem('workouts');
  }
}

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

class Workout {
  #date = new Date();
  #timeout = 3;
  constructor(distance, duration, coords) {
    this.id = self.crypto.randomUUID();
    this.distance = distance; // km
    this.duration = duration; // min
    this.title;
    this.coords = coords; // [lat, lng]
  }

  _formatDate() {
    return new Intl.DateTimeFormat(navigator.language, {
      month: 'long',
      day: 'numeric',
    }).format(this.#date);
  }

  async _workoutTitle() {
    try {
      // Display spinner until region data reaches
      spinner.classList.remove('hidden');
      workoutsControllers.classList.add('hidden');

      const timeout = function (s) {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('This request took too long time.'));
          }, s * 1000);
        });
      };

      const fetchData = fetch(
        `${CONFIG.BASE_URL}?lat=${this.coords[0][0]}&lon=${this.coords[0][1]}&format=json&apiKey=${CONFIG.API_KEY}`
      );
      const resGeo = await Promise.race([fetchData, timeout(this.#timeout)]);
      if (!resGeo.ok) throw new Error('Cannot find the country');
      const geoData = await resGeo.json();
      const { street, state } = geoData.results[0];

      return `${this.type.replace(
        this.type[0],
        this.type[0].toUpperCase()
      )} in ${street || ''}, ${state || ''}`;
    } catch (err) {
      console.error(err);
      return err;
    } finally {
      // Hide spinner
      spinner.classList.add('hidden');
      workoutsControllers.classList.remove('hidden');
    }
  }

  async _renderWorkout() {
    let html = `
      <li class="workout workout--${this.type}" data-id="${this.id}">
        <div class="workout__title">
          <h2>${this.title}</h2>
          <div class="workout__icons">
            <button class="change workout__icons--edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <span class='workout__icons--separator'></span>
            <button class="change workout__icons--delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="workout__details-container">
          <div class="workout__details">
            <span class="workout__icon">${
              this.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">${this.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${this.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
    `;
    if (this.type === 'running') {
      html += `
              <span class="workout__value">${this.pace.toFixed(1)}</span>
              <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🦶🏼</span>
              <span class="workout__value">${this.cadence}</span>
              <span class="workout__unit">spm</span>
            </div>
          </div>
        </li>
      `;
    }
    if (this.type === 'cycling') {
      html += `
              <span class="workout__value">${this.speed.toFixed(1)}</span>
              <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">🌄</span>
              <span class="workout__value">${this.elevationGain}</span>
              <span class="workout__unit">m</span>
            </div>
          </div>
        </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.pace = this.duration / this.distance; // min/km
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.speed = this.distance / (this.duration / 60); // km/h
  }
}

const app = new App();
