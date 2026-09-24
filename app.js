"use strict";

let supabaseClient = null;


/* =====================================================
   DÉMARRAGE DU SITE
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  console.log("Kévine Shooter — site démarré ✅");

  startSite();

});


async function startSite() {

  try {

    /* Vérification de la configuration */

    if (
      typeof SUPABASE_URL === "undefined" ||
      typeof SUPABASE_KEY === "undefined"
    ) {

      console.error("Configuration Supabase absente.");

      showPublicMessage(
        "La connexion aux données est momentanément indisponible."
      );

      return;
    }


    /* Vérification de la bibliothèque Supabase */

    if (
      typeof supabase === "undefined" ||
      typeof supabase.createClient !== "function"
    ) {

      console.error("Supabase JS n'est pas chargé.");

      showPublicMessage(
        "Le service musical est momentanément indisponible."
      );

      return;
    }


    /* Création du client Supabase */

    supabaseClient = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );


    console.log("Supabase connecté ✅");


    /* Chargement public */

    await loadReleases();


    /* Vérification de la connexion artiste */

    await checkSession();


  } catch (error) {

    console.error(
      "Erreur pendant le démarrage :",
      error
    );

    showPublicMessage(
      "Le site est ouvert, mais les données musicales sont momentanément indisponibles."
    );

  }

}


/* =====================================================
   SORTIES MUSICALES
===================================================== */

async function loadReleases() {

  const box =
    document.getElementById("releases");

  if (!box) return;


  box.innerHTML =
    '<div class="loading">Chargement de mes sorties...</div>';


  if (!supabaseClient) {

    box.innerHTML =
      '<p class="error-message">Les sorties musicales sont momentanément indisponibles.</p>';

    return;
  }


  try {

    const { data, error } =
      await supabaseClient

        .from("releases")

        .select("*")

        .eq("status", "published")

        .order(
          "release_date",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Erreur releases :",
        error
      );

      box.innerHTML =
        '<p class="error-message">Impossible de charger les sorties pour le moment.</p>';

      return;
    }


    if (!data || data.length === 0) {

      box.innerHTML =
        '<p class="empty-message">Aucune sortie publiée pour le moment.</p>';

      return;
    }


    box.innerHTML = "";


    for (const release of data) {

      const item =
        document.createElement("article");

      item.className =
        "release-card";


      let cover = "";

      if (release.cover_url) {

        cover = `
          <img
            src="${escapeHTML(release.cover_url)}"
            alt="${escapeHTML(release.title)}"
            class="release-cover"
          >
        `;

      }


      item.innerHTML = `

        ${cover}

        <div class="release-info">

          <p class="release-type">
            ${escapeHTML(
              release.release_type || "Sortie"
            )}
          </p>

          <h3>
            ${escapeHTML(release.title)}
          </h3>

          <p>
            🌍 Disponible dans le monde entier
          </p>

          <div
            id="tracks-${release.id}"
            class="tracks"
          >
            Chargement des morceaux...
          </div>

        </div>

      `;


      box.appendChild(item);


      await loadTracks(
        release.id
      );

    }

  } catch (error) {

    console.error(error);

    box.innerHTML =
      '<p class="error-message">Une erreur est survenue pendant le chargement.</p>';

  }

}


/* =====================================================
   MORCEAUX
===================================================== */

async function loadTracks(releaseId) {

  const box =
    document.getElementById(
      `tracks-${releaseId}`
    );


  if (!box || !supabaseClient)
    return;


  try {

    const { data, error } =
      await supabaseClient

        .from("tracks")

        .select("*")

        .eq(
          "release_id",
          releaseId
        )

        .order(
          "track_number",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Erreur tracks :",
        error
      );

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


    data.forEach(
      function (track) {

        const wrapper =
          document.createElement("div");

        wrapper.className =
          "track";


        const title =
          document.createElement("p");

        title.textContent =
          `🎵 ${track.track_number || ""}. ${track.title}`;


        const audio =
          document.createElement("audio");

        audio.controls = true;

        audio.preload = "metadata";


        if (track.audio_url) {

          audio.src =
            track.audio_url;

        }


        audio.addEventListener(
          "play",
          function () {

            recordStream(
              track.id
            );

          }
        );


        wrapper.appendChild(title);

        wrapper.appendChild(audio);

        box.appendChild(wrapper);

      }
    );


  } catch (error) {

    console.error(error);

    box.innerHTML =
      "<p>Erreur pendant le chargement du morceau.</p>";

  }

}


