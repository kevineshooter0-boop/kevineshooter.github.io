const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ===============================
// CHARGER LES SORTIES PUBLIÉES
// ===============================

async function loadReleases() {

  const box = document.getElementById("releases");

  const { data, error } = await supabaseClient
    .from("releases")
    .select("*")
    .eq("status", "published")
    .order("release_date", { ascending: false });

  if (error) {

    console.error(error);

    box.innerHTML =
      "<p>Erreur de chargement des sorties.</p>";

    return;
  }

  if (!data || data.length === 0) {

    box.innerHTML =
      "<p>Aucune sortie publiée pour le moment.</p>";

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
        Chargement des morceaux...
      </div>
    `;

    box.appendChild(item);

    loadTracks(release.id);
  }
}


// ===============================
// CHARGER LES MORCEAUX
// ===============================

async function loadTracks(releaseId) {

  const box =
    document.getElementById(`tracks-${releaseId}`);

  if (!box) return;

  const { data, error } = await supabaseClient
    .from("tracks")
    .select("*")
    .eq("release_id", releaseId)
    .order("track_number", {
      ascending: true
    });

  if (error) {

    console.error(error);

    box.innerHTML =
      "<p>Impossible de charger les morceaux.</p>";

    return;
  }

  if (!data || data.length === 0) {

    box.innerHTML =
      "<p>Aucun morceau disponible.</p>";

    return;
  }

  box.innerHTML = "";


  data.forEach(track => {

    // TITRE DU MORCEAU
    const title = document.createElement("p");

    title.textContent =
      `🎵 ${track.track_number}. ${track.title}`;


    // LECTEUR AUDIO
    const audio =
      document.createElement("audio");

    audio.controls = true;

    audio.preload = "metadata";


    // IMPORTANT :
    // On donne au lecteur l'adresse du fichier audio
    audio.src = track.audio_url;


    // Enregistrer une écoute
    audio.addEventListener("play", () => {

      recordStream(track.id);

    });


    // Ajouter les éléments à la page
    box.appendChild(title);

    box.appendChild(audio);

  });
}


// ===============================
// ENREGISTRER UNE ÉCOUTE
// ===============================

async function recordStream(trackId) {

  const { error } = await supabaseClient
    .from("streams")
    .insert({

      track_id: trackId,

      source: "website",

      listened_seconds: 0

    });


  if (error) {

    console.error(
      "Erreur enregistrement écoute :",
      error
    );

  }

}


// ===============================
// CONNEXION ARTISTE
// ===============================

async function login() {

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const message =
    document.getElementById("loginMessage");


  if (!email || !password) {

    message.textContent =
      "Entre ton adresse e-mail et ton mot de passe.";

    return;
  }


  const { error } =
    await supabaseClient.auth.signInWithPassword({

      email: email,

      password: password

    });


  if (error) {

    console.error(error);

    message.textContent =
      "Identifiants incorrects.";

    return;
  }


  message.textContent =
    "Connexion réussie ✅";


  document.getElementById("login")
    .style.display = "none";


  document.getElementById("dashboard")
    .style.display = "block";


  loadStats();

}


// ===============================
// DÉCONNEXION
// ===============================

async function logout() {

  await supabaseClient.auth.signOut();


  document.getElementById("dashboard")
    .style.display = "none";


  document.getElementById("login")
    .style.display = "block";

}


// ===============================
// VÉRIFIER LA SESSION
// ===============================

async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();


  if (session) {

    document.getElementById("login")
      .style.display = "none";


    document.getElementById("dashboard")
      .style.display = "block";


    loadStats();

  }

}


// ===============================
// STATISTIQUES
// ===============================

async function loadStats() {


  // NOMBRE D'ÉCOUTES

  const { count: streamCount, error: streamError } =
    await supabaseClient
      .from("streams")
      .select("*", {

        count: "exact",

        head: true

      });


  if (streamError) {

    console.error(streamError);

  }


  document.getElementById("streamCount")
    .textContent = streamCount || 0;



  // NOMBRE DE SORTIES

  const { count: releaseCount, error: releaseError } =
    await supabaseClient
      .from("releases")
      .select("*", {

        count: "exact",

        head: true

      });


  if (releaseError) {

    console.error(releaseError);

  }


  document.getElementById("releaseCount")
    .textContent = releaseCount || 0;



  // REVENUS

  const { data: royalties, error: royaltyError } =
    await supabaseClient
      .from("royalties")
      .select("net_amount");


  if (royaltyError) {

    console.error(royaltyError);

    document.getElementById("revenue")
      .textContent = "0 XAF";

    return;
  }


  let totalRevenue = 0;


  if (royalties) {

    royalties.forEach(row => {

      totalRevenue +=
        Number(row.net_amount) || 0;

    });

  }


  document.getElementById("revenue")
    .textContent =
      `${totalRevenue.toLocaleString("fr-FR")} XAF`;

}


// ===============================
// AFFICHER NOUVELLE SORTIE
// ===============================

function showNewRelease() {

  const box =
    document.getElementById("newRelease");


  if (box.style.display === "none") {

    box.style.display = "block";

  } else {

    box.style.display = "none";

  }

}


// ===============================
// CRÉER UNE SORTIE
// ===============================

async function createRelease() {

  const title =
    document
      .getElementById("releaseTitle")
      .value
      .trim();


  const type =
    document
      .getElementById("releaseType")
      .value;


  const genre =
    document
      .getElementById("releaseGenre")
      .value
      .trim();


  const date =
    document
      .getElementById("releaseDate")
      .value;


  const message =
    document.getElementById("releaseMessage");


  if (!title) {

    message.textContent =
      "Entre un titre.";

    return;
  }


  const { error } =
    await supabaseClient
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

    message.textContent =
      "Erreur lors de la création.";

    return;
  }


  message.textContent =
    "Sortie créée avec succès ✅";


  // Nettoyer le formulaire

  document.getElementById("releaseTitle")
    .value = "";

  document.getElementById("releaseGenre")
    .value = "";

  document.getElementById("releaseDate")
    .value = "";


  loadStats();

}


// ===============================
// PROTECTION CONTRE LE HTML
// ===============================

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text || "";

  return div.innerHTML;

}


// ===============================
// INITIALISATION DU SITE
// ===============================

loadReleases();

checkSession();
