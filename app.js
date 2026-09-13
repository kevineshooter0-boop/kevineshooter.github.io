const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

async function loadReleases() {
  const box = document.getElementById("releases");

  const { data, error } = await supabaseClient
    .from("releases")
    .select("*")
    .eq("status", "published")
    .order("release_date", { ascending: false });

  if (error) {
    console.error(error);
    box.innerHTML = "<p>Erreur de chargement.</p>";
    return;
  }

  if (!data.length) {
    box.innerHTML = "<p>Aucune sortie publiée pour le moment.</p>";
    return;
  }

  box.innerHTML = "";

  for (const release of data) {

    const item = document.createElement("div");
    item.className = "release";

    item.innerHTML = `
      <h3>${escapeHTML(release.title)}</h3>
      <p>🌍 Disponible dans le monde entier</p>
      <div id="tracks-${release.id}">
        Chargement...
      </div>
    `;

    box.appendChild(item);

    loadTracks(release.id);
  }
}


async function loadTracks(releaseId) {

  const box = document.getElementById(`tracks-${releaseId}`);

  const { data, error } = await supabaseClient
    .from("tracks")
    .select("*")
    .eq("release_id", releaseId)
    .order("track_number");

  if (error) {
    box.innerHTML = "<p>Impossible de charger les morceaux.</p>";
    return;
  }

  box.innerHTML = "";

  data.forEach(track => {

    const audio = document.createElement("audio");

    audio.controls = true;

    audio.addEventListener("play", () => {
      recordStream(track.id);
    });

    const title = document.createElement("p");
    title.textContent = `🎵 ${track.track_number}. ${track.title}`;

    box.appendChild(title);
    box.appendChild(audio);
  });
}


async function recordStream(trackId) {

  await supabaseClient
    .from("streams")
    .insert({
      track_id: trackId,
      source: "website",
      listened_seconds: 0
    });
}


async function login() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("loginMessage");

  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    message.textContent = "Identifiants incorrects.";
    return;
  }

  message.textContent = "Connexion réussie ✅";

  document.getElementById("login").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  loadStats();
}


async function logout() {

  await supabaseClient.auth.signOut();

  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login").style.display = "block";
}


async function loadStats() {

  const { count } = await supabaseClient
    .from("streams")
    .select("*", {
      count: "exact",
      head: true
    });

  document.getElementById("streamCount").textContent =
    count || 0;

  const { count: releases } =
    await supabaseClient
      .from("releases")
      .select("*", {
        count: "exact",
        head: true
      });

  document.getElementById("releaseCount").textContent =
    releases || 0;
}


function showNewRelease() {

  const box = document.getElementById("newRelease");

  box.style.display =
    box.style.display === "none" ? "block" : "none";
}


async function createRelease() {

  const title =
    document.getElementById("releaseTitle").value;

  const type =
    document.getElementById("releaseType").value;

  const genre =
    document.getElementById("releaseGenre").value;

  const date =
    document.getElementById("releaseDate").value;

  const message =
    document.getElementById("releaseMessage");

  if (!title) {
    message.textContent = "Entre un titre.";
    return;
  }

  const { error } = await supabaseClient
    .from("releases")
    .insert({
      title: title,
      release_type: type,
      genre: genre,
      release_date: date || null,
      status: "draft",
      territory: "WORLDWIDE",
      distribution_status: "not_started"
    });

  if (error) {
    console.error(error);
    message.textContent = "Erreur lors de la création.";
    return;
  }

  message.textContent =
    "Sortie créée avec succès ✅";

  loadStats();
}


function escapeHTML(text) {

  const div = document.createElement("div");

  div.textContent = text || "";

  return div.innerHTML;
}


loadReleases();