/* =====================================================
   ENREGISTRER UNE ÉCOUTE
===================================================== */

async function recordStream(trackId) {

  if (!supabaseClient)
    return;


  try {

    const { error } =
      await supabaseClient

        .from("streams")

        .insert({

          track_id: trackId,

          source: "website",

          listened_seconds: 0

        });


    if (error) {

      console.error(
        "Erreur stream :",
        error
      );

    }

  } catch (error) {

    console.error(error);

  }

}


/* =====================================================
   CONNEXION ARTISTE
===================================================== */

async function login() {

  const email =
    document
      .getElementById("email")
      .value
      .trim();


  const password =
    document
      .getElementById("password")
      .value;


  const message =
    document.getElementById(
      "loginMessage"
    );


  if (!email || !password) {

    message.textContent =
      "Entre ton e-mail et ton mot de passe.";

    return;
  }


  if (!supabaseClient) {

    message.textContent =
      "Service de connexion indisponible.";

    return;
  }


  message.textContent =
    "Connexion en cours...";


  try {

    const { error } =
      await supabaseClient.auth
        .signInWithPassword({

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


    document.getElementById(
      "login"
    ).style.display = "none";


    document.getElementById(
      "dashboard"
    ).style.display = "block";


    await loadStats();

  } catch (error) {

    console.error(error);

    message.textContent =
      "Une erreur est survenue.";

  }

}


/* =====================================================
   SESSION
===================================================== */

async function checkSession() {

  if (!supabaseClient)
    return;


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();


    if (error) {

      console.error(error);

      return;
    }


    if (data && data.session) {

      document.getElementById(
        "login"
      ).style.display = "none";


      document.getElementById(
        "dashboard"
      ).style.display = "block";


      await loadStats();

    }

  } catch (error) {

    console.error(error);

  }

}


/* =====================================================
   DÉCONNEXION
===================================================== */

async function logout() {

  if (supabaseClient) {

    await supabaseClient.auth.signOut();

  }


  document.getElementById(
    "dashboard"
  ).style.display = "none";


  document.getElementById(
    "login"
  ).style.display = "block";


  document.getElementById(
    "loginMessage"
  ).textContent = "";

}


/* =====================================================
   STATISTIQUES
===================================================== */

async function loadStats() {

  if (!supabaseClient)
    return;


  try {

    const {
      count: streamCount
    } =
      await supabaseClient

        .from("streams")

        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        );


    document.getElementById(
      "streamCount"
    ).textContent =
      streamCount || 0;


    const {
      count: releaseCount
    } =
      await supabaseClient

        .from("releases")

        .select(
          "*",
          {
            count: "exact",
            head: true
          }
        );


    document.getElementById(
      "releaseCount"
    ).textContent =
      releaseCount || 0;


    const {
      data: royalties
    } =
      await supabaseClient

        .from("royalties")

        .select(
          "net_amount"
        );


    let totalRevenue = 0;


    if (royalties) {

      royalties.forEach(
        function (row) {

          totalRevenue +=
            Number(
              row.net_amount
            ) || 0;

        }
      );

    }


    document.getElementById(
      "revenue"
    ).textContent =
      `${totalRevenue.toLocaleString("fr-FR")} XAF`;


  } catch (error) {

    console.error(
      "Erreur statistiques :",
      error
    );

  }

}


/* =====================================================
   NOUVELLE SORTIE
===================================================== */

function showNewRelease() {

  const box =
    document.getElementById(
      "newRelease"
    );


  if (
    box.style.display === "none" ||
    box.style.display === ""
  ) {

    box.style.display = "block";

  } else {

    box.style.display = "none";

  }

}


/* =====================================================
   CRÉATION D'UNE SORTIE
===================================================== */

