
"use strict";

// ParkSmart academic demonstration project.
// Local browser storage is not a secure production database.

const $ = (id) => document.getElementById(id);

const RATES = {
  Car: 40,
  Bike: 20,
  SUV: 60
};

const TOTAL_SLOTS = 20;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("Unable to save data in this browser.");
    return false;
  }
}

let accounts = readStorage("parksmart_accounts", []);
let vehicles = readStorage("parksmart_vehicles", []);
let selectedSlot = "";
let currentUser = readStorage("parksmart_session", null);
let toastTimer;

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function saveAccounts() {
  return writeStorage("parksmart_accounts", accounts);
}

function saveVehicles() {
  return writeStorage("parksmart_vehicles", vehicles);
}

// ---------- Theme / dark mode ----------

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");

  const icon = theme === "dark" ? "☀️" : "🌙";
  $("themeBtn").textContent = icon;
  $("authThemeBtn").textContent = icon;

  $("themeBtn").setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );

  $("authThemeBtn").setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  );
}

function toggleTheme() {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  try {
    localStorage.setItem("parksmart_theme", nextTheme);
  } catch {
    // Theme still works for the current page.
  }

  applyTheme(nextTheme);
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem("parksmart_theme") || "light";
} catch {
  // Use light theme if browser storage is unavailable.
}

applyTheme(savedTheme === "dark" ? "dark" : "light");

$("themeBtn").addEventListener("click", toggleTheme);
$("authThemeBtn").addEventListener("click", toggleTheme);

// ---------- Sign up / login ----------

let authMode = "login";

function updateAuthScreen() {
  const isSignup = authMode === "signup";

  $("authTitle").textContent = isSignup ? "Create your account" : "Welcome back!";
  $("authSubtitle").textContent = isSignup
    ? "Register to access your parking dashboard."
    : "Sign in to manage your parking dashboard.";

  $("signupFields").hidden = !isSignup;
  $("signupName").required = isSignup;

  $("authPassword").autocomplete = isSignup
    ? "new-password"
    : "current-password";

  $("authSubmit").textContent = isSignup ? "Create Account →" : "Sign In →";
  $("authSwitchText").textContent = isSignup
    ? "Already have an account?"
    : "Don't have an account?";

  $("authSwitchBtn").textContent = isSignup ? "Sign in" : "Create account";
  $("authError").textContent = "";
}

$("authSwitchBtn").addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthScreen();
});

$("authForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("authEmail").value.trim().toLowerCase();
  const password = $("authPassword").value;
  const name = $("signupName").value.trim();

  $("authError").textContent = "";

  if (!email || !password) {
    $("authError").textContent = "Enter your email and password.";
    return;
  }

  if (authMode === "signup") {
    if (!name) {
      $("authError").textContent = "Please enter your full name.";
      return;
    }

    if (password.length < 6) {
      $("authError").textContent = "Password must contain at least 6 characters.";
      return;
    }

    if (accounts.some((account) => account.email === email)) {
      $("authError").textContent = "An account with this email already exists.";
      return;
    }

    // Demo only: passwords are stored locally and are NOT securely hashed.
    accounts.push({
      id: Date.now(),
      name,
      email,
      password
    });

    if (!saveAccounts()) {
      accounts.pop();
      $("authError").textContent =
        "Could not save the account. Check browser storage settings.";
      return;
    }

    showToast("Account created. Please sign in.");
    authMode = "login";
    $("authPassword").value = "";
    $("signupName").value = "";
    updateAuthScreen();
    $("authEmail").value = email;
    return;
  }

  const account = accounts.find(
    (item) => item.email === email && item.password === password
  );

  if (!account) {
    $("authError").textContent = "Incorrect email or password.";
    return;
  }

  currentUser = {
    id: account.id,
    name: account.name,
    email: account.email
  };

  writeStorage("parksmart_session", currentUser);
  openDashboard();
  showToast("Welcome to ParkSmart, " + account.name + "!");
});

function openDashboard() {
  if (!currentUser) return;

  $("authScreen").hidden = true;
  $("appShell").hidden = false;
  $("welcomeName").textContent = currentUser.name;
  renderParking();
  renderRecords();
  updateStats();
}

