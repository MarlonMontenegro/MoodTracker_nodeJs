const API_URL = "/moods";
let moodChart = null;

// -------------------- HELPERS --------------------
function capitalizar(texto) {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
}

function mostrarFecha() {
  const dateElement = document.getElementById("date");
  if (!dateElement) return;
  const today = new Date();
  const weekday = today.toLocaleDateString("es-ES", { weekday: "long" });
  const day = today.getDate();
  const month = today.toLocaleDateString("es-ES", { month: "long" });
  const year = today.getFullYear();
  const formattedDate = `${capitalizar(weekday)}, ${day} de ${capitalizar(
    month
  )} de ${year}`;
  dateElement.textContent = formattedDate;
}

function typewriter(elemento, texto, velocidad = 100) {
  if (!elemento) return;
  let i = 0;
  (function escribir() {
    if (i < texto.length) {
      elemento.textContent += texto.charAt(i++);
      setTimeout(escribir, velocidad);
    }
  })();
}

// -------------------- LISTA --------------------
function renderList(items) {
  const list = document.getElementById("mood-list");
  if (!list) return;
  list.innerHTML = "";
  items.forEach((it) => {
    const li = document.createElement("li");
    const when = it.date ? new Date(it.date).toLocaleString() : "";
    li.textContent = `${it.mood} — ${it.comment || ""} ${
      when ? `(${when})` : ""
    }`;
    list.appendChild(li);
  });
}

// -------------------- CHART --------------------
function renderMoodChartFromCounts(countsObj) {
  const canvas = document.getElementById("moodChart");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = Object.keys(countsObj);
  const data = Object.values(countsObj);

  if (moodChart) {
    moodChart.data.labels = labels;
    moodChart.data.datasets[0].data = data;
    moodChart.update();
    return;
  }

  moodChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Registros por ánimo", data }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });

  window.moodChart = moodChart;
}

function buildCountsFromRows(rows) {
  return rows.reduce((acc, r) => {
    const key = r.mood || "Sin dato";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

// -------------------- FETCHERS --------------------
async function loadMoods() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Error al cargar moods");
  const data = await res.json();
  renderList(data);
  renderMoodChartFromCounts(buildCountsFromRows(data));
}

async function loadMoodStats() {
  const res = await fetch("/moods/stats");
  if (!res.ok) throw new Error("Error al cargar stats");
  const rows = await res.json();
  const counts = rows.reduce((acc, r) => ((acc[r.mood] = r.count), acc), {});
  renderMoodChartFromCounts(counts);
}

// -------------------- MAIN UI --------------------
document.addEventListener("DOMContentLoaded", () => {
  const moodIcons = document.querySelectorAll(".moodIcon");
  const submitBtn = document.getElementById("saveMoodBtn");
  const textarea = document.getElementById("comment");
  let selectedMood = null;

  // Selección de ánimo
  moodIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.preventDefault();
      moodIcons.forEach((i) => i.classList.remove("active"));
      icon.classList.add("active");
      selectedMood = icon.dataset.mood || icon.textContent.trim();
    });
  });

  // Guardar
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (!selectedMood) {
        Swal.fire(
          "Oops!",
          "Por favor selecciona un ánimo primero 😅",
          "warning"
        );
        return;
      }
      const description = textarea?.value || "";
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood: selectedMood, comment: description }),
        });
        if (!res.ok) throw new Error("Error al guardar");
        const newMood = await res.json();
        Swal.fire(
          "¡Mood guardado!",
          `Hoy te sientes: ${newMood.mood}\nDescripción: ${
            newMood.comment || ""
          }`,
          "success"
        );
        textarea.value = "";
        moodIcons.forEach((i) => i.classList.remove("active"));
        selectedMood = null;

        await loadMoods();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo guardar tu mood 😢", "error");
      }
    });
  }
});

// -------------------- ONLOAD (bienvenida + animaciones + mostrar stats) --------------------
window.onload = () => {
  Swal.fire({
    title: "Bienvenido",
    text: "Ingresa tu nombre ",
    input: "text",
    inputAttributes: { maxlength: 10 },
    allowOutsideClick: false,
    allowEscapeKey: false,
    confirmButtonText: "Entrar",
    preConfirm: (value) => {
      if (!value) {
        Swal.showValidationMessage("El nombre es obligatorio");
      }
      return value;
    },
  }).then((result) => {
    if (!result.isConfirmed) return;

    const nombreCapitalizado = capitalizar(result.value.trim());
    const nameSpan = document.getElementById("name");
    const h2 = nameSpan ? nameSpan.closest("h2") : null;
    const h1 = document.querySelector(".welcoming h1");
    const dateP = document.getElementById("date");
    const logo = document.querySelector(".nav img.logo");
    const brand = document.querySelector(".nav .brand");
    const githubLogo = document.querySelector(".nav-icon img.gitLogo");
    const moodBtn = document.querySelector(".moodBtn");
    const moodIcon = document.querySelector(".moodSelection");
    const description = document.querySelector(".moodDescriptionContainer");
    const stats = document.getElementById("stats");

    if (nameSpan) nameSpan.textContent = nombreCapitalizado;
    mostrarFecha();

    [h2, h1, dateP, logo, brand, githubLogo, moodBtn]
      .filter(Boolean)
      .forEach((el) => (el.style.display = "block"));

    if (moodIcon) {
      moodIcon.style.display = "flex";
      moodIcon.style.justifyContent = "center";
      moodIcon.style.gap = "1rem";
    }
    if (description) {
      description.style.display = "flex";
      description.style.justifyContent = "center";
      description.style.marginTop = "1rem";
    }

    const animate = window.Motion?.animate;
    const safeAnimate = (el, keyframes, options) => {
      if (el && typeof animate === "function") animate(el, keyframes, options);
    };

    // Animaciones UI
    safeAnimate(
      h2,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.6, easing: "ease-out" }
    );
    safeAnimate(
      h1,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.8, easing: "ease-out" }
    );
    safeAnimate(
      dateP,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.8, easing: "ease-out" }
    );
    safeAnimate(
      logo,
      { opacity: [0, 1], y: [-30, 0], rotate: [-10, 0] },
      { duration: 1, easing: "ease-out" }
    );
    safeAnimate(
      brand,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.8, easing: "ease-out" }
    );
    safeAnimate(
      moodBtn,
      { opacity: [0, 1], y: [-40, 0], scale: [0.8, 1.05, 1] },
      { duration: 0.9, easing: "cubic-bezier(.18,1,.22,1)" }
    );
    safeAnimate(
      githubLogo,
      { opacity: [0, 1], y: [-20, 0], rotate: [-5, 0] },
      { duration: 0.8, easing: "ease-out" }
    );
    safeAnimate(
      moodIcon,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.8, easing: "ease-out" }
    );
    safeAnimate(
      description,
      { opacity: [0, 1], y: [-20, 0] },
      { duration: 0.8, easing: "ease-out" }
    );

    if (stats) {
      stats.style.display = "flex";
      safeAnimate(
        stats,
        { opacity: [0, 1], y: [20, 0], scale: [0.98, 1] },
        { duration: 0.6, easing: "ease-out" }
      );

      loadMoods()
        .then(() => {
          setTimeout(() => {
            if (
              window.moodChart &&
              typeof window.moodChart.resize === "function"
            ) {
              window.moodChart.resize();
              window.moodChart.update();
            }
          }, 50);
        })
        .catch(console.error);
    }

    if (h1) {
      h1.textContent = "";
      typewriter(h1, "¿Cómo te sientes el día de hoy?", 100);
    }
  });
};

mostrarFecha();
