'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const sidebar = document.querySelector(".sidebar")
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBth = document.querySelector('.delete-all__btn');
const deleteField = document.querySelector('.delete-approvement');
const rejectBth = document.querySelector('.reject');
const deleteApproveBth = document.querySelector('.delete');


class Workout {
  date = new Date();
  id = (new Date().getTime() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    //  prettier-ignore
    const months = ['January', 'February','March','April','May','June','July',
      'August','September','October','November','December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // Get user position
    this._getPosition();

    // Get local storage
    this._getLocalStorage();

    if(this.#workouts.length === 0){
      deleteAllBth.style.opacity = "0";
      deleteAllBth.style.pointerEvents = "none";
      deleteAllBth.style.visibility= "hidden";
    }
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllBth.addEventListener('click', this._showDeleteField);
    deleteApproveBth.addEventListener('click', this._deleteAllWorkouts);
    rejectBth.addEventListener('click', this._showSidebar);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Could not get your position`);
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputCadence.value =
      inputDistance.value =
        inputDuration.value =
          inputElevation.value =
            '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // Show delete button
    if(this.#workouts.length === 0){
      deleteAllBth.style.opacity = "1";
      deleteAllBth.style.pointerEvents = "all";
      deleteAllBth.style.visibility= "visible";
    }
    // If workout running, create running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation)
    }
    // Add new obj to workout arr
    this.#workouts.push(workout);
    // Render workout on map as marker
    this._renderWorkoutMarker(workout);
    // Render workout on the list
    this._renderWorkout(workout);
    // Hide form + clear input fields
    this._hideForm();
    // Set local storage to all workouts
    this._setLocaleStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <div class='workout__content'>
        <h2 class="workout__title">${workout.description}</h2>
        <div class="tweaks__buttons">
                <button class="tweaks__btn redact__btn">
                  <ion-icon class="tweaks__icon" name="create-outline"></ion-icon>
                </button>
                <button class="tweaks__btn delete__btn">
                  <ion-icon
                    class="tweaks__icon"
                    name="close-circle-outline"
                  ></ion-icon>
                </button>
              </div>
        <div class="workout__details">
          <span class="workout__icon">${
      workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </div>
      `;
    }
    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </div>`;
    }
    html+=` <div class='workout-delete__field'>
            <h2 class='workout-delete__title'>You're going to delete this workout</h2>
            <button class='delete-workout__btn'>Delete</button>
            <button class='keep-workout__btn'>Reject</button>
          </div>
        </li>`

    form.insertAdjacentHTML('afterend', html);
    this._bthEventHandler()
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocaleStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });

  }
  _reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
  _showDeleteField(){
    deleteField.style.display = "flex";
    sidebar.style.display = "none";
  }
  _showSidebar(){
    deleteField.style.display = "none";
    sidebar.style.display = "flex";
  }
  _deleteAllWorkouts(){
    app._reset();
    app._showSidebar();
  }
  _bthEventHandler(){

    const redactBtn = document.querySelector('.redact__btn');
    const deleteBtn = document.querySelector('.delete__btn');
    const workoutDeleteBtn = document.querySelector('.delete-workout__btn');
    const workoutKeepBtn = document.querySelector('.keep-workout__btn');
    redactBtn.addEventListener('click',this._redactWorkout.bind(this));
    deleteBtn.addEventListener('click',this._openDeletingWorkoutField.bind(this));
    workoutDeleteBtn.addEventListener("click",this._deleteWorkout.bind(this));
    workoutKeepBtn.addEventListener("click",this._closeDeletingWorkoutField);
  }
  _openDeletingWorkoutField(e){
    const workout = e.target.closest('.workout');
    workout.classList.add('deleting');
  }
  _closeDeletingWorkoutField(e){
    const workout = e.target.closest('.workout');
    workout.classList.remove('deleting');
  }
  _redactWorkout(){

  }
  _deleteWorkout(e){
    const workout = e.target.closest(".workout");
    const workoutID = workout.getAttribute("data-id");
    let data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;
    //delete workout from local storage
    this.#workouts = data.filter(workout =>workout.id !== workoutID)
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    //reload page
    location.reload()
  }
}

const app = new App();