$("logoutBtn").addEventListener("click", () => {
  currentUser = null;

  try {
    localStorage.removeItem("parksmart_session");
  } catch {
    // Continue to login screen.
  }

  $("appShell").hidden = true;
  $("authScreen").hidden = false;
  $("authForm").reset();
  authMode = "login";
  updateAuthScreen();
  showToast("You have been logged out.");
});

// ---------- Parking slots ----------

function getVehicleForSlot(slot) {
  return vehicles.find((vehicle) => vehicle.slot === slot && vehicle.active);
}

function renderParking() {
  const grid = $("parkingGrid");
  const select = $("slotSelect");
  grid.replaceChildren();

  const previousSlot = select.value || selectedSlot;
  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose an available slot";
  select.appendChild(placeholder);

  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const slot = "P" + String(i).padStart(2, "0");
    const vehicle = getVehicleForSlot(slot);
    const isSelected = selectedSlot === slot && !vehicle;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "parking-slot";
    if (vehicle) button.classList.add("occupied");
    if (isSelected) button.classList.add("selected");
    button.disabled = Boolean(vehicle);
    button.setAttribute(
      "aria-label",
      slot + (vehicle ? ", occupied" : ", available")
    );

    const car = document.createElement("span");
    car.className = "slot-car";
    car.textContent = vehicle
      ? (vehicle.type === "Bike" ? "🏍️" : "🚘")
      : "✓";

    const label = document.createElement("strong");
    label.textContent = slot;

    const status = document.createElement("small");
    status.textContent = vehicle ? "Occupied" : isSelected ? "Selected" : "Free";

    button.append(car, label, status);

    if (!vehicle) {
      button.addEventListener("click", () => {
        selectedSlot = slot;
        select.value = slot;
        renderParking();
      });
    }

    grid.appendChild(button);

    if (!vehicle) {
      const option = document.createElement("option");
      option.value = slot;
      option.textContent = slot + (isSelected ? " — Selected" : " — Available");
      select.appendChild(option);
    }
  }

  if (
    previousSlot &&
    Array.from(select.options).some((option) => option.value === previousSlot)
  ) {
    select.value = previousSlot;
    selectedSlot = previousSlot;
  } else if (selectedSlot && !getVehicleForSlot(selectedSlot)) {
    // Keep a valid selection if one exists.
    select.value = selectedSlot;
  } else {
    selectedSlot = "";
    select.value = "";
  }

  updateStats();
}

$("slotSelect").addEventListener("change", () => {
  selectedSlot = $("slotSelect").value;
  renderParking();
});

$("vehicleType").addEventListener("change", () => {
  $("hourlyRate").textContent =
    "₹" + RATES[$("vehicleType").value] + " / hour";
});

// ---------- Vehicle entry ----------

$("entryForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const number = $("vehicleNumber").value.trim().toUpperCase();
  const owner = $("ownerName").value.trim();
  const type = $("vehicleType").value;
  const slot = $("slotSelect").value;

  $("formMessage").textContent = "";

  if (!owner || !number || !slot) {
    $("formMessage").textContent = "Please complete all fields and select a slot.";
    return;
  }

  if (!/^[A-Z0-9 -]{4,15}$/.test(number)) {
    $("formMessage").textContent =
      "Enter a valid vehicle registration format.";
    return;
  }

  if (vehicles.some((vehicle) => vehicle.active && vehicle.number === number)) {
    $("formMessage").textContent = "This vehicle is already parked.";
    return;
  }

  if (getVehicleForSlot(slot)) {
    $("formMessage").textContent = "That slot is occupied. Select another slot.";
    renderParking();
    return;
  }

  const record = {
    id: Date.now(),
    number,
    owner,
    type,
    slot,
    rate: RATES[type],
    entryTime: new Date().toISOString(),
    active: true,
    fee: 0
  };

  vehicles.push(record);

  if (!saveVehicles()) {
    vehicles.pop();
    $("formMessage").textContent = "Unable to save vehicle. Try again.";
    return;
  }

  $("entryForm").reset();
  $("hourlyRate").textContent = "₹40 / hour";
  $("formMessage").textContent = "";
  selectedSlot = "";

  renderParking();
  renderRecords();
  updateStats();
  showToast(number + " parked successfully in " + slot + ".");
});

$("newEntryBtn").addEventListener("click", () => {
  $("entry").scrollIntoView({ behavior: "smooth", block: "start" });
  $("vehicleNumber").focus({ preventScroll: true });
});

