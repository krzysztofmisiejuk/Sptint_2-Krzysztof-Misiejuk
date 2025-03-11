let currentUser = null;
let editingUserId = null;

/**
 * Wyświetla komunikat w obszarze #message.
 * @param {string} text Treść komunikatu.
 * @param {string} type Typ komunikatu ('info', 'success', 'error').
 */
function showMessage(text, type = 'info') {
	const messageDiv = document.getElementById('message');
	messageDiv.innerText = text;
	messageDiv.className = type;
	setTimeout(() => {
		messageDiv.innerText = '';
		messageDiv.className = '';
	}, 5000);
}

/**
 * Wyświetla powiadomienie w obszarze #notification.
 * @param {string} text Treść powiadomienia.
 */
function showNotification(text) {
	const notifDiv = document.getElementById('notification');
	notifDiv.innerText = text;
	setTimeout(() => {
		notifDiv.innerText = '';
	}, 5000);
}

/**
 * Aktualizuje widoczność pozycji w menu oraz informację o zalogowanym użytkowniku.
 */
function renderNav() {
	if (currentUser) {
		document.getElementById('nav-profile').style.display = 'inline';
		document.getElementById('nav-cars').style.display = 'inline';
		document.getElementById('nav-buy').style.display = 'inline';
		document.getElementById('nav-logout').style.display = 'inline';
		document.getElementById('nav-login').style.display = 'none';
		document.getElementById('nav-register').style.display = 'none';

		document.getElementById(
			'user-info'
		).innerText = `Zalogowany jako: ${currentUser.username} | Rola: ${currentUser.role} | Saldo: ${currentUser.balance}`;
	} else {
		document.getElementById('nav-profile').style.display = 'none';
		document.getElementById('nav-cars').style.display = 'none';
		document.getElementById('nav-buy').style.display = 'none';
		document.getElementById('nav-logout').style.display = 'none';
		document.getElementById('nav-login').style.display = 'inline';
		document.getElementById('nav-register').style.display = 'inline';
		document.getElementById('user-info').innerText = 'Nie jesteś zalogowany';
	}
}

/**
 * Sprawdza, czy użytkownik jest zalogowany poprzez wywołanie endpointu /users.
 * Dla zwykłych userów zwracany jest obiekt, a dla admina (ze względu na uprawnienia)
 * – tablica wszystkich użytkowników. W tym przypadku wybieramy obiekt admina.
 */

async function checkAuth() {
	try {
		const res = await fetch(`http://localhost:3000/profile`, {
			credentials: 'include', // Wysłanie ciasteczek
		});
		if (res.status === 200) {
			const data = await res.json();
			currentUser = data;
		} else if (res.status === 401 || res.status === 404) {
			currentUser = null;
			console.log('Użytkownik nie jest zalogowany');
		} else {
			console.log('Status:', res.status);
			currentUser = null;
		}
	} catch (error) {
		console.error('Błąd podczas pobierania danych użytkownika:', error);
		currentUser = null;
	}
	renderNav();
}

/**
 * Pokazuje wskazany widok (sekcję) i ukrywa pozostałe.
 * @param {string} viewId ID widoku do pokazania.
 */
function showView(viewId) {
	const views = document.querySelectorAll('.view');
	views.forEach((view) => {
		view.style.display = 'none';
	});
	const activeView = document.getElementById(viewId);
	if (activeView) {
		activeView.style.display = 'block';
	}
}

/**
 * Ładuje dane profilu aktualnie zalogowanego użytkownika.
 */
async function loadProfile() {
	let profile = currentUser;
	if (!profile) {
		document.getElementById('profile-info').innerText = 'Nie jesteś zalogowany';
		renderNav();
		return;
	}
	document.getElementById(
		'profile-info'
	).innerText = `Username: ${profile.username}\nSaldo: ${profile.balance}`;
	if (profile.role === 'admin') {
		await loadUsersList();
	} else {
		const userItems = document.querySelectorAll('#user-item');
		if (userItems.length > 0) {
			userItems.forEach((item) => item.remove());
		}
	}
	renderNav();
}

