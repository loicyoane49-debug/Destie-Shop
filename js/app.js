const SELLER_EMAIL = "primodestiem0@gmail.com";

document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
  setupAuthListener();
});

// Suivi de la connexion
function setupAuthListener() {
  if (typeof firebase === 'undefined' || !firebase.auth) return;

  firebase.auth().onAuthStateChanged((user) => {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    if (user && user.email === SELLER_EMAIL) {
      headerActions.innerHTML = `
        <button class="btn" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> Ajouter</button>
        <button class="btn btn-secondary" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
      `;
    } else if (user) {
      headerActions.innerHTML = `
        <button class="btn btn-secondary" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
      `;
    } else {
      headerActions.innerHTML = `
        <button class="btn btn-secondary" onclick="openLoginModal()"><i class="fa-solid fa-user"></i> Connexion</button>
      `;
    }
  });
}

// Chargement des articles
async function loadCatalog() {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  try {
    const snapshot = await db.collection('products').get();
    productList.innerHTML = '';

    if (snapshot.empty) {
      productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Aucun article dans le catalogue.</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const p = doc.data();
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image">
          <img src="${imageUrl}" alt="${p.title || 'Article'}">
        </div>
        <div class="product-info">
          <span class="badge ${p.isReserved ? 'badge-reserved' : 'badge-available'}">
            ${p.isReserved ? 'Réservé' : 'Disponible'}
          </span>
          <h3 class="product-title">${p.title || 'Article'}</h3>
          <p class="product-price">${p.price ? p.price.toLocaleString('fr-FR') : 0} XAF</p>
          ${!p.isReserved ? `<button class="btn" onclick="alert('Article réservé !')">Réserver</button>` : ''}
        </div>
      `;
      productList.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur catalogue :", err);
  }
}

// Fenêtre modale de connexion
window.openLoginModal = function() {
  let modal = document.getElementById('login-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'login-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">Connexion Vendeuse</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Email</label>
        <input type="email" id="auth-email" value="${SELLER_EMAIL}" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Mot de passe</label>
        <input type="password" id="auth-pass" placeholder="••••••••" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <div id="auth-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem;">
          <button onclick="submitLogin()" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold;">Valider</button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

// Soumission de la connexion
window.submitLogin = function() {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const errDiv = document.getElementById('auth-error');

  errDiv.textContent = "Vérification en cours...";

  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(() => {
      closeModal();
      alert("Connexion réussie !");
    })
    .catch((err) => {
      errDiv.textContent = "Erreur : " + err.message;
    });
};

// Déconnexion
window.logout = function() {
  firebase.auth().signOut().then(() => {
    alert("Déconnecté !");
    window.location.reload();
  });
};

// Fermer les fenêtres
window.closeModal = function() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.remove();
  const addModal = document.getElementById('add-modal');
  if (addModal) addModal.remove();
};

// Fenêtre d'ajout d'article
window.openAddProductModal = function() {
  let modal = document.getElementById('add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">Publier un article</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Nom du vêtement</label>
        <input type="text" id="add-title" placeholder="ex: Ensemble Pagne" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Prix (XAF)</label>
        <input type="number" id="add-price" placeholder="15000" style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Lien de la photo (.jpg ou .png)</label>
        <input type="url" id="add-img" placeholder="https://..." style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">

        <div id="add-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem;">
          <button onclick="submitProduct()" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold;">Publier</button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

// Soumission du produit
window.submitProduct = function() {
  const title = document.getElementById('add-title').value;
  const price = parseInt(document.getElementById('add-price').value, 10);
  const img = document.getElementById('add-img').value;
  const errDiv = document.getElementById('add-error');

  if (!title || !price || !img) {
    errDiv.textContent = "Veuillez remplir tous les champs.";
    return;
  }

  errDiv.textContent = "Publication en cours...";

  db.collection('products').add({
    title: title,
    price: price,
    images: [img],
    isReserved: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    closeModal();
    alert("Article publié avec succès !");
    loadCatalog();
  }).catch((err) => {
    errDiv.textContent = "Erreur : " + err.message;
  });
};