// ---------- Parking records and vehicle exit ----------

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function calculateFee(vehicle) {
  const enteredAt = new Date(vehicle.entryTime).getTime();
  const elapsed = Math.max(0, Date.now() - enteredAt);
  const hours = Math.max(1, Math.ceil(elapsed / (60 * 60 * 1000)));
  return hours * vehicle.rate;
}

function makeCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function renderRecords() {
  const body = $("recordsBody");
  const query = $("searchInput").value.trim().toLowerCase();

  body.replaceChildren();

  const activeVehicles = vehicles.filter((vehicle) => {
    const searchable = (
      vehicle.number + " " + vehicle.owner + " " + vehicle.type + " " + vehicle.slot
    ).toLowerCase();

    return vehicle.active && searchable.includes(query);
  });

  activeVehicles.sort(
    (a, b) => new Date(b.entryTime) - new Date(a.entryTime)
  );

  activeVehicles.forEach((vehicle) => {
    const row = document.createElement("tr");

    row.appendChild(makeCell(vehicle.number, "vehicle-tag"));
    row.appendChild(makeCell(vehicle.owner));
    row.appendChild(makeCell(vehicle.type));
    row.appendChild(makeCell(vehicle.slot));
    row.appendChild(makeCell(formatDate(vehicle.entryTime)));

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = "status-pill";
    status.textContent = "Parked";
    statusCell.appendChild(status);
    row.appendChild(statusCell);

    const actionCell = document.createElement("td");
    const exitButton = document.createElement("button");
    exitButton.type = "button";
    exitButton.className = "exit-btn";
    exitButton.textContent = "Vehicle Exit";
    exitButton.addEventListener("click", () => exitVehicle(vehicle.id));
    actionCell.appendChild(exitButton);
    row.appendChild(actionCell);

    body.appendChild(row);
  });

  $("emptyRecords").hidden = activeVehicles.length > 0;
  $("emptyRecords").textContent = query
    ? "No active vehicles match your search."
    : "No vehicles parked yet. Add your first vehicle above.";
}

function exitVehicle(id) {
  const vehicle = vehicles.find(
    (item) => item.id === id && item.active
  );

  if (!vehicle) {
    showToast("This vehicle is no longer active.");
    return;
  }

  const fee = calculateFee(vehicle);

  const confirmed = window.confirm(
    "Vehicle: " + vehicle.number +
    "\nSlot: " + vehicle.slot +
    "\nParking duration is billed by the hour." +
    "\nParking fee: ₹" + fee +
    "\n\nConfirm vehicle exit?"
  );

  if (!confirmed) return;

  vehicle.active = false;
  vehicle.exitTime = new Date().toISOString();
  vehicle.fee = fee;

  if (!saveVehicles()) {
    vehicle.active = true;
    delete vehicle.exitTime;
    delete vehicle.fee;
    return;
  }

  selectedSlot = vehicle.slot;
  renderParking();
  renderRecords();
  updateStats();

  showToast("Vehicle exited. Parking fee: ₹" + fee);
}

$("searchInput").addEventListener("input", renderRecords);

// ---------- Dashboard statistics ----------

function updateStats() {
  const occupied = vehicles.filter((vehicle) => vehicle.active).length;

  const revenue = vehicles.reduce(
    (sum, vehicle) => sum + (vehicle.active ? 0 : Number(vehicle.fee || 0)),
    0
  );

  $("totalSlots").textContent = TOTAL_SLOTS;
  $("availableSlots").textContent = TOTAL_SLOTS - occupied;
  $("occupiedSlots").textContent = occupied;
  $("totalRevenue").textContent = "₹" + revenue.toLocaleString("en-IN");
  $("capacityText").textContent = occupied + " / " + TOTAL_SLOTS + " occupied";
}

// ---------- Navigation and startup ----------

$("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

$("footerYear").textContent = new Date().getFullYear();

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

updateAuthScreen();

if (
  currentUser &&
  typeof currentUser.email === "string" &&
  accounts.some((account) => account.id === currentUser.id &&
    account.email === currentUser.email)
) {
  openDashboard();
} else {
  currentUser = null;
  $("authScreen").hidden = false;
  $("appShell").hidden = true;
}