/**
 * Ładuje listę samochodów i wyświetla je w sekcji #cars-list.
 */
async function loadCars() {
	try {
		const res = await fetch('http://localhost:3000/cars');
		if (res.status === 200) {
			const cars = await res.json();
			let html = '';
			if (cars.length === 0) {
				html = 'Brak samochodów.';
			} else {
				cars.forEach((car) => {
					html += `<div class="car-item">
                     <strong>ID:</strong> ${car.id} |
                     <strong>Model:</strong> ${car.model} |
                     <strong>Cena:</strong> ${car.price} |
                     <strong>Właściciel:</strong> ${
												car.owner_id ? car.owner_id : ''
											}
                   </div>`;
				});
			}
			document.getElementById('cars-list').innerHTML = html;
		}
	} catch (err) {
		showMessage('Błąd przy pobieraniu samochodów', 'error');
	}
}

/**
 * Ładuje listę userów i wyświetla je w sekcji #profile-info.
 */
async function loadUsersList() {
	try {
		const res = await fetch(`http://localhost:3000/users`);
		const usersData = await res.json();
		let html = '';
		usersData.forEach((user) => {
			html += `
			<div class="user-item" id="user-item">
			<button class="edit-user-btn" data-user-id="${user.id}">Edytuj</button>
			 <strong>ID:</strong> ${user.id} |
			 <strong>Username:</strong> ${user.username} |
			 <strong>Password:</strong> ${user.password} |
			 <strong>Role:</strong> ${user.role} |
			 <strong>Balance:</strong> ${user.balance}
		   </div>`;
		});
		document.getElementById('users-list').innerHTML = html;
		document.querySelectorAll('.edit-user-btn').forEach((btn) =>
			btn.addEventListener('click', (event) => {
				const editPanel = document.querySelector('#edit-panel');
				if (
					!editPanel.classList.contains('active') &&
					currentUser.role === 'admin'
				) {
					editPanel.classList.add('active');
				} else {
					editPanel.classList.remove('active');
				}

				editingUserId = event.target.getAttribute('data-user-id');

				document.getElementById(
					'edit-panel-header'
				).innerHTML = `Edycja użytkownika ${editingUserId}`;
			})
		);
	} catch (error) {
		showMessage('Błąd przy pobieraniu danych', 'error');
	}
}
// edycja uzytkowników dla admina
const editForm = document.querySelector('#editForm');
if (editForm) {
	editForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const editUsername = document.getElementById('editUsername').value;
		const editPassword = document.getElementById('editPassword').value;
		const editBalance = document.getElementById('editBalance').value;
		const editRole = document.getElementById('editRole').value;

		const res = await fetch(
			`http://localhost:3000/user/edit/${editingUserId}`,
			{
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: editUsername,
					password: editPassword,
					balance: editBalance,
					role: editRole,
				}),
			}
		);
		const data = await res.json();
		if (res.status === 200) {
			showMessage('Użytkownik został zaaktualizowany', 'success');
			loadProfile();
		} else {
			showMessage(data.error || 'Błąd edycji', 'error');
		}

		if (document.getElementById('edit-panel').classList.contains('active')) {
			document.getElementById('edit-panel').classList.remove('active');
		}
	});
}

/**
 * Ustawia wszystkie nasłuchiwacze zdarzeń dla formularzy oraz routingu.
 */
