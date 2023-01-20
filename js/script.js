'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const sidebar = document.querySelector(".sidebar")
const containerWorkouts = document.querySelector('.workouts');
const inputForms = document.querySelectorAll('.form__input');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBth = document.querySelector('.delete-all__btn');
const deleteField = document.querySelector('.delete-approvement');
const rejectBth = document.querySelector('.reject');
const deleteApproveBth = document.querySelector('.delete');
const sortField = document.querySelector('.sort-select__field');
const selectSort = document.querySelector('.sort-select');
const sortTypes = document.querySelectorAll('.sort-type');
const showAllWorkoutsBtn = document.querySelector('.show-all-workouts__btn')


class Workout {
  date = new Date();
  id = (new Date().getTime() + '').slice(-10);

  constructor(coords, distance, duration,location,weather) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.location = location;
    this.weather = weather;
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
  constructor(coords, distance, duration, cadence,weather,location) {
    super(coords, distance, duration,location,weather);
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
  constructor(coords, distance, duration, elevationGain,weather,location) {
    super(coords, distance, duration,weather,location);
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
      this._hideElement(deleteAllBth)
      this._hideElement(sortField)
      this._hideElement(showAllWorkoutsBtn)
    }
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    deleteAllBth.addEventListener('click', this._showDeleteField);
    deleteApproveBth.addEventListener('click', this._deleteAllWorkouts);
    rejectBth.addEventListener('click', this._showSidebar);
    selectSort.addEventListener('change', this._sortWorkouts.bind(this))
    showAllWorkoutsBtn.addEventListener('click',this._showAllWorkouts.bind(this))

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

  async _newWorkout(e) {

    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);


    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const weather = await this._getWeather(lat,lng);
    const location = await this._getLocation(lat,lng);
    let workout;
    // Show delete button
    if(this.#workouts.length === 0){
      this._showElement(deleteAllBth)
      this._showElement(sortField)
      this._showElement(showAllWorkoutsBtn)
    }
    // If workout running, create running obj
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ){
        inputForms.forEach(inputForm =>{
          inputForm.style.backgroundColor = 'var(--color-red-1)'
          setTimeout(function(){
            inputForm.style.backgroundColor = 'var(--color-light--3)'
          },150)
        })
        form.style.backgroundColor = 'var(--color-red-2)'
        setTimeout(function(){
          form.style.backgroundColor = 'var(--color-dark--2)'
        },150)
        return
      }

