const SELLER_EMAIL = "primodestiem@gmail.com";
const IMGBB_API_KEY = "VOTRE_CLE_IMGBB_ICI"; // Remplacez par votre clé si vous en avez une

document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
  setupAuthListener();
});

function setupAuthListener() {
  if (typeof firebase === 'undefined' || !firebase.auth) return;

  firebase.auth().onAuthStateChanged((user) => {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    const isSeller = user && user.email && user.email.trim().toLowerCase() === SELLER_EMAIL.toLowerCase();

    if (isSeller) {
      headerActions.innerHTML = `
        <button class="btn" style="background:#d97706; color:white; border:none; padding:0.5rem 0.8rem; border-radius:6px; margin-right:0.5rem; font-weight:bold; cursor:pointer;" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> + Ajouter</button>
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

window.switchView = function(viewName) {
  const container = document.getElementById('app-content');
  if (!container) return;

  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  if (viewName === 'catalog') {
    if (navItems[0]) navItems[0].classList.add('active');
    container.innerHTML = `<div class="product-grid" id="product-list"></div>`;
    loadCatalog();
  } else if (viewName === 'reservations') {
    if (navItems[1]) navItems[1].classList.add('active');
    loadReservationsView();
  } else if (viewName === 'profile') {
    if (navItems[2]) navItems[2].classList.add('active');
    loadProfileView();
  }
};

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
          ${!p.isReserved ? `<button class="btn" style="width:100%; margin-top:0.5rem;" onclick="alert('Réservation enregistrée !')">Réserver</button>` : ''}
        </div>
      `;
      productList.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur catalogue :", err);
  }
}

function loadReservationsView() {
  const container = document.getElementById('app-content');
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <i class="fa-solid fa-box-archive" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
        <h3>Mes Réservations</h3>
        <p style="color: #6b7280; margin-top: 0.5rem;">Veuillez vous connecter pour voir vos réservations.</p>
        <button class="btn" style="margin-top: 1rem;" onclick="openLoginModal()">Se connecter</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="padding: 1rem;">
      <h3 style="margin-bottom: 1rem;">Vos réservations</h3>
      <p style="color: #6b7280;">Aucune réservation enregistrée pour le moment.</p>
    </div>
  `;
}

function loadProfileView() {
  const container = document.getElementById('app-content');
  const user = firebase.auth().currentUser;

  if (user) {
    container.innerHTML = `
      <div style="padding: 1.5rem; background: white; border-radius: 8px; margin: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-bottom: 0.5rem;">Profil Utilisateur</h3>
        <p style="color: #4b5563;">Connecté en tant que : <strong>${user.email}</strong></p>
        <button class="btn btn-secondary" style="margin-top: 1.5rem;" onclick="logout()">Se déconnecter</button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <i class="fa-solid fa-user-gear" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
        <h3>Mon Profil</h3>
        <p style="color: #6b7280; margin-top: 0.5rem;">Vous n'êtes pas connecté.</p>
        <button class="btn" style="margin-top: 1rem;" onclick="openLoginModal()">Se connecter</button>
      </div>
    `;
  }
}

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
          <button onclick="submitLogin()" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">Valider</button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

window.submitLogin = function() {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-pass').value;
  const errDiv = document.getElementById('auth-error');

  errDiv.textContent = "Vérification...";

  firebase.auth().signInWithEmailAndPassword(email, pass)
    .then(() => {
      closeModal();
      alert("Connexion réussie !");
      window.location.reload();
    })
    .catch((err) => {
      errDiv.textContent = "Erreur : " + err.message;
    });
};

window.logout = function() {
  firebase.auth().signOut().then(() => {
    alert("Déconnecté !");
    window.location.reload();
  });
};

window.closeModal = function() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.remove();
  const addModal = document.getElementById('add-modal');
  if (addModal) addModal.remove();
};

window.openAddProductModal = function() {
  let modal = document.getElementById('add-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; padding: 1rem;">
      <div style="background: #1f2937; color: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 380px;">
        <h3 style="margin-bottom: 1rem; color: #f59e0b;">Nouveau Vêtement</h3>
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Nom de l'article</label>
        <input type="text" id="add-title" placeholder="ex: Ensemble Pagne" style="width:100%; padding: 0.5rem; margin-bottom: 0.8rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Prix (XAF)</label>
        <input type="number" id="add-price" placeholder="15000" style="width:100%; padding: 0.5rem; margin-bottom: 0.8rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">
        
        <label style="display:block; font-size:0.85rem; margin-bottom: 0.25rem;">Lien Web de la photo (URL .jpg / .png)</label>
        <input type="url" id="add-url" placeholder="https://..." style="width:100%; padding: 0.5rem; margin-bottom: 1rem; border-radius:4px; border:1px solid #4b5563; background:#374151; color:white;">

        <div id="add-error" style="color: #ef4444; font-size: 0.8rem; margin-bottom: 1rem;"></div>

        <div style="display:flex; gap: 0.5rem;">
          <button id="btn-pub" onclick="submitProduct()" style="flex:1; background:#d97706; color:white; border:none; padding: 0.6rem; border-radius:4px; font-weight:bold; cursor:pointer;">Publier</button>
          <button onclick="closeModal()" style="flex:1; background:#4b5563; color:white; border:none; padding: 0.6rem; border-radius:4px; cursor:pointer;">Annuler</button>
        </div>
      </div>
    </div>
  `;
};

window.submitProduct = async function() {
  const title = document.getElementById('add-title').value;
  const price = parseInt(document.getElementById('add-price').value, 10);
  const imageUrl = document.getElementById('add-url').value;
  const errDiv = document.getElementById('add-error');
  const btnPub = document.getElementById('btn-pub');

  if (!title || !price || !imageUrl) {
    errDiv.textContent = "Veuillez remplir le nom, le prix et le lien de la photo.";
    return;
  }

  btnPub.disabled = true;
  errDiv.textContent = "Publication dans la boutique...";

  try {
    await db.collection('products').add({
      title: title,
      price: price,
      images: [imageUrl],
      isReserved: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal();
    alert("Article publié avec succès !");
    switchView('catalog');
  } catch (err) {
    errDiv.textContent = "Erreur : " + err.message;
    btnPub.disabled = false;
  }
};