function setupEventListeners() {
	// Routing – zmiana widoku po zmianie fragmentu URL
	window.addEventListener('hashchange', route);
	route(); // inicjalizacja

	// Formularz logowania
	const loginForm = document.getElementById('loginForm');
	if (loginForm) {
		loginForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('loginUsername').value;
			const password = document.getElementById('loginPassword').value;
			const res = await fetch('http://localhost:3000/login', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (res.status === 200) {
				showMessage('Zalogowano pomyślnie', 'success');
				await checkAuth();
				window.location.hash = '#home';
			} else {
				showMessage(data.error || 'Błąd logowania', 'error');
			}
		});
	}
	// Formularz rejestracji
	const registerForm = document.getElementById('registerForm');
	if (registerForm) {
		registerForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const username = document.getElementById('regUsername').value;
			const password = document.getElementById('regPassword').value;
			const res = await fetch('http://localhost:3000/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});
			const data = await res.json();
			if (res.status === 201) {
				showMessage(
					'Rejestracja powiodła się, możesz się zalogować',
					'success'
				);
				window.location.hash = '#login';
			} else if (res.status === 409) {
				showMessage(
					'Podana nazwa użytkownika istnieje już w naszej bazie danych',
					'error'
				);
			} else {
				showMessage(data.error || 'Błąd rejestracji', 'error');
			}
		});
	}

	// Formularz aktualizacji profilu
	const profileForm = document.getElementById('profileForm');
	if (profileForm) {
		profileForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const newUsername = document.getElementById('newUsername').value;
			const newPassword = document.getElementById('newPassword').value;
			const res = await fetch(`http://localhost:3000/users/edit`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: newUsername,
					password: newPassword,
					role: currentUser.role,
				}),
			});

			const data = await res.json();
			if (res.status === 200) {
				showMessage('Profil zaktualizowany', 'success');
				loadProfile();
			} else {
				showMessage(data.error || 'Błąd aktualizacji profilu', 'error');
			}
		});
	}

	// Formularz dodawania samochodu
	const addCarForm = document.getElementById('addCarForm');
	if (addCarForm) {
		addCarForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const model = document.getElementById('carModel').value;
			const price = parseFloat(document.getElementById('carPrice').value);
			const res = await fetch('http://localhost:3000/cars', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model, price }),
			});
			const data = await res.json();
			if (res.status === 201) {
				showMessage('Samochód dodany', 'success');
				loadCars();
			} else {
				showMessage(data.error || 'Błąd dodawania samochodu', 'error');
			}
		});
	}

	// Formularz zakupu samochodu
	const buyCarForm = document.getElementById('buyCarForm');
	if (buyCarForm) {
		buyCarForm.addEventListener('submit', async (e) => {
			e.preventDefault();
			const carId = document.getElementById('buyCarId').value;
			const res = await fetch(`http://localhost:3000/cars/${carId}/buy`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ carId: carId, username: currentUser.username }),
			});
			const data = await res.json();
			if (res.status === 200) {
				showMessage('Samochód zakupiony', 'success');
				currentUser.balance -= data.price;
				renderNav();
				loadCars();
				await checkAuth(); // aktualizacja balance
			} else {
				showMessage(data.error || 'Błąd zakupu samochodu', 'error');
			}
		});
	}
}

/**
 * Prosty router – na podstawie fragmentu adresu URL (hash) wyświetla odpowiedni widok.
 * Specjalnie obsługujemy #logout, aby "wylogować" użytkownika (symulacja).
 */
async function route() {
	const hash = window.location.hash || '#home';
	const viewId = hash.substring(1) + '-view';

	if (hash === '#logout') {
		// "Wylogowanie" – resetujemy currentUser; w prawdziwej aplikacji warto by było mieć endpoint logout
		const res = await fetch('http://localhost:3000/logout', {
			credentials: 'include',
		});
		const data = await res.json();
		if (res.status === 200) {
			currentUser = null;
			renderNav();
			showMessage('Wylogowano', 'success');
			window.location.hash = '#home';
			const editPanel = document.getElementById('edit-panel');
			if (editPanel.classList.contains('active') && currentUser === null) {
				editPanel.classList.remove('active');
			}
		} else {
			showMessage(data.error || 'Błąd', 'error');
		}
	}

	showView(viewId);
	if (viewId === 'profile-view') {
		loadProfile();
	}
	if (viewId === 'cars-view') {
		loadCars();
	}
}

/**
 * Ustawia nasłuchiwanie Server-Sent Events, które wyświetlają powiadomienia o zdarzeniach (np. zakupie samochodu).
 */
function setupSSE() {
	const evtSource = new EventSource('/sse');
	evtSource.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		showNotification(
			`SSE: ${msg.event} - Car ID: ${msg.carId}, Buyer ID: ${msg.buyerId}`
		);
	};
}

window.addEventListener('load', async () => {
	await checkAuth();
	setupEventListeners();
	setupSSE();
});
