window.openLoginModal = function(isRegister = false) {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    document.body.appendChild(modal);
  }

  const isSignup = isRegister;

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;" id="modal-title">${isSignup ? 'Créer un compte Client' : 'Connexion'}</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Email</label>
        <input type="email" id="auth-email" placeholder="votre@email.com" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Mot de passe</label>
        <input type="password" id="auth-pass" placeholder="••••••••" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <div id="auth-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem; margin-bottom: 1rem;">
          <button onclick="submitAuth(${isSignup})" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">
            ${isSignup ? "S'inscrire" : "Se connecter"}
          </button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>

        <div style="text-align: center; border-top: 1px solid #374151; padding-top: 0.8rem;">
          ${isSignup 
            ? `<span style="font-size:0.8rem; color:#9ca3af;">Déjà un compte ? <a href="#" onclick="openLoginModal(false)" style="color:#f59e0b; text-decoration:none;">Se connecter</a></span>`
            : `<span style="font-size:0.8rem; color:#9ca3af;">Pas encore de compte ? <a href="#" onclick="openLoginModal(true)" style="color:#f59e0b; text-decoration:none;">Créer un compte client</a></span>`
          }
        </div>
      </div>
    </div>
  `;
};

window.submitAuth = function(isSignup) {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const errDiv = document.getElementById('auth-error');

  if (!email || !pass) {
    errDiv.textContent = "Veuillez remplir tous les champs.";
    return;
  }

  errDiv.textContent = "Vérification...";

  if (isSignup) {
    // Inscription d'un nouveau client
    firebase.auth().createUserWithEmailAndPassword(email, pass)
      .then(() => {
        closeModal();
        alert("Compte créé avec succès ! Vous êtes connecté.");
        window.location.reload();
      })
      .catch((err) => {
        errDiv.textContent = "Erreur : " + err.message;
      });
  } else {
    // Connexion (Client ou Vendeuse)
    firebase.auth().signInWithEmailAndPassword(email, pass)
      .then(() => {
        closeModal();
        alert("Connexion réussie !");
        window.location.reload();
      })
      .catch((err) => {
        errDiv.textContent = "Erreur : " + err.message;
      });
  }
};
