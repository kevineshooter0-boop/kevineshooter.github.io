const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ===============================
// SORTIES PUBLIÉES
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
    box.innerHTML = "<p>Erreur de chargement.</p>";
    return;
  }

  if (!data || data.length === 0) {
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


// ===============================
// MORCEAUX
// ===============================

async function loadTracks(releaseId) {

  const box = document.getElementById(`tracks-${releaseId}`);

  if (!box) return;

  const { data, error } = await supabaseClient
    .from("tracks")
    .select("*")
    .eq("release_id", releaseId)
    .order("track_number", { ascending: true });

  if (error) {
    console.error(error);
    box.innerHTML = "<p>Impossible de charger les morceaux.</p>";
    return;
  }

  box.innerHTML = "";

  if (!data || data.length === 0) {
    box.innerHTML = "<p>Aucun morceau disponible.</p>";
    return;
  }

  data.forEach(track => {

    const title = document.createElement("p");

    title.textContent =
      `🎵 ${track.track_number}. ${track.title}`;


    const audio = document.createElement("audio");

    audio.controls = true;
    audio.preload = "metadata";
    audio.src = track.audio_url;


    audio.addEventListener("play", () => {
      recordStream(track.id);
    });


    box.appendChild(title);
    box.appendChild(audio);

  });
}


// ===============================
// ÉCOUTE
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
    console.error(error);
  }
}


// ===============================
// CONNEXION
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
      "Entre ton e-mail et ton mot de passe.";

    return;
  }


  const { error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    console.error(error);

    message.textContent =
      "Identifiants incorrects.";

    return;
  }


  message.textContent =
    "Connexion réussie ✅";

  document.getElementById("login").style.display =
    "none";

  document.getElementById("dashboard").style.display =
    "block";

  loadStats();
}


// ===============================
// DÉCONNEXION
// ===============================

async function logout() {

  await supabaseClient.auth.signOut();

  document.getElementById("dashboard").style.display =
    "none";

  document.getElementById("login").style.display =
    "block";
}


// ===============================
// SESSION
// ===============================

async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {

    document.getElementById("login").style.display =
      "none";

    document.getElementById("dashboard").style.display =
      "block";

    loadStats();
  }
}


// ===============================
// STATISTIQUES
// ===============================