      workout = new Running([lat, lng], distance, duration, cadence,weather,location);
    }
    // If workout cycling, create cycling obj
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Inputs have to be positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation,weather,location)
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
    L.marker(workout.coords,{
      alt: `marker-${workout.id}`
    })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup popup-${workout.id}`,
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
        <h3 class='workout-weather'>${workout.weather}</h3>
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
        <h2 class="workout__title">${workout.type[0].toUpperCase() + workout.type.slice(1) }, in ${workout.location}</h2>
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
            <form class='workout-redact__field '>
            <h3 class='workout-weather'>${workout.weather}</h3>
            <div class="tweaks__buttons">
              <button class="tweaks__btn confirm-redact__btn">
                <ion-icon
                  class="tweaks__icon"
                  name="checkmark-outline"
                ></ion-icon>
              </button>
              <button class="tweaks__btn cancel-redact__btn">
                <ion-icon
                  class="tweaks__icon"
                  name="close-outline"
                ></ion-icon>
              </button>
            </div>
            <h2 class="workout__title">${workout.description}</h2>
            <div class="form-details">
              <label class='redact-label'>🏃‍♂️</label>
              <input class='redact-input distance-form' placeholder='km' value='${workout.distance}'>
            </div>
            <div class="form-details">
              <label class='redact-label'>⏱</label>
              <input class='redact-input duration-form' placeholder='min' value='${workout.duration}'>
            </div>
            <div class="form-details">
              <label class='redact-label'>🦶🏼</label>
              <input class='redact-input cadence-form' placeholder='spm' value='${workout.cadence}'>
            </div>
          </form>
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
      </div>
      <form class='workout-redact__field '>
              <h3 class='workout-weather'>${workout.weather}</h3>
            <div class="tweaks__buttons">
              <button class="tweaks__btn confirm-redact__btn">
                <ion-icon
                  class="tweaks__icon"
                  name="checkmark-outline"
                ></ion-icon>
              </button>
              <button class="tweaks__btn cancel-redact__btn">
                <ion-icon
                  class="tweaks__icon"
                  name="close-outline"
                ></ion-icon>
              </button>
            </div>
            <h2 class="workout__title">${workout.description}</h2>
            <div class="form-details">
              <label class='redact-label'>🏃‍♂️</label>
              <input class='redact-input distance-form' placeholder='km' value='${workout.distance}'>
            </div>
            <div class="form-details">
              <label class='redact-label'>⏱</label>
              <input class='redact-input duration-form' placeholder='min' value='${workout.duration}'>
            </div>
            <div class="form-details">
              <label class='redact-label'>⛰</label>
              <input class='redact-input elevation-gain-form' placeholder='m' value='${workout.elevationGain}'>
            </div>
          </form>
     `;
    }
    html+=` <div class='workout-delete__field'>
            <h2 class='workout-delete__title'>You're going to delete this workout</h2>
            <button class='delete-workout__btn'>Delete</button>
            <button class='keep-workout__btn'>Save</button>
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
    const sortType = localStorage.getItem('selectedSort');
    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      work.prototype = Object.create(Workout.prototype);
      this._renderWorkout(work);
    });
    sortTypes.forEach(stype =>{
      if(stype.value === sortType){
        stype.setAttribute('selected','');
      }
    })
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
    const confirmRedactButton = document.querySelector(".confirm-redact__btn")
    const cancelRedactButton = document.querySelector(".cancel-redact__btn")
    redactBtn.addEventListener("click",this._openRedactingWorkoutField);
    confirmRedactButton.addEventListener('click',this._redactWorkout.bind(this));
    cancelRedactButton.addEventListener('click',this._closeRedactingWorkoutField);
    deleteBtn.addEventListener('click',this._openDeletingWorkoutField);
    workoutDeleteBtn.addEventListener("click",this._deleteWorkout.bind(this));
    workoutKeepBtn.addEventListener("click",this._closeDeletingWorkoutField);
  }
  _openDeletingWorkoutField(e){
    e.preventDefault()
    const workout = e.target.closest('.workout');
    workout.classList.add('deleting');
  }
  _closeDeletingWorkoutField(e){
    e.preventDefault()
    const workout = e.target.closest('.workout');
    workout.classList.remove('deleting');
  }
  _openRedactingWorkoutField(e){
    e.preventDefault()
    const workout = e.target.closest('.workout');
    workout.classList.add('redacting');
  }
  _closeRedactingWorkoutField(e){
    e.preventDefault()
    const workout = e.target.closest('.workout');
    workout.classList.remove('redacting');
  }
  _redactWorkout(e){
    e.preventDefault()
    const workout = e.target.closest(".workout");
    const workoutID = workout.getAttribute("data-id");
    const distance = workout.children[1].children[2].children[1].value;
    const duration = workout.children[1].children[3].children[1].value;
    if(workout.classList.contains('workout--running')){
      const cadence = workout.children[1].children[4].children[1].value;
      this.#workouts = this.#workouts.map(workout =>{
        if(workout.id === workoutID){
          workout.cadence = cadence;
          workout.duration = duration;
          workout.distance = distance;
          workout.pace = duration/distance;
        }
        return workout;
      })
    }
    if(workout.classList.contains('workout--cycling')){
      const elevationGain = workout.children[1].children[4].children[1].value;
      this.#workouts = this.#workouts.map(workout =>{
        if(workout.id === workoutID){
          workout.elevationGain = elevationGain
          workout.duration = duration;
          workout.distance = distance;
          workout.speed =  distance / (duration / 60);
        }
        return workout;
      })
    }
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    location.reload()
  }
  _deleteWorkout(e){
    e.preventDefault()
    const workout = e.target.closest(".workout");
    const workoutID = workout.getAttribute("data-id");
    let data = JSON.parse(localStorage.getItem('workouts'));
    if(!data) return;
    //delete workout from local storage
    this.#workouts = data.filter(workout =>workout.id !== workoutID)
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));

    location.reload()
  }
  _sortWorkouts(){
    const sortType = selectSort.value;
    sortTypes.forEach(stype => stype.removeAttribute('selected'))
    this.#workouts = this.#workouts.sort((workout1,workout2) =>{
      if(workout1[`${sortType}`] < workout2[`${sortType}`]) return -1;
      if(workout1[`${sortType}`] > workout2[`${sortType}`]) return 1;
      if(workout1[`${sortType}`] === workout2[`${sortType}`]) return 0;
    })
    sortTypes.forEach(stype =>{
      if(stype.value === sortType){
        stype.setAttribute('selected','');
      }
    })
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    localStorage.setItem('selectedSort', sortType);
    location.reload()
  }
  _showAllWorkouts(){
    const coords = this.#workouts.map(workout => workout.coords);
    this.#map.fitBounds(coords);
  }
  _showElement(el){
    el.style.opacity = "1";
    el.style.pointerEvents = "all";
    el.style.visibility= "visible";
  }
  _hideElement(el){
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    el.style.visibility= "hidden";
  }
  async _getWeather(lat,lng){
    try {
      const weather = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=5f9cefc7d4338021a4b6430ce7beb4e2&units=metric`)
      const data = await weather.json()
      return `${Math.trunc(data.main.temp)}° ${data.weather[0].main}`
    }catch (err){
      console.error(err)
      alert(err.message)
    }
  }
  async _getLocation(lat,lng){
    try{
    const location = await fetch(`https://geocode.xyz/${lat},${lng}?geoit=json&auth=584415571345734653357x39525`)
    const data = await  location.json();
    return `${data.city}, ${data.country}`
    }catch (err){
      console.error(err)
      alert(err.message)
    }
  }
}

const app = new App();
