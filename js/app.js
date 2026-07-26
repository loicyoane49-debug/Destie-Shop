// Variable globale
const SELLER_EMAIL = "primodestiem0@gmail.com";

// Démarrage
document.addEventListener('DOMContentLoaded', () => {
  loadCatalog();
  setupAuthListener();
});

// Écoute de l'état de connexion
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

// Chargement du catalogue
async function loadCatalog() {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Chargement des articles...</p>';

  try {
    const snapshot = await db.collection('products').get();
    productList.innerHTML = '';

    if (snapshot.empty) {
      productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Aucun article dans le catalogue pour le moment.</p>';
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
          <h3 class="product-title">${p.title || 'Article sans nom'}</h3>
          <p class="product-price">${p.price ? p.price.toLocaleString('fr-FR') : 0} XAF</p>
          ${!p.isReserved ? `<button class="btn" onclick="alert('Article réservé !')">Réserver</button>` : ''}
        </div>
      `;
      productList.appendChild(card);
    });
  } catch (err) {
    console.error("Erreur catalogue :", err);
    productList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Erreur de connexion à la base de données.</p>';
  }
}

// Fonction de Connexion
window.openLoginModal = function() {
  const email = prompt("Email de connexion :");
  if (!email) return;
  const password = prompt("Mot de passe :");
  if (!password) return;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => alert("Connexion réussie !"))
    .catch((err) => alert("Erreur : " + err.message));
};

// Fonction de Déconnexion
window.logout = function() {
  firebase.auth().signOut().then(() => {
    alert("Déconnecté !");
    window.location.reload();
  });
};

// Fonction d'Ajout d'article
window.openAddProductModal = function() {
  const title = prompt("Nom de l'article (ex: Robe Wax) :");
  if (!title) return;
  const priceInput = prompt("Prix en XAF (ex: 15000) :");
  if (!priceInput) return;
  const imageUrl = prompt("Lien/URL de la photo de l'article :");
  if (!imageUrl) return;

  const price = parseInt(priceInput, 10);

  db.collection('products').add({
    title: title,
    price: price,
    images: [imageUrl],
    isReserved: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Article ajouté avec succès !");
    loadCatalog();
  }).catch((err) => {
    alert("Erreur lors de l'ajout : " + err.message);
  });
};