async function loadStats() {

  const { count: streamCount } =
    await supabaseClient
      .from("streams")
      .select("*", {
        count: "exact",
        head: true
      });


  document.getElementById("streamCount")
    .textContent = streamCount || 0;


  const { count: releaseCount } =
    await supabaseClient
      .from("releases")
      .select("*", {
        count: "exact",
        head: true
      });


  document.getElementById("releaseCount")
    .textContent = releaseCount || 0;


  const { data: royalties } =
    await supabaseClient
      .from("royalties")
      .select("net_amount");


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
// AFFICHER LE FORMULAIRE
// ===============================

function showNewRelease() {

  const box =
    document.getElementById("newRelease");

  box.style.display =
    box.style.display === "none"
      ? "block"
      : "none";
}


// ===============================
// CRÉER + UPLOADER UNE SORTIE
// ===============================

async function createRelease() {

  const message =
    document.getElementById("releaseMessage");

  const progress =
    document.getElementById("uploadProgress");


  const title =
    document.getElementById("releaseTitle")
      .value.trim();


  const type =
    document.getElementById("releaseType")
      .value;


  const genre =
    document.getElementById("releaseGenre")
      .value.trim();


  const date =
    document.getElementById("releaseDate")
      .value;


  const trackNumber =
    Number(
      document.getElementById("trackNumber")
        .value
    ) || 1;


  const trackTitle =
    document.getElementById("trackTitle")
      .value.trim();


  const audioFile =
    document.getElementById("audioFile")
      .files[0];


  const coverFile =
    document.getElementById("coverFile")
      .files[0];


  // VALIDATION

  if (!title) {
    message.textContent =
      "Entre le titre de la sortie.";
    return;
  }


  if (!trackTitle) {
    message.textContent =
      "Entre le titre du morceau.";
    return;
  }


  if (!audioFile) {
    message.textContent =
      "Sélectionne un fichier audio.";
    return;
  }


  if (!coverFile) {
    message.textContent =
      "Sélectionne une pochette.";
    return;
  }


  try {

    message.textContent =
      "Préparation de l'envoi...";

    progress.style.display =
      "block";


    // =========================
    // NOM UNIQUE DES FICHIERS
    // =========================

    const timestamp =
      Date.now();


    const audioExtension =
      audioFile.name
        .split(".")
        .pop()
        .toLowerCase();


    const coverExtension =
      coverFile.name
        .split(".")
        .pop()
        .toLowerCase();


    const audioPath =
      `${timestamp}-${crypto.randomUUID()}.${audioExtension}`;


    const coverPath =
      `${timestamp}-${crypto.randomUUID()}.${coverExtension}`;


    // =========================
    // UPLOAD AUDIO
    // =========================

    message.textContent =
      "Upload du morceau...";


    const { error: audioError } =
      await supabaseClient.storage
        .from("music-files")
        .upload(audioPath, audioFile, {
          cacheControl: "3600",
          upsert: false
        });


    if (audioError) {
      throw audioError;
    }


    // =========================
    // UPLOAD POCHETTE
    // =========================

    message.textContent =
      "Upload de la pochette...";


    const { error: coverError } =
      await supabaseClient.storage
        .from("cover-files")
        .upload(coverPath, coverFile, {
          cacheControl: "3600",
          upsert: false
        });


    if (coverError) {
      throw coverError;
    }


    // =========================
    // URL DES FICHIERS
    // =========================

    const {
      data: audioUrlData
    } = supabaseClient.storage
      .from("music-files")
      .getPublicUrl(audioPath);


    const {
      data: coverUrlData
    } = supabaseClient.storage
      .from("cover-files")
      .getPublicUrl(coverPath);


    const audioUrl =
      audioUrlData.publicUrl;


    const coverUrl =
      coverUrlData.publicUrl;


    // =========================
    // CRÉER LA SORTIE
    // =========================

    message.textContent =
      "Création de la sortie...";


    const { data: release, error: releaseError } =
      await supabaseClient
        .from("releases")
        .insert({

          title: title,

          release_type: type,

          genre: genre,

          release_date: date || null,

          cover_url: coverUrl,

          status: "draft",

          territory: "WORLDWIDE",

          distribution_status: "not_started"

        })
        .select()
        .single();


    if (releaseError) {
      throw releaseError;
    }


    // =========================
    // CRÉER LE MORCEAU
    // =========================

    message.textContent =
      "Enregistrement du morceau...";


    const { error: trackError } =
      await supabaseClient
        .from("tracks")
        .insert({

          title: trackTitle,

          track_number: trackNumber,

          audio_url: audioUrl,

          release_id: release.id,

          status: "draft"

        });


    if (trackError) {
      throw trackError;
    }


    // =========================
    // TERMINÉ
    // =========================

    message.textContent =
      "Sortie créée et fichiers envoyés avec succès ✅";


    progress.textContent =
      "Upload terminé ✅";


    loadStats();


    // Nettoyage

    document.getElementById("releaseTitle")
      .value = "";

    document.getElementById("releaseGenre")
      .value = "";

    document.getElementById("releaseDate")
      .value = "";

    document.getElementById("trackNumber")
      .value = "1";

    document.getElementById("trackTitle")
      .value = "";

    document.getElementById("audioFile")
      .value = "";

    document.getElementById("coverFile")
      .value = "";


  } catch (error) {

    console.error(error);

    message.textContent =
      "Erreur pendant l'envoi. Vérifie la console et Supabase.";

    progress.style.display =
      "none";
  }
}


// ===============================
// PROTECTION HTML
// ===============================

function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text || "";

  return div.innerHTML;
}


// ===============================
// DÉMARRAGE
// ===============================

loadReleases();

checkSession();
