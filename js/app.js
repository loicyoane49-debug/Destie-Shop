// 1. Clé ImgBB (Remplacez par votre vraie clé depuis api.imgbb.com)
const IMGBB_API_KEY = 78a05420bee5b030e2061970a6cf2b3d;

// 2. Email officiel de votre sœur (vendeuse)
const SELLER_EMAIL = "primodestiem0@gmail.com";

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
});

// Écoute de l'état de connexion de l'utilisateur
firebase.auth().onAuthStateChanged((user) => {
  const headerActions = document.getElementById('header-actions');
  if (!headerActions) return;

  if (user) {
    if (user.email === SELLER_EMAIL) {
      headerActions.innerHTML = `
        <button class="btn" onclick="openAddProductModal()"><i class="fa-solid fa-plus"></i> Ajouter</button>
        <button class="btn btn-secondary" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
      `;
    } else {
      headerActions.innerHTML = `
        <button class="btn btn-secondary" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Déconnexion</button>
      `;
    }
  } else {
    headerActions.innerHTML = `
      <button class="btn btn-secondary" onclick="openLoginModal()"><i class="fa-solid fa-user"></i> Connexion</button>
    `;
  }
});

// Charger le catalogue
async function loadCatalog() {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Chargement des articles...</p>';

  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    productList.innerHTML = '';

    if (snapshot.empty) {
      productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Aucun article disponible pour le moment.</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const p = doc.data();
      const id = doc.id;
      const imageUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/300';

      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="product-image">
          <img src="${imageUrl}" alt="${p.title}">
        </div>
        <div class="product-info">
          <span class="badge ${p.isReserved ? 'badge-reserved' : 'badge-available'}">
            ${p.isReserved ? 'Réservé' : 'Disponible'}
          </span>
          <h3 class="product-title">${p.title}</h3>
          <p class="product-price">${p.price ? p.price.toLocaleString('fr-FR') : 0} XAF</p>
          ${!p.isReserved ? `<button class="btn" onclick="reserveProduct('${id}')">Réserver</button>` : ''}
        </div>
      `;
      productList.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur catalogue :", err);
    productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erreur lors du chargement des articles.</p>';
  }
}

// Ouvrir la modale de Connexion
function openLoginModal() {
  let modalContainer = document.getElementById('modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 1rem;">
      <div style="background: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 350px;">
        <h3 style="margin-bottom: 1rem; color: #1f2937;">Connexion</h3>
        <form onsubmit="handleLogin(event)">
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Email</label>
            <input type="email" id="login-email" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Mot de passe</label>
            <input type="password" id="login-password" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" class="btn" style="flex: 1;">Se connecter</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Connexion de l'utilisateur
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    closeModal();
    alert("Connexion réussie !");
  } catch (err) {
    alert("Erreur de connexion : " + err.message);
  }
}

// Déconnexion
function logout() {
  firebase.auth().signOut().then(() => {
    alert("Déconnecté.");
    window.location.reload();
  });
}

// Ouvrir la modale d'ajout de produit
function openAddProductModal() {
  let modalContainer = document.getElementById('modal-container');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-container';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 1rem;">
      <div style="background: white; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 400px; max-height: 90vh; overflow-y: auto;">
        <h3 style="margin-bottom: 1rem; color: #1f2937;">Nouveau produit</h3>
        <form onsubmit="uploadProduct(event)">
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Nom de l'article</label>
            <input type="text" id="p-title" required placeholder="ex: Ensemble Pagne" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 0.75rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Prix (XAF)</label>
            <input type="number" id="p-price" required placeholder="15000" style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem;">Photo de l'article</label>
            <input type="file" id="p-image" accept="image/*" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          </div>
          <div id="upload-status" style="margin-bottom: 0.5rem; font-size: 0.85rem; color: #d97706;"></div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="submit" id="btn-save-prod" class="btn" style="flex: 1;">Publier</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Publier le produit sur ImgBB puis Firestore
async function uploadProduct(e) {
  e.preventDefault();
  const title = document.getElementById('p-title').value;
  const price = parseInt(document.getElementById('p-price').value, 10);
  const fileInput = document.getElementById('p-image');
  const statusDiv = document.getElementById('upload-status');
  const saveBtn = document.getElementById('btn-save-prod');

  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Veuillez choisir une photo.");
    return;
  }

  try {
    saveBtn.disabled = true;
    statusDiv.textContent = "Téléversement de la photo...";

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!data.success) throw new Error("Impossible d'envoyer l'image.");

    const imageUrl = data.data.url;
    statusDiv.textContent = "Publication dans la boutique...";

    await db.collection('products').add({
      title: title,
      price: price,
      images: [imageUrl],
      isReserved: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    closeModal();
    alert("Article publié avec succès !");
    loadCatalog();
  } catch (err) {
    console.error(err);
    alert("Erreur : " + err.message);
    statusDiv.textContent = "";
    saveBtn.disabled = false;
  }
}

// Fermer les modales
function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.innerHTML = '';
}