async function createRelease() {

  const message =
    document.getElementById(
      "releaseMessage"
    );


  const progress =
    document.getElementById(
      "uploadProgress"
    );


  if (!supabaseClient) {

    message.textContent =
      "Supabase n'est pas disponible.";

    return;

  }


  const title =
    document
      .getElementById("releaseTitle")
      .value
      .trim();


  const type =
    document.getElementById(
      "releaseType"
    ).value;


  const genre =
    document
      .getElementById("releaseGenre")
      .value
      .trim();


  const date =
    document.getElementById(
      "releaseDate"
    ).value;


  const trackNumber =
    Number(
      document.getElementById(
        "trackNumber"
      ).value
    ) || 1;


  const trackTitle =
    document
      .getElementById("trackTitle")
      .value
      .trim();


  const audioFile =
    document
      .getElementById("audioFile")
      .files[0];


  const coverFile =
    document
      .getElementById("coverFile")
      .files[0];


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


    progress.textContent =
      "0%";


    const timestamp =
      Date.now();


    const randomPart =
      Math.random()
        .toString(36)
        .substring(2, 12);


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
      `${timestamp}-${randomPart}.${audioExtension}`;


    const coverPath =
      `${timestamp}-${randomPart}.${coverExtension}`;


    /* AUDIO */

    message.textContent =
      "Upload du morceau...";


    const {
      error: audioError
    } =
      await supabaseClient.storage

        .from("music-files")

        .upload(
          audioPath,
          audioFile,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (audioError)
      throw audioError;


    progress.textContent =
      "50%";


    /* POCHETTE */

    message.textContent =
      "Upload de la pochette...";


    const {
      error: coverError
    } =
      await supabaseClient.storage

        .from("cover-files")

        .upload(
          coverPath,
          coverFile,
          {
            cacheControl: "3600",
            upsert: false
          }
        );


    if (coverError)
      throw coverError;


    progress.textContent =
      "70%";


    /* URL AUDIO */

    const {
      data: audioData
    } =
      supabaseClient.storage

        .from("music-files")

        .getPublicUrl(
          audioPath
        );


    /* URL POCHETTE */

    const {
      data: coverData
    } =
      supabaseClient.storage

        .from("cover-files")

        .getPublicUrl(
          coverPath
        );


    const audioUrl =
      audioData.publicUrl;


    const coverUrl =
      coverData.publicUrl;


    /* CRÉATION DE LA SORTIE */

    message.textContent =
      "Création de la sortie...";


    const {
      data: release,
      error: releaseError
    } =
      await supabaseClient

        .from("releases")

        .insert({

          title: title,

          release_type: type,

          genre: genre,

          release_date:
            date || null,

          cover_url:
            coverUrl,

          status:
            "draft",

          territory:
            "WORLDWIDE",

          distribution_status:
            "not_started"

        })

        .select()

        .single();


    if (releaseError)
      throw releaseError;


    progress.textContent =
      "85%";


    /* CRÉATION DU MORCEAU */

    message.textContent =
      "Enregistrement du morceau...";


    const {
      error: trackError
    } =
      await supabaseClient

        .from("tracks")

        .insert({

          title:
            trackTitle,

          track_number:
            trackNumber,

          audio_url:
            audioUrl,

          release_id:
            release.id,

          status:
            "draft"

        });


    if (trackError)
      throw trackError;


    progress.textContent =
      "100%";


    message.textContent =
      "Sortie créée avec succès ✅";


    await loadStats();


    /* RESET */

    document.getElementById(
      "releaseTitle"
    ).value = "";


    document.getElementById(
      "releaseGenre"
    ).value = "";


    document.getElementById(
      "releaseDate"
    ).value = "";


    document.getElementById(
      "trackNumber"
    ).value = "1";


    document.getElementById(
      "trackTitle"
    ).value = "";


    document.getElementById(
      "audioFile"
    ).value = "";


    document.getElementById(
      "coverFile"
    ).value = "";


  } catch (error) {

    console.error(
      "Erreur création sortie :",
      error
    );


    message.textContent =
      "Erreur pendant l'envoi. Vérifie Supabase.";


    progress.textContent =
      "";

  }

}


/* =====================================================
   MESSAGES
===================================================== */

function showPublicMessage(text) {

  const box =
    document.getElementById(
      "releases"
    );


  if (box) {

    box.innerHTML =
      `<p class="error-message">${escapeHTML(text)}</p>`;

  }

}


/* =====================================================
   SÉCURITÉ HTML
===================================================== */

function escapeHTML(value) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    value || "";


  return div.innerHTML;

}
